/**
 * seismic.ts — Real-time earthquake data from USGS
 * API: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson
 * No API key required. Returns M2.5+ quakes from the last 24 hours.
 * Data saved to Supabase; old data replaced on each fresh fetch.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "seismic";
const COLOR = LAYER_COLORS.SEISMIC;

// In-memory cache to avoid hammering USGS on every request
let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 10 * 60_000; // 10 min

function magToIntensity(mag: number): number {
    if (mag >= 7) return 10;
    if (mag >= 6) return 9;
    if (mag >= 5) return 7;
    if (mag >= 4) return 5;
    if (mag >= 3) return 3;
    return 2;
}

async function fetchUSGS(): Promise<IntelEvent[]> {
    const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`USGS ${res.status}`);
    const data = await res.json() as any;

    return (data.features || []).slice(0, 80).map((f: any) => {
        const [lng, lat, depth] = f.geometry.coordinates;
        const mag = f.properties.mag ?? 0;
        const place = f.properties.place || "Unknown";
        return {
            id: `EQ-${f.id}`,
            type: "SEISMIC" as const,
            lat, lng,
            intensity: magToIntensity(mag),
            label: `M${mag.toFixed(1)} — ${place}`,
            color: COLOR,
            timestamp: new Date(f.properties.time).toISOString(),
            meta: { magnitude: mag, depth: `${depth?.toFixed(1) ?? "?"}km`, place, type: f.properties.type || "earthquake" },
        };
    });
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        // Memory cache check
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "USGS (mem-cache)", count: memCache.events.length });
        }

        // Fetch fresh
        let events: IntelEvent[] = [];
        let source = "USGS Earthquake API";
        try {
            events = await fetchUSGS();
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[seismic] USGS fetch failed: ${err.message}`);
        }

        // Fallback to Supabase cache
        if (events.length === 0) {
            const cached = await readCachedEvents(TABLE, 2);
            if (cached && cached.events.length > 0) {
                memCache = { events: cached.events, ts: Date.now() };
                return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
            }
        }

        return res.json({ events, source, count: events.length });
    } catch (err: any) {
        console.error("[seismic] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
