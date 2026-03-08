/**
 * weather.ts — Real-time severe weather / natural hazard events from NASA EONET
 * API: https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60
 * No API key required. Returns active wildfires, storms, volcanoes, floods.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "weather";
const COLOR = LAYER_COLORS.WEATHER;

let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 15 * 60_000; // 15 min

const CATEGORY_INTENSITY: Record<string, number> = {
    wildfires: 7,
    severeStorms: 8,
    volcanoes: 9,
    floods: 6,
    earthquakes: 7,
    drought: 4,
    dustHaze: 3,
    landslides: 6,
    snow: 4,
    tempExtremes: 5,
    waterColor: 2,
    seaLakeIce: 3,
};

async function fetchEONET(): Promise<IntelEvent[]> {
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`EONET ${res.status}`);
    const data = await res.json() as any;

    const events: IntelEvent[] = [];
    for (const ev of data.events || []) {
        const geom = ev.geometry?.[ev.geometry.length - 1]; // latest geometry point
        if (!geom || !geom.coordinates) continue;
        const [lng, lat] = geom.coordinates;
        const catId = ev.categories?.[0]?.id || "unknown";
        const catTitle = ev.categories?.[0]?.title || "Natural Hazard";

        events.push({
            id: `WX-${ev.id}`,
            type: "WEATHER",
            lat, lng,
            intensity: CATEGORY_INTENSITY[catId] || 5,
            label: `${catTitle}: ${ev.title}`,
            color: COLOR,
            timestamp: geom.date || new Date().toISOString(),
            meta: { category: catTitle, categoryId: catId, source_url: ev.link },
        });
    }
    return events;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "EONET (mem-cache)", count: memCache.events.length });
        }

        let events: IntelEvent[] = [];
        let source = "NASA EONET";
        try {
            events = await fetchEONET();
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[weather] EONET fetch failed: ${err.message}`);
        }

        if (events.length === 0) {
            const cached = await readCachedEvents(TABLE, 2);
            if (cached && cached.events.length > 0) {
                memCache = { events: cached.events, ts: Date.now() };
                return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
            }
        }

        return res.json({ events, source, count: events.length });
    } catch (err: any) {
        console.error("[weather] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
