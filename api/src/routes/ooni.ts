/**
 * ooni.ts — Internet censorship incidents from OONI
 * API: https://api.ooni.io/api/v1/incidents/search
 * No API key required. Tracks web connectivity tests and censorship events.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { COUNTRY_CENTROIDS } from "../countryCentroids.js";

const router = Router();
const TABLE = "ooni";
const COLOR = LAYER_COLORS.OONI;

let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 30 * 60_000; // 30 min

function themeToIntensity(themes: string[]): number {
    if (!themes || themes.length === 0) return 5;
    const joined = themes.join(",").toLowerCase();
    if (joined.includes("social_media") || joined.includes("news_media")) return 8;
    if (joined.includes("political") || joined.includes("human_rights")) return 9;
    if (joined.includes("circumvention")) return 7;
    return 5;
}

async function fetchOONI(): Promise<IntelEvent[]> {
    const url = "https://api.ooni.io/api/v1/incidents/search?only_mine=false";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`OONI ${res.status}`);
    const data = await res.json() as any;

    const events: IntelEvent[] = [];
    const incidents = data?.incidents || [];

    for (const inc of incidents) {
        const ccs: string[] = inc.CCs || inc.ccs || [];
        const title = inc.title || "Censorship incident";
        const startDate = inc.start_date || inc.create_time || new Date().toISOString();
        const themes: string[] = inc.themes || [];
        const testNames: string[] = inc.test_names || [];
        const shortDesc = inc.short_description || "";

        for (const cc of ccs) {
            const coords = COUNTRY_CENTROIDS[cc.toUpperCase()];
            if (!coords) continue;
            const [lat, lng] = coords;

            events.push({
                id: `OONI-${inc.id || inc.incident_id || Math.random().toString(36).slice(2)}-${cc}`,
                type: "OONI",
                lat: lat + (Math.random() - 0.5) * 0.4,
                lng: lng + (Math.random() - 0.5) * 0.4,
                intensity: themeToIntensity(themes),
                label: `${title} — ${cc}`,
                color: COLOR,
                timestamp: startDate,
                meta: {
                    country: cc,
                    themes: themes.join(", "),
                    tests: testNames.join(", "),
                    description: shortDesc.slice(0, 400),
                    end_date: inc.end_date || null,
                },
            });
        }
    }
    return events;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "OONI (mem-cache)", count: memCache.events.length });
        }

        let events: IntelEvent[] = [];
        let source = "OONI / Censorship Monitor";
        try {
            events = await fetchOONI();
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[ooni] OONI fetch failed: ${err.message}`);
        }

        if (events.length === 0) {
            const cached = await readCachedEvents(TABLE, 7);
            if (cached && cached.events.length > 0) {
                memCache = { events: cached.events, ts: Date.now() };
                return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
            }
        }

        return res.json({ events, source, count: events.length });
    } catch (err: any) {
        console.error("[ooni] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
