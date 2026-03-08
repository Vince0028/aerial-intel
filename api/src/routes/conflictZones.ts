import { Router, type Request, type Response } from "express";
import { readCachedEvents } from "../dbCache.js";

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
        // Read conflict events directly from Supabase cache
        // (avoids a localhost HTTP call that breaks in serverless environments)
        const conflictsData = await readCachedEvents("conflicts");
        const events: any[] = conflictsData?.events || [];

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

        const prompt = `You are a military intelligence analyst for a global C2 system. Based on the following REAL conflict event data scraped today from GDELT news, identify countries that are ACTIVE CONFLICT ZONES right now.

Include ALL types of armed conflict:
- International wars (country vs country)
- Civil wars (government vs armed groups within same country)
- Insurgencies and armed rebellions
- State collapse / warlord conflicts
- Major terrorist insurgencies (e.g. ISIS, Al-Shabaab, Boko Haram)
- Ethnic / sectarian armed conflict
- Drug cartel wars with military involvement

Current conflict events by country:
${summary}

Also include these known ongoing wars/civil wars/conflicts even if not in the data above:
- Ukraine (Russia-Ukraine war)
- Palestine (Gaza conflict / Israeli military operations)
- Sudan (RSF vs SAF civil war)
- Myanmar (military junta vs resistance forces)
- Ethiopia (multiple armed group conflicts)
- Somalia (Al-Shabaab insurgency)
- DR Congo (M23, ADF armed groups)
- Yemen (Houthi conflict)
- Syria (multi-faction civil war)
- Haiti (gang warfare / state collapse)
- Burkina Faso (jihadist insurgency)
- Mali (jihadist insurgency)
- Nigeria (Boko Haram / banditry)
- South Sudan (internal armed conflict)
- Libya (militia factions)
- Mozambique (ASWJ insurgency)
- Colombia (ELN / FARC remnants)

Return ONLY a JSON array. Each item: {"country":"Full Country Name","iso":"ISO_A3_CODE","severity":1-10,"reason":"brief reason"}

Rules:
- severity 8-10: active war / major military operations (e.g. Ukraine-Russia, Sudan civil war, Gaza)
- severity 5-7: significant armed conflict / insurgency / civil war
- severity 3-4: elevated tensions / border clashes / terrorism
- Only include countries with REAL ongoing conflicts, NOT just news coverage
- Use common English country names that match GeoJSON (e.g. "Ukraine" not "Ukr")
- ISO codes must be 3-letter (UKR, ISR, SYR, SDN, MMR, etc.)
- Return between 10-25 countries maximum
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
                max_tokens: 1200,
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
