import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";

const TABLE = "satellite";
const router = Router();

/**
 * GET /api/intel/satellite
 * 1. Fetch from NASA FIRMS → upsert to Supabase
 * 2. On failure → serve from Supabase cache
 */
router.get("/", async (_req: Request, res: Response) => {
    const mapKey = process.env.NASA_FIRMS_MAP_KEY;

    if (!mapKey) {
        // No key — try Supabase cache
        const cached = await readCachedEvents(TABLE, 7);
        if (cached && cached.events.length > 0) {
            console.log("[satellite] No FIRMS key, serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }
        return res.status(200).json({
            events: [],
            source: "NASA FIRMS (no key configured)",
            count: 0,
            hint: "Set NASA_FIRMS_MAP_KEY in .env — request free at firms.modaps.eosdis.nasa.gov",
        });
    }

    try {
        // Use NASA EONET (Earth Observatory Natural Event Tracker) as primary source
        // It's fast, no-key-required, and returns structured JSON with lat/lng
        // Falls back to FIRMS CSV if EONET fails
        let events: IntelEvent[] = [];
        let usedSource = "NASA FIRMS (VIIRS)";

        try {
            const eonetUrl = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60";
            const eonetController = new AbortController();
            const eonetTimeout = setTimeout(() => eonetController.abort(), 12000);
            const eonetRes = await fetch(eonetUrl, { signal: eonetController.signal });
            clearTimeout(eonetTimeout);

            if (eonetRes.ok) {
                const eonetData = await eonetRes.json() as any;
                const eonetEvents: any[] = eonetData.events || [];

                events = eonetEvents
                    .filter((e: any) => e.geometry?.[0]?.coordinates)
                    .map((e: any, i: number) => {
                        const geo = e.geometry[0];
                        const coords = geo.coordinates; // [lng, lat]
                        const cat = e.categories?.[0]?.title || "Natural Event";
                        return {
                            id: `EONET-${e.id || i}`,
                            type: "SATELLITE" as const,
                            lat: coords[1],
                            lng: coords[0],
                            intensity: cat.toLowerCase().includes("wildfire") ? 8
                                : cat.toLowerCase().includes("volcano") ? 9
                                : cat.toLowerCase().includes("earthquake") ? 7 : 5,
                            label: `${cat}: ${e.title || "Event"}`,
                            color: LAYER_COLORS.SATELLITE,
                            timestamp: geo.date || new Date().toISOString(),
                            meta: {
                                source: "NASA EONET",
                                category: cat,
                                link: e.link,
                            },
                        };
                    });
                usedSource = "NASA EONET";
            }
        } catch {
            console.log("[satellite] EONET failed, trying FIRMS...");
        }

        // Fallback to FIRMS if EONET returned nothing
        if (events.length === 0) {
            // Use specific high-interest bounding box instead of world to avoid timeout
            // Middle East + Africa + Europe: lat -35 to 65, lng -20 to 70
            const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/-20,-35,70,65/1`;

            const controller = new AbortController();
            const firmsTimeout = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(firmsTimeout);

            if (!response.ok) throw new Error(`NASA FIRMS responded ${response.status}`);

            const csv = await response.text();
            const lines = csv.trim().split("\n");
            const headers = lines[0].split(",");
            const latIdx = headers.indexOf("latitude");
            const lngIdx = headers.indexOf("longitude");
            const confIdx = headers.indexOf("confidence");
            const frpIdx = headers.indexOf("frp");
            const dateIdx = headers.indexOf("acq_date");
            const timeIdx = headers.indexOf("acq_time");

            const rows = lines.slice(1).map((line) => line.split(","));
            rows.sort((a, b) => parseFloat(b[frpIdx] || "0") - parseFloat(a[frpIdx] || "0"));
            const topRows = rows.slice(0, 60);

            events = topRows.map((cols, i) => {
                const frp = parseFloat(cols[frpIdx] || "0");
                return {
                    id: `FIRMS-${i}-${cols[dateIdx]}`,
                    type: "SATELLITE" as const,
                    lat: parseFloat(cols[latIdx]) || 0,
                    lng: parseFloat(cols[lngIdx]) || 0,
                    intensity: Math.min(10, Math.max(1, Math.round(frp / 50))),
                    label: `Thermal anomaly | FRP ${frp.toFixed(1)}MW | Conf: ${cols[confIdx] || "?"}`,
                    color: LAYER_COLORS.SATELLITE,
                    timestamp: `${cols[dateIdx]}T${(cols[timeIdx] || "0000").replace(/(\d{2})(\d{2})/, "$1:$2")}:00Z`,
                    meta: {
                        source: "NASA FIRMS",
                        frp,
                        confidence: cols[confIdx],
                        satellite: "VIIRS_SNPP",
                    },
                };
            });
            usedSource = "NASA FIRMS (VIIRS)";
        }

        // Only keep recent events and cache to Supabase
        const freshEvents = filterFreshEvents(events, 14);
        upsertEvents(TABLE, freshEvents, usedSource).catch(() => {});

        res.json({ events: freshEvents, source: usedSource, count: freshEvents.length });
    } catch (err: any) {
        console.error("[satellite]", err.message);

        // Fallback: Supabase cache
        const cached = await readCachedEvents(TABLE, 7);
        if (cached && cached.events.length > 0) {
            console.log("[satellite] Serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }

        res.status(502).json({ error: "Failed to fetch satellite data", detail: err.message });
    }
});

export default router;
