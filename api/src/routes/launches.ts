/**
 * launches.ts — Upcoming space launches from Launch Library 2
 * API: https://ll.thespacedevs.com/2.2.0/launch/upcoming/
 * No API key required. Free tier: 15 requests/hour.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "launches";
const COLOR = LAYER_COLORS.LAUNCH;

let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 20 * 60_000; // 20 min (respect 15 req/hr limit)

function statusToIntensity(statusId: number): number {
    // 1=Go, 2=TBD, 3=Success, 4=Failure, 5=Hold, 6=InFlight, 7=PartialFailure
    if (statusId === 1 || statusId === 6) return 8; // Go / In-Flight
    if (statusId === 3) return 6; // Success
    if (statusId === 4 || statusId === 7) return 9; // Failure
    return 4;
}

async function fetchLaunches(): Promise<IntelEvent[]> {
    const url = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=25&mode=list";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`LL2 ${res.status}`);
    const data = await res.json() as any;

    const events: IntelEvent[] = [];
    for (const launch of data.results || []) {
        const pad = launch.pad;
        if (!pad?.latitude || !pad?.longitude) continue;
        const lat = parseFloat(pad.latitude);
        const lng = parseFloat(pad.longitude);
        if (isNaN(lat) || isNaN(lng)) continue;

        const rocketName = launch.rocket?.configuration?.name || "Unknown rocket";
        const missionName = launch.mission?.name || launch.name || "Launch";
        const statusId = launch.status?.id || 0;
        const statusName = launch.status?.name || "Unknown";

        events.push({
            id: `LAUNCH-${launch.id}`,
            type: "LAUNCH",
            lat, lng,
            intensity: statusToIntensity(statusId),
            label: `${rocketName} — ${missionName}`,
            color: COLOR,
            timestamp: launch.net || new Date().toISOString(),
            meta: {
                rocket: rocketName,
                mission: missionName,
                pad: pad.name || "Unknown pad",
                location: pad.location?.name || "Unknown",
                status: statusName,
                window_start: launch.window_start,
                window_end: launch.window_end,
            },
        });
    }
    return events;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "Launch Library 2 (mem-cache)", count: memCache.events.length });
        }

        let events: IntelEvent[] = [];
        let source = "Launch Library 2";
        try {
            events = await fetchLaunches();
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[launches] LL2 fetch failed: ${err.message}`);
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
        console.error("[launches] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
