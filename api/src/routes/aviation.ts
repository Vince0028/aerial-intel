import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "aviation";
const router = Router();

/**
 * GET /api/intel/aviation
 * 1. Fetch from OpenSky Network (authenticated for higher rate limits) → upsert to Supabase
 * 2. On failure → serve from Supabase cache
 *
 * Authenticated users get 100 API credits/day vs 10 for anonymous.
 * Covers multiple AORs: Pacific, Middle East, Europe, Atlantic.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        // Wider bounding box — Pacific + Indian Ocean + Middle East + Europe
        const url = "https://opensky-network.org/api/states/all?lamin=-10&lomin=-30&lamax=65&lomax=150";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        // Use credentials if available (10x more API credits)
        const user = process.env.OPENSKY_USERNAME;
        const pass = process.env.OPENSKY_PASSWORD;
        const headers: Record<string, string> = {};
        if (user && pass) {
            headers["Authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
        }

        let response = await fetch(url, { signal: controller.signal, headers });

        // If auth rejected, retry anonymously
        if (response.status === 401 && user) {
            console.warn("[aviation] OpenSky auth 401 — retrying anonymously");
            response = await fetch(url, { signal: controller.signal });
        }

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`OpenSky responded ${response.status}`);

        const data = await response.json() as any;
        const states: any[] = (data.states || []).slice(0, 150);

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

        const sourceLabel = (user && pass && response.status !== 401)
            ? "OpenSky Network (authenticated)"
            : "OpenSky Network";

        // Cache to Supabase
        upsertEvents(TABLE, events, sourceLabel).catch(() => {});

        res.json({ events, source: sourceLabel, count: events.length, timestamp: data.time });
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
