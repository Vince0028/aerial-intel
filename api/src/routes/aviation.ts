import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "aviation";
const router = Router();

/**
 * GET /api/intel/aviation
 * 1. Fetch from OpenSky Network → upsert to Supabase
 * 2. On failure → serve from Supabase cache
 *
 * Uses anonymous access (no auth) which has a lower rate limit
 * but avoids credential issues. Limits to a bounding box to
 * reduce response size and avoid timeouts.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        // Bounding box covering Europe + Middle East + North Africa for manageable data size
        const url = "https://opensky-network.org/api/states/all?lamin=10&lomin=-30&lamax=60&lomax=70";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`OpenSky responded ${response.status}`);

        const data = await response.json() as any;
        const states: any[] = (data.states || []).slice(0, 80);

        const events: IntelEvent[] = states
            .filter((s: any) => s[5] != null && s[6] != null)
            .map((s: any, i: number) => ({
                id: `OSKY-${s[0]?.trim() || i}`,
                type: "AVIATION" as const,
                lat: s[6],
                lng: s[5],
                intensity: Math.min(10, Math.max(1, Math.round((s[7] || 0) / 3000))),
                label: `${s[1]?.trim() || "UNKNOWN"} | ALT ${Math.round(s[7] || 0)}m | SPD ${Math.round(s[9] || 0)}m/s`,
                color: LAYER_COLORS.AVIATION,
                timestamp: new Date((s[3] || data.time) * 1000).toISOString(),
                meta: {
                    source: "OpenSky",
                    icao24: s[0]?.trim(),
                    callsign: s[1]?.trim(),
                    originCountry: s[2],
                    altitude: s[7],
                    velocity: s[9],
                    heading: s[10],
                    verticalRate: s[11],
                    onGround: s[8],
                },
            }));

        // Cache to Supabase
        upsertEvents(TABLE, events, "OpenSky Network").catch(() => {});

        res.json({ events, source: "OpenSky Network", count: events.length, timestamp: data.time });
    } catch (err: any) {
        console.error("[aviation]", err.message);

        // Fallback: Supabase cache (max 1 day old — real-time data goes stale fast)
        const cached = await readCachedEvents(TABLE, 1);
        if (cached && cached.events.length > 0) {
            console.log("[aviation] Serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }

        res.status(502).json({ error: "Failed to fetch aviation data", detail: err.message });
    }
});

export default router;
