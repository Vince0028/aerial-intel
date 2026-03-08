import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * In-memory cache so we don't hammer Groq on every 60s front-end poll.
 * TTL = 10 minutes — conflict zones don't change second-by-second.
 */
let zoneCache: { zones: ConflictZone[]; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface ConflictZone {
    country: string;       // Country name matching GeoJSON "ADMIN" property
    iso: string;           // ISO A3 code (e.g. "UKR")
    severity: number;      // 1-10
    reason: string;        // One-line reason
}

/**
 * GET /api/intel/conflict-zones
 *
 * 1. Reads the current conflicts data from the /api/intel/conflicts local endpoint
 * 2. Sends the list of affected countries + labels to Groq AI
 * 3. Groq returns a list of active conflict-zone countries with severity
 * 4. Caches result for 10 min to avoid excessive AI calls
 */
router.get("/", async (req: Request, res: Response) => {
    // Serve from cache if fresh
    if (zoneCache && Date.now() - zoneCache.ts < CACHE_TTL) {
        return res.json({ zones: zoneCache.zones, source: "Groq AI (cached)", count: zoneCache.zones.length });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.json({ zones: [], source: "Groq AI (no key)", count: 0 });
    }

    try {
        // Fetch current conflict events from our own API
        const conflictsUrl = `http://localhost:${process.env.PORT || 3001}/api/intel/conflicts`;
        const conflictsRes = await fetch(conflictsUrl, { signal: AbortSignal.timeout(10000) });
        if (!conflictsRes.ok) throw new Error("Could not fetch conflicts data");
        const conflictsData = await conflictsRes.json() as any;
        const events: any[] = conflictsData.events || [];

        if (events.length === 0) {
            zoneCache = { zones: [], ts: Date.now() };
            return res.json({ zones: [], source: "Groq AI (no conflict data)", count: 0 });
        }

        // Build a summary of affected countries from the conflict events
        const countryCounts: Record<string, { count: number; labels: string[] }> = {};
        for (const evt of events) {
            const country = evt.meta?.sourceCountry || "Unknown";
            if (country === "Unknown") continue;
            if (!countryCounts[country]) countryCounts[country] = { count: 0, labels: [] };
            countryCounts[country].count++;
            if (countryCounts[country].labels.length < 3) {
                countryCounts[country].labels.push((evt.label || "").slice(0, 80));
            }
        }

        const summary = Object.entries(countryCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 25)
            .map(([c, v]) => `${c} (${v.count} events): ${v.labels.join(" | ")}`)
            .join("\n");

        const prompt = `You are a military intelligence analyst for a global C2 system. Based on the following REAL conflict event data scraped today from GDELT news, identify countries that are ACTIVE CONFLICT ZONES or BATTLEFIELDS right now.

Current conflict events by country:
${summary}

Return ONLY a JSON array. Each item: {"country":"Full Country Name","iso":"ISO_A3_CODE","severity":1-10,"reason":"brief reason"}

Rules:
- severity 8-10: active war / major military operations (e.g. Ukraine, Gaza)
- severity 5-7: significant armed conflict / insurgency
- severity 3-4: elevated tensions / border clashes / terrorism
- Only include countries with REAL ongoing conflicts, NOT just news coverage
- Use common English country names that match GeoJSON (e.g. "Ukraine" not "Ukr")
- ISO codes must be 3-letter (UKR, ISR, SYR, etc.)
- Return between 5-15 countries maximum
- NO markdown, NO code fences, ONLY the JSON array`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 800,
            }),
        });

        if (!groqRes.ok) throw new Error(`Groq responded ${groqRes.status}`);

        const groqData = await groqRes.json() as any;
        const content: string = groqData.choices?.[0]?.message?.content || "[]";

        // Extract JSON array from response (handle possible markdown wrapping)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const zones: ConflictZone[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // Validate & sanitize
        const validZones = zones
            .filter(z => z.country && z.iso && z.severity >= 1 && z.severity <= 10)
            .map(z => ({
                country: z.country,
                iso: z.iso.toUpperCase().slice(0, 3),
                severity: Math.round(z.severity),
                reason: (z.reason || "").slice(0, 120),
            }));

        zoneCache = { zones: validZones, ts: Date.now() };
        console.log(`[conflict-zones] Groq identified ${validZones.length} conflict zones`);

        res.json({ zones: validZones, source: "Groq AI Analysis", count: validZones.length });
    } catch (err: any) {
        console.error("[conflict-zones]", err.message);

        // Serve stale cache if available
        if (zoneCache) {
            return res.json({ zones: zoneCache.zones, source: "Groq AI (stale cache)", count: zoneCache.zones.length });
        }

        res.json({ zones: [], source: "Groq AI (error)", count: 0, error: err.message });
    }
});

export default router;
