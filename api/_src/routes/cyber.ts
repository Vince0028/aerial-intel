import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";

const TABLE = "cyber";
const router = Router();

/**
 * GET /api/intel/cyber
 * 1. Fetch from Cloudflare Radar → upsert to Supabase
 * 2. On failure → serve from Supabase cache
 */
router.get("/", async (_req: Request, res: Response) => {
    const token = process.env.CLOUDFLARE_API_TOKEN;

    if (!token) {
        // No token — try Supabase cache
        const cached = await readCachedEvents(TABLE, 7);
        if (cached && cached.events.length > 0) {
            console.log("[cyber] No Cloudflare token, serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }
        return res.status(200).json({
            events: [],
            source: "Cloudflare Radar (no token configured)",
            count: 0,
            hint: "Set CLOUDFLARE_API_TOKEN in .env — get free at radar.cloudflare.com",
        });
    }

    try {
        const url =
            "https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=30&format=json&dateRange=7d";

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Cloudflare responded ${response.status}`);

        const data = await response.json() as any;
        const outages: any[] = data?.result?.annotations || [];

        const countryCoords: Record<string, [number, number]> = {
            US: [39.8, -98.6], GB: [55.4, -3.4], DE: [51.2, 10.4], FR: [46.2, 2.2],
            RU: [61.5, 105.3], CN: [35.9, 104.2], IN: [20.6, 79.0], BR: [-14.2, -51.9],
            UA: [48.4, 31.2], IR: [32.4, 53.7], SY: [34.8, 39.0], IQ: [33.2, 43.7],
            EG: [26.8, 30.8], SA: [23.9, 45.1], PK: [30.4, 69.3], TR: [38.9, 35.2],
            NG: [9.1, 8.7], ET: [9.1, 40.5], MM: [21.9, 95.9], AF: [33.9, 67.7],
            PH: [12.9, 121.8], JP: [36.2, 138.3], KR: [35.9, 127.8], KP: [40.3, 127.5],
            SD: [12.9, 30.2], LY: [26.3, 17.2], VE: [6.4, -66.6], CU: [21.5, -77.8],
        };

        const events: IntelEvent[] = outages.map((o: any, i: number) => {
            const locations = o.asns?.map((a: any) => a.locations?.[0] || "").filter(Boolean) || [];
            const cc = locations[0] || "??";
            const coords = countryCoords[cc] || [0, 0];

            return {
                id: `CF-${o.id || i}`,
                type: "CYBER" as const,
                lat: coords[0] + (Math.random() - 0.5) * 2,
                lng: coords[1] + (Math.random() - 0.5) * 2,
                intensity: o.scope === "country" ? 9 : o.scope === "region" ? 6 : 4,
                label: `${o.eventType || "Outage"}: ${o.description || cc}`,
                color: LAYER_COLORS.CYBER,
                timestamp: o.startDate || new Date().toISOString(),
                meta: {
                    source: "Cloudflare Radar",
                    scope: o.scope,
                    endDate: o.endDate,
                    locations,
                },
            };
        });

        // Only keep recent events and cache to Supabase
        const freshEvents = filterFreshEvents(events, 17);
        upsertEvents(TABLE, freshEvents, "Cloudflare Radar").catch(() => {});

        res.json({ events: freshEvents, source: "Cloudflare Radar", count: freshEvents.length });
    } catch (err: any) {
        console.error("[cyber]", err.message);

        // Fallback: Supabase cache
        const cached = await readCachedEvents(TABLE, 7);
        if (cached && cached.events.length > 0) {
            console.log("[cyber] Serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }

        res.status(502).json({ error: "Failed to fetch cyber data", detail: err.message });
    }
});

export default router;
