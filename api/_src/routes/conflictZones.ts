import { Router, type Request, type Response } from "express";
import { readCachedEvents, upsertEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "conflict_zones";

interface ConflictZone {
    country: string;
    iso: string;
    severity: number;
    reason: string;
}

let zoneCache: { zones: ConflictZone[]; ts: number } | null = null;
const MEM_TTL = 60 * 60 * 1000;

// Bump this whenever BASE_CONFLICT_ZONES changes -- forces Supabase re-seed on next request
const ZONE_VERSION = "2026-03-08-v2";

/**
 * HARDCODED base list -- all active wars and conflicts as of March 2026.
 * These are ALWAYS present regardless of what is in Supabase.
 */
const BASE_CONFLICT_ZONES: ConflictZone[] = [
    // Full-scale wars
    { country: "Ukraine",                          iso: "UKR", severity: 10, reason: "Russia-Ukraine full-scale war" },
    { country: "Russia",                           iso: "RUS", severity: 10, reason: "Active war -- Ukrainian strikes on Russian territory" },
    { country: "Palestine",                        iso: "PSE", severity: 10, reason: "Israeli military operations in Gaza and West Bank" },
    { country: "Sudan",                            iso: "SDN", severity: 9,  reason: "RSF vs SAF civil war -- mass civilian casualties" },
    { country: "Yemen",                            iso: "YEM", severity: 9,  reason: "Houthi conflict -- US/Israeli airstrikes ongoing" },
    { country: "Democratic Republic of the Congo", iso: "COD", severity: 8,  reason: "M23 rebel major offensive -- Goma captured 2025" },
    { country: "Myanmar",                          iso: "MMR", severity: 8,  reason: "Military junta vs nationwide resistance forces" },
    { country: "Haiti",                            iso: "HTI", severity: 8,  reason: "Gang warfare and state collapse" },
    { country: "Israel",                           iso: "ISR", severity: 8,  reason: "Active military operations in Gaza, Lebanon, Syria" },
    { country: "Burkina Faso",                     iso: "BFA", severity: 8,  reason: "JNIM jihadist insurgency -- mass displacement" },
    // Major armed conflicts
    { country: "Syria",                            iso: "SYR", severity: 7,  reason: "Post-Assad multi-faction armed conflict ongoing" },
    { country: "Ethiopia",                         iso: "ETH", severity: 7,  reason: "Amhara and Oromo armed conflicts ongoing" },
    { country: "Somalia",                          iso: "SOM", severity: 7,  reason: "Al-Shabaab jihadist insurgency" },
    { country: "South Sudan",                      iso: "SSD", severity: 7,  reason: "Internal armed political conflict -- resumed 2025" },
    { country: "Mali",                             iso: "MLI", severity: 7,  reason: "JNIM insurgency -- major territory lost to jihadists" },
    // Significant insurgencies / civil conflicts
    { country: "Nigeria",                          iso: "NGA", severity: 6,  reason: "Boko Haram, ISWAP insurgency and banditry" },
    { country: "Mozambique",                       iso: "MOZ", severity: 6,  reason: "ASWJ jihadist insurgency in Cabo Delgado" },
    { country: "Central African Republic",         iso: "CAF", severity: 6,  reason: "CPC rebel coalition vs government armed conflict" },
    { country: "Niger",                            iso: "NER", severity: 6,  reason: "JNIM insurgency and post-coup armed instability" },
    { country: "Colombia",                         iso: "COL", severity: 6,  reason: "ELN and FARC dissident armed conflict ongoing" },
    { country: "Lebanon",                          iso: "LBN", severity: 6,  reason: "Post-war armed incidents and Hezbollah remnants" },
    { country: "Afghanistan",                      iso: "AFG", severity: 6,  reason: "TTP insurgency and Taliban internal armed conflict" },
    { country: "Mexico",                           iso: "MEX", severity: 6,  reason: "Cartel war -- military-level armed conflict" },
    { country: "Libya",                            iso: "LBY", severity: 6,  reason: "Rival militia faction armed conflict" },
    // Ongoing lower-intensity conflicts
    { country: "Iraq",                             iso: "IRQ", severity: 5,  reason: "ISIS remnant attacks and PMF operations" },
    { country: "Pakistan",                         iso: "PAK", severity: 5,  reason: "TTP cross-border attacks, Baloch insurgency" },
    { country: "Iran",                             iso: "IRN", severity: 5,  reason: "Israeli airstrikes, Baloch/Kurdish insurgency" },
    { country: "Venezuela",                        iso: "VEN", severity: 5,  reason: "Tren de Aragua gang war and border armed conflict" },
    { country: "North Korea",                      iso: "PRK", severity: 5,  reason: "Troops deployed to Russia, active military provocations" },
    { country: "Chad",                             iso: "TCD", severity: 5,  reason: "Armed rebel groups and Sahel jihadist spillover" },
    { country: "Cameroon",                         iso: "CMR", severity: 5,  reason: "Anglophone separatist armed conflict" },
    { country: "Philippines",                      iso: "PHL", severity: 4,  reason: "NPA communist insurgency and Abu Sayyaf attacks" },
    { country: "Uganda",                           iso: "UGA", severity: 4,  reason: "ADF insurgency near DRC border" },
    { country: "Kenya",                            iso: "KEN", severity: 4,  reason: "Al-Shabaab cross-border attacks" },
    { country: "Zimbabwe",                         iso: "ZWE", severity: 3,  reason: "Armed political violence and security crackdowns" },
    { country: "Tanzania",                         iso: "TZA", severity: 3,  reason: "Jihadist spillover from Mozambique insurgency" },
];

const ISO_CENTROIDS: Record<string, [number, number]> = {
    UKR: [48.4, 31.2], RUS: [55.75, 37.6], PSE: [31.9, 35.2], ISR: [31.0, 34.8],
    SDN: [12.9, 30.2], SSD: [7.9, 30.0], MMR: [21.9, 95.9], ETH: [9.1, 40.5],
    SOM: [5.2, 46.2], COD: [-4.0, 21.8], YEM: [15.6, 48.5], SYR: [34.8, 39.0],
    HTI: [18.9, -72.3], BFA: [12.4, -1.6], MLI: [17.6, -4.0], NGA: [9.1, 8.7],
    LBY: [26.3, 17.2], MOZ: [-18.7, 35.5], COL: [4.6, -74.3], AFG: [33.9, 67.7],
    IRQ: [33.2, 43.7], IRN: [32.4, 53.7], LBN: [33.9, 35.5], MEX: [23.6, -102.5],
    PAK: [30.4, 69.3], PHL: [12.9, 121.8], CAF: [7.0, 21.0], NER: [17.6, 8.1],
    TCD: [15.5, 18.7], KEN: [-0.02, 37.9], CMR: [3.9, 11.5], UGA: [1.4, 32.3],
    VEN: [6.4, -66.6], ZWE: [-20.0, 29.2], TZA: [-6.4, 34.9], PRK: [40.3, 127.5],
};

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
            meta: {
                country: z.country,
                iso: z.iso,
                severity: z.severity,
                reason: z.reason,
                isConflictZone: true,
                zoneVersion: ZONE_VERSION,
            },
        };
    });
}

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

/**
 * Always layer BASE_CONFLICT_ZONES on top of any DB/Groq extras.
 * Hardcoded entries always override stale DB rows for the same ISO code.
 */
function mergeWithBase(extras: ConflictZone[]): ConflictZone[] {
    const merged = new Map<string, ConflictZone>();
    for (const z of extras) merged.set(z.iso, z);
    for (const z of BASE_CONFLICT_ZONES) merged.set(z.iso, z); // base always wins
    return Array.from(merged.values()).sort((a, b) => b.severity - a.severity);
}

/**
 * Build zones: start from BASE, then add GDELT-detected extras via Groq.
 */
async function buildZones(conflictEvents: any[]): Promise<ConflictZone[]> {
    const merged = new Map<string, ConflictZone>();
    for (const z of BASE_CONFLICT_ZONES) merged.set(z.iso, z);

    if (conflictEvents.length > 0 && process.env.GROQ_API_KEY) {
        try {
            const countryCounts: Record<string, { count: number; labels: string[] }> = {};
            for (const evt of conflictEvents) {
                const country = evt.meta?.sourceCountry || "Unknown";
                if (country === "Unknown") continue;
                if (!countryCounts[country]) countryCounts[country] = { count: 0, labels: [] };
                countryCounts[country].count++;
                if (countryCounts[country].labels.length < 2)
                    countryCounts[country].labels.push((evt.label || "").slice(0, 70));
            }

            const summary = Object.entries(countryCounts)
                .sort((a, b) => b[1].count - a[1].count)
                .filter(([c]) => !BASE_CONFLICT_ZONES.find(z => z.country === c))
                .slice(0, 15)
                .map(([c, v]) => `${c} (${v.count} events): ${v.labels.join(" | ")}`)
                .join("\n");

            if (summary.length > 0) {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{
                            role: "user",
                            content: `From this GDELT news data, identify any NEW countries with active armed conflict NOT already in this list: ${BASE_CONFLICT_ZONES.map(z => z.iso).join(",")}\n\nGDELT data:\n${summary}\n\nReturn ONLY a JSON array or empty [] if nothing new. Each item: {"country":"Full Name","iso":"ISO_A3","severity":1-10,"reason":"brief reason"}\nNO markdown, NO code fences.`,
                        }],
                        temperature: 0,
                        max_tokens: 600,
                    }),
                });

                if (groqRes.ok) {
                    const groqData = await groqRes.json() as any;
                    const content: string = groqData.choices?.[0]?.message?.content || "[]";
                    const jsonMatch = content.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const extras: ConflictZone[] = JSON.parse(jsonMatch[0]);
                        for (const z of extras) {
                            if (z.country && z.iso?.length === 3 && !merged.has(z.iso.toUpperCase())) {
                                merged.set(z.iso.toUpperCase(), {
                                    country: z.country,
                                    iso: z.iso.toUpperCase(),
                                    severity: Math.min(10, Math.max(1, Math.round(z.severity))),
                                    reason: (z.reason || "").slice(0, 120),
                                });
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.warn("[conflict-zones] Groq extras failed:", e.message);
        }
    }

    return Array.from(merged.values()).sort((a, b) => b.severity - a.severity);
}

/**
 * GET /api/intel/conflict-zones
 *
 * Priority: mem-cache (1h) -> Supabase (version-checked, merge base on top) -> build fresh.
 * BASE_CONFLICT_ZONES ALWAYS present -- stale Supabase rows can never hide current conflicts.
 * ZONE_VERSION mismatch forces automatic re-seed on next deploy.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        // 1. Mem cache
        if (zoneCache && Date.now() - zoneCache.ts < MEM_TTL) {
            return res.json({ zones: zoneCache.zones, source: "Intel DB (live)", count: zoneCache.zones.length });
        }

        // 2. Supabase -- version check, then merge base on top
        const cached = await readCachedEvents(TABLE, 90);
        if (cached && cached.events.length > 0) {
            const dbVersion = cached.events[0]?.meta?.zoneVersion as string | undefined;

            if (dbVersion === ZONE_VERSION) {
                const dbExtras = eventsToZones(cached.events);
                const zones = mergeWithBase(dbExtras); // BASE always wins over stale rows
                zoneCache = { zones, ts: Date.now() };

                // Background refresh every 12h for new GDELT-detected conflicts
                const fetchedAt = new Date(cached.events[0]?.timestamp ?? 0).getTime();
                if ((Date.now() - fetchedAt) / 3_600_000 > 12) {
                    readCachedEvents("conflicts", 17)
                        .then(async d => {
                            const fresh = await buildZones(d?.events ?? []);
                            zoneCache = { zones: fresh, ts: Date.now() };
                            await upsertEvents(TABLE, zonesToEvents(fresh), "Intel DB");
                        })
                        .catch(e => console.warn("[conflict-zones] bg refresh failed:", e.message));
                }

                return res.json({ zones, source: "Intel DB (live)", count: zones.length });
            }
            // Version mismatch -- old Supabase data, fall through to rebuild
            console.log(`[conflict-zones] DB version "${dbVersion ?? "none"}" outdated, rebuilding...`);
        }

        // 3. Build fresh and seed Supabase
        const conflictsData = await readCachedEvents("conflicts", 17);
        const zones = await buildZones(conflictsData?.events ?? []);

        zoneCache = { zones, ts: Date.now() };
        upsertEvents(TABLE, zonesToEvents(zones), "Intel DB").catch(e =>
            console.error("[conflict-zones] cache write failed:", e.message));

        console.log(`[conflict-zones] Built ${zones.length} conflict zones (v${ZONE_VERSION})`);
        return res.json({ zones, source: "Intel DB (live)", count: zones.length });

    } catch (err: any) {
        console.error("[conflict-zones]", err.message);
        // Always return hardcoded base as absolute fallback
        return res.json({ zones: BASE_CONFLICT_ZONES, source: "Intel DB (fallback)", count: BASE_CONFLICT_ZONES.length });
    }
});

export default router;