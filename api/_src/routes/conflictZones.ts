import { Router, type Request, type Response } from "express";
import { readCachedEvents, upsertEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "conflict_zones";

/**
 * In-memory cache — 30 min TTL. Supabase is the persistent backing store
 * so Vercel cold starts always have DB data to fall back to.
 */
let zoneCache: { zones: ConflictZone[]; ts: number } | null = null;
const MEM_TTL = 30 * 60 * 1000;
const DB_REFRESH_HOURS = 6; // background-refresh if DB data is older than 6 hours

// Approximate centroids for storing zones as IntelEvents in Supabase
const ISO_CENTROIDS: Record<string, [number, number]> = {
    UKR: [48.4, 31.2], RUS: [61.5, 105.3], PSE: [31.9, 35.2], ISR: [31.0, 34.8],
    SDN: [12.9, 30.2], SSD: [7.9, 30.0], MMR: [21.9, 95.9], ETH: [9.1, 40.5],
    SOM: [5.2, 46.2], COD: [-4.0, 21.8], YEM: [15.6, 48.5], SYR: [34.8, 39.0],
    HTI: [18.9, -72.3], BFA: [12.4, -1.6], MLI: [17.6, -4.0], NGA: [9.1, 8.7],
    LBY: [26.3, 17.2], MOZ: [-18.7, 35.5], COL: [4.6, -74.3], AFG: [33.9, 67.7],
    IRQ: [33.2, 43.7], IRN: [32.4, 53.7], LBN: [33.9, 35.5], MEX: [23.6, -102.5],
    PAK: [30.4, 69.3], PHL: [12.9, 121.8], CAF: [7.0, 21.0], NER: [17.6, 8.1],
    TCD: [15.5, 18.7], KEN: [-0.02, 37.9], CMR: [3.9, 11.5], UGA: [1.4, 32.3],
    VEN: [6.4, -66.6], ZWE: [-20.0, 29.2], TZA: [-6.4, 34.9],
};

/** Map ConflictZone[] → IntelEvent[] for Supabase storage */
function zonesToEvents(zones: ConflictZone[]): IntelEvent[] {
    const now = new Date().toISOString();
    return zones.map(z => {
        const coords = ISO_CENTROIDS[z.iso] ?? [0, 0];
        return {
            id: `ZONE-${z.iso}`,
            type: "COMBAT" as const,
            lat: coords[0],
            lng: coords[1],
            intensity: z.severity,
            label: z.reason || `${z.country} conflict zone`,
            color: LAYER_COLORS.COMBAT,
            timestamp: now,
            meta: { country: z.country, iso: z.iso, severity: z.severity, reason: z.reason, isConflictZone: true },
        };
    });
}

/** Map cached IntelEvent[] back → ConflictZone[] */
function eventsToZones(events: IntelEvent[]): ConflictZone[] {
    return events
        .filter(e => e.meta?.isConflictZone)
        .map(e => ({
            country: String(e.meta?.country ?? e.label),
            iso: String(e.meta?.iso ?? ""),
            severity: e.intensity,
            reason: String(e.meta?.reason ?? e.label),
        }))
        .filter(z => z.iso.length === 3);
}

/** Call Groq to generate zones from live conflict events. Returns [] on error. */
async function fetchFromGroq(conflictEvents: any[]): Promise<ConflictZone[]> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return [];

    const countryCounts: Record<string, { count: number; labels: string[] }> = {};
    for (const evt of conflictEvents) {
        const country = evt.meta?.sourceCountry || "Unknown";
        if (country === "Unknown") continue;
        if (!countryCounts[country]) countryCounts[country] = { count: 0, labels: [] };
        countryCounts[country].count++;
        if (countryCounts[country].labels.length < 3)
            countryCounts[country].labels.push((evt.label || "").slice(0, 80));
    }

    const summary = Object.entries(countryCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 25)
        .map(([c, v]) => `${c} (${v.count} events): ${v.labels.join(" | ")}`)
        .join("\n");

    const prompt = `You are a military intelligence analyst. Based on the GDELT conflict data below, identify active conflict zones. Return a consistent, stable list — do NOT vary severity or reason between calls for the same country.

Live GDELT conflict events:
${summary || "(No live data — use known conflicts only)"}

Known ongoing conflicts to ALWAYS include (these are permanent fixtures):
- Ukraine (Russia-Ukraine war) — severity 10 — "Russia-Ukraine full-scale war"
- Palestine (Gaza — Israeli military operations) — severity 10 — "Israeli military operations in Gaza"
- Sudan (RSF vs SAF civil war) — severity 9 — "RSF vs SAF civil war"
- Yemen (Houthi conflict) — severity 8 — "Houthi-Saudi coalition armed conflict"
- Myanmar (junta vs resistance) — severity 8 — "Military junta vs civilian resistance forces"
- Haiti (gang warfare) — severity 8 — "State collapse and gang warfare"
- Ethiopia (armed group conflicts) — severity 7 — "Multi-faction armed conflict"
- Somalia (Al-Shabaab insurgency) — severity 7 — "Al-Shabaab jihadist insurgency"
- DR Congo (M23/ADF) — severity 7 — "M23 and ADF armed group conflict"
- Syria (multi-faction civil war) — severity 7 — "Multi-faction civil war ongoing"
- Burkina Faso (jihadist insurgency) — severity 7 — "JNIM jihadist insurgency"
- Mali (jihadist insurgency) — severity 7 — "JNIM and Wagner-backed conflict"
- Nigeria (Boko Haram/ISWAP) — severity 6 — "Boko Haram and ISWAP insurgency"
- Libya (militia factions) — severity 6 — "Rival militia faction conflict"
- South Sudan (internal conflict) — severity 6 — "Internal armed political conflict"
- Mozambique (ASWJ insurgency) — severity 6 — "ASWJ jihadist insurgency in Cabo Delgado"
- Colombia (ELN/FARC remnants) — severity 5 — "ELN and FARC dissident armed conflict"
- Iraq (ISIS remnants) — severity 5 — "ISIS remnant attacks and counter-operations"

Return ONLY a JSON array with NO markdown, NO code fences:
[{"country":"Full Country Name","iso":"ISO_A3","severity":1-10,"reason":"brief reason under 100 chars"},...]

Rules:
- Use the EXACT severity and reason shown above for known conflicts — do not vary them
- ISO codes must be 3 letters (UKR, SDN, PSE, MMR, HTI, etc.)
- Return 15-25 entries maximum`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,   // fully deterministic
            max_tokens: 1200,
        }),
    });

    if (!groqRes.ok) throw new Error(`Groq responded ${groqRes.status}`);

    const groqData = await groqRes.json() as any;
    const content: string = groqData.choices?.[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const zones: ConflictZone[] = JSON.parse(jsonMatch[0]);
    return zones
        .filter(z => z.country && z.iso && z.severity >= 1 && z.severity <= 10)
        .map(z => ({
            country: z.country,
            iso: z.iso.toUpperCase().slice(0, 3),
            severity: Math.round(z.severity),
            reason: (z.reason || "").slice(0, 120),
        }));
}
interface ConflictZone {
    country: string;   // Full country name matching GeoJSON ADMIN property
    iso: string;       // ISO A3 code (e.g. "UKR")
    severity: number;  // 1–10
    reason: string;    // One-line description
}

/**
 * GET /api/intel/conflict-zones
 *
 * Priority: mem-cache (30 min) → Supabase DB → Groq AI.
 * Zones are persisted in Supabase so Vercel cold starts always serve cached data.
 * Background refresh if DB data is older than 6 hours.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        // 1. Mem cache (30 min)
        if (zoneCache && Date.now() - zoneCache.ts < MEM_TTL) {
            return res.json({ zones: zoneCache.zones, source: "Groq AI (mem-cache)", count: zoneCache.zones.length });
        }

        // 2. Supabase — serve immediately if available
        const cached = await readCachedEvents(TABLE, 90); // zones persist up to 90 days
        if (cached && cached.events.length > 0) {
            const zones = eventsToZones(cached.events);
            if (zones.length > 0) {
                zoneCache = { zones, ts: Date.now() };

                // Background refresh if data is older than DB_REFRESH_HOURS
                const fetchedAt = new Date(cached.events[0]?.timestamp ?? 0).getTime();
                const ageHours = (Date.now() - fetchedAt) / 3_600_000;
                if (ageHours > DB_REFRESH_HOURS) {
                    readCachedEvents("conflicts", 17)
                        .then(async (conflictsData) => {
                            const fresh = await fetchFromGroq(conflictsData?.events ?? []);
                            if (fresh.length > 0) {
                                zoneCache = { zones: fresh, ts: Date.now() };
                                await upsertEvents(TABLE, zonesToEvents(fresh), "Groq AI");
                            }
                        })
                        .catch(err => console.warn("[conflict-zones] bg refresh failed:", err.message));
                }

                return res.json({ zones, source: cached.source, count: zones.length });
            }
        }

        // 3. First run — fetch from Groq synchronously and seed Supabase
        const conflictsData = await readCachedEvents("conflicts", 17);
        const zones = await fetchFromGroq(conflictsData?.events ?? []);

        if (zones.length > 0) {
            zoneCache = { zones, ts: Date.now() };
            upsertEvents(TABLE, zonesToEvents(zones), "Groq AI").catch(e =>
                console.error("[conflict-zones] cache write failed:", e.message));
        }

        console.log(`[conflict-zones] Groq identified ${zones.length} conflict zones`);
        return res.json({ zones, source: "Groq AI Analysis", count: zones.length });

    } catch (err: any) {
        console.error("[conflict-zones]", err.message);
        if (zoneCache) {
            return res.json({ zones: zoneCache.zones, source: "Groq AI (stale)", count: zoneCache.zones.length });
        }
        return res.json({ zones: [], source: "Groq AI (error)", count: 0, error: err.message });
    }
});

export default router;
