/**
 * threats.ts — Threat intelligence from AbuseIPDB
 * API: https://api.abuseipdb.com/api/v2/blacklist
 * REQUIRES API KEY: ABUSEIPDB_API_KEY (free at abuseipdb.com, 1000 lookups/day)
 * Aggregates malicious IPs by country, maps to centroids.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { COUNTRY_CENTROIDS } from "../countryCentroids.js";

const router = Router();
const TABLE = "threats";
const COLOR = LAYER_COLORS.THREAT;

let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 60 * 60_000; // 60 min (conserve daily quota)

async function fetchAbuseIPDB(): Promise<IntelEvent[]> {
    const apiKey = process.env.ABUSEIPDB_API_KEY;
    if (!apiKey) {
        console.warn("[threats] No ABUSEIPDB_API_KEY set — skipping live fetch");
        return [];
    }

    const url = "https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=90&limit=200";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
            Key: apiKey,
            Accept: "application/json",
        },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`AbuseIPDB ${res.status}`);
    const data = await res.json() as any;

    // Aggregate IPs by country
    const countryCounts: Record<string, { count: number; avgScore: number; ips: string[] }> = {};
    for (const entry of data?.data || []) {
        const cc = entry.countryCode || "";
        if (!cc || !COUNTRY_CENTROIDS[cc]) continue;
        if (!countryCounts[cc]) countryCounts[cc] = { count: 0, avgScore: 0, ips: [] };
        countryCounts[cc].count++;
        countryCounts[cc].avgScore += entry.abuseConfidenceScore || 0;
        if (countryCounts[cc].ips.length < 5) {
            countryCounts[cc].ips.push(entry.ipAddress);
        }
    }

    const events: IntelEvent[] = [];
    for (const [cc, info] of Object.entries(countryCounts)) {
        const coords = COUNTRY_CENTROIDS[cc];
        if (!coords) continue;
        const [lat, lng] = coords;
        const avgScore = Math.round(info.avgScore / info.count);

        events.push({
            id: `THREAT-${cc}-${Date.now()}`,
            type: "THREAT",
            lat: lat + (Math.random() - 0.5) * 0.3,
            lng: lng + (Math.random() - 0.5) * 0.3,
            intensity: Math.min(10, Math.ceil(info.count / 5)),
            label: `${info.count} malicious IPs from ${cc} (avg confidence: ${avgScore}%)`,
            color: COLOR,
            timestamp: new Date().toISOString(),
            meta: {
                country: cc,
                ip_count: info.count,
                avg_confidence: avgScore,
                sample_ips: info.ips.join(", "),
            },
        });
    }
    return events;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "AbuseIPDB (mem-cache)", count: memCache.events.length });
        }

        let events: IntelEvent[] = [];
        let source = "AbuseIPDB";
        try {
            const raw = await fetchAbuseIPDB();
            events = filterFreshEvents(raw, 17);
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[threats] AbuseIPDB fetch failed: ${err.message}`);
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
        console.error("[threats] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
