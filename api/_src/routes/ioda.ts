/**
 * ioda.ts — Internet outage detection from IODA (Georgia Tech)
 * API: https://api.ioda.inetintel.cc.gatech.edu/v2/
 * No API key required. Tracks BGP, active probing, & darknet signals.
 * Country-level outages plotted at centroids.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { COUNTRY_CENTROIDS } from "../countryCentroids.js";

const router = Router();
const TABLE = "ioda";
const COLOR = LAYER_COLORS.IODA;

let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 10 * 60_000; // 10 min

function severityToIntensity(level: string): number {
    const l = level?.toLowerCase() || "";
    if (l.includes("critical")) return 10;
    if (l.includes("warning") || l.includes("high")) return 7;
    if (l.includes("normal") || l.includes("low")) return 4;
    return 5;
}

async function fetchIODA(): Promise<IntelEvent[]> {
    // Fetch country-level outage alerts from Feb 20, 2026
    const until = Math.floor(Date.now() / 1000);
    const feb20 = Math.floor(new Date("2026-02-20T00:00:00Z").getTime() / 1000);
    const from = feb20;
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/alerts/country?from=${from}&until=${until}&limit=60`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`IODA ${res.status}`);
    const data = await res.json() as any;

    const events: IntelEvent[] = [];
    // The API may return { data: { alerts: [...] } } or { data: [...] }
    const alerts = data?.data?.alerts || data?.data || data?.alerts || [];
    if (!Array.isArray(alerts)) return events;

    for (const alert of alerts) {
        const cc = alert?.entity?.code || alert?.entityCode || alert?.country || "";
        const coords = COUNTRY_CENTROIDS[cc.toUpperCase()];
        if (!coords) continue;

        const [lat, lng] = coords;
        const level = alert?.level || alert?.condition || "warning";
        const datasource = alert?.datasource || alert?.dataSource || "unknown";
        const entityName = alert?.entity?.name || cc;
        const timeBegin = alert?.time?.begin || alert?.from;
        const ts = timeBegin ? new Date(typeof timeBegin === "number" ? timeBegin * 1000 : timeBegin).toISOString() : new Date().toISOString();

        events.push({
            id: `IODA-${cc}-${datasource}-${from}`,
            type: "IODA",
            lat: lat + (Math.random() - 0.5) * 0.3,
            lng: lng + (Math.random() - 0.5) * 0.3,
            intensity: severityToIntensity(level),
            label: `Internet Outage: ${entityName} (${datasource})`,
            color: COLOR,
            timestamp: ts,
            meta: { country: entityName, cc, datasource, level },
        });
    }
    return events;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "IODA (mem-cache)", count: memCache.events.length });
        }

        let events: IntelEvent[] = [];
        let source = "IODA / Georgia Tech";
        try {
            const raw = await fetchIODA();
            events = filterFreshEvents(raw, 17);
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[ioda] IODA fetch failed: ${err.message}`);
        }

        if (events.length === 0) {
            const cached = await readCachedEvents(TABLE, 3);
            if (cached && cached.events.length > 0) {
                memCache = { events: cached.events, ts: Date.now() };
                return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
            }
        }

        return res.json({ events, source, count: events.length });
    } catch (err: any) {
        console.error("[ioda] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
