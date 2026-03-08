import { Router, type Request, type Response } from "express";
import WebSocket from "ws";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "naval";
const router = Router();

/**
 * Known military vessel positions (submarines/carriers don't broadcast AIS).
 * Merged on top of live data — always shown.
 */
const MILITARY_SEED: IntelEvent[] = [
    { id: "CSG-1", type: "NAVAL", lat: 14.8, lng: 120.3, intensity: 10, label: "CSG RONALD REAGAN — Subic Bay AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "7th Fleet" } },
    { id: "CSG-3", type: "NAVAL", lat: 21.35, lng: -157.95, intensity: 10, label: "CSG PEARL HARBOR — Pacific Patrol", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "3rd Fleet" } },
    { id: "CSG-5", type: "NAVAL", lat: 36.85, lng: -76.30, intensity: 10, label: "CSG NORFOLK — Atlantic Fleet", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "2nd Fleet" } },
    { id: "DDG-1", type: "NAVAL", lat: 26.23, lng: 50.59, intensity: 7, label: "DDG BAHRAIN PATROL — 5th Fleet AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "destroyer", fleet: "5th Fleet" } },
    { id: "DDG-2", type: "NAVAL", lat: 12.11, lng: 43.15, intensity: 7, label: "DDG DJIBOUTI — Horn of Africa", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "destroyer", fleet: "CJTF-HOA" } },
    { id: "SSN-1", type: "NAVAL", lat: 68.0, lng: 33.0, intensity: 8, label: "SSN ARCTIC PATROL — Northern Fleet AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "submarine", classification: "SSN" } },
    { id: "SSN-2", type: "NAVAL", lat: 20.0, lng: 135.0, intensity: 8, label: "SSN PACIFIC DEEP — 7th Fleet AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "submarine", classification: "SSBN" } },
];

/* ─── AISStream WebSocket (primary — requires key) ───────────────── */

function fetchAISStream(apiKey: string): Promise<IntelEvent[]> {
    return new Promise((resolve) => {
        const ws = new WebSocket("wss://stream.aisstream.io/v0/stream", { handshakeTimeout: 6000 });
        const seen = new Map<number, IntelEvent>();
        let resolved = false;
        let timer: ReturnType<typeof setTimeout>;

        const done = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            try { ws.close(); } catch {}
            resolve(Array.from(seen.values()).slice(0, 60));
        };

        timer = setTimeout(done, 8000);

        ws.on("open", () => {
            console.log("[naval] AISStream connected");
            ws.send(JSON.stringify({
                Apikey: apiKey,
                BoundingBoxes: [
                    [[0,  100], [25, 125]],   // South China Sea
                    [[22,  48], [30,  60]],   // Persian Gulf
                    [[10,  40], [25,  55]],   // Red Sea
                    [[30,  -5], [46,  40]],   // Mediterranean
                    [[50, -10], [65,  15]],   // North Sea / NATO
                    [[-5,  95], [15, 110]],   // Malacca
                ],
                FilterMessageTypes: ["PositionReport"],
            }));
        });

        ws.on("message", (raw: Buffer) => {
            try {
                const msg = JSON.parse(raw.toString()) as any;
                if (msg.error) { console.warn("[naval] AISStream error msg:", msg.error); return done(); }
                if (seen.size === 0) console.log("[naval] First AIS msg:", msg.MessageType);
                if (msg.MessageType !== "PositionReport") return;

                const meta = msg.MetaData || {};
                const pos = msg.Message?.PositionReport || {};
                const mmsi: number = meta.MMSI;
                if (!mmsi || !meta.latitude || !meta.longitude) return;

                const name = (meta.ShipName || `VESSEL-${mmsi}`).trim();
                const sog = pos.Sog || 0;
                const cog = pos.Cog || 0;

                seen.set(mmsi, {
                    id: `AIS-${mmsi}`,
                    type: "NAVAL",
                    lat: meta.latitude,
                    lng: meta.longitude,
                    intensity: Math.min(10, Math.max(1, Math.round(sog / 3) + 2)),
                    label: `${name} | SOG ${sog.toFixed(1)}kn | HDG ${Math.round(cog)}°`,
                    color: LAYER_COLORS.NAVAL,
                    timestamp: meta.time_utc || new Date().toISOString(),
                    meta: { source: "AISStream", mmsi, sog, cog },
                });

                if (seen.size >= 60) done();
            } catch {}
        });

        ws.on("error", (err) => { console.warn("[naval] AISStream WS error:", err.message); done(); });
        ws.on("close", () => done());
    });
}

/* ─── Digitraffic REST fallback (free, no key, Finnish Maritime Auth) ─ */

async function fetchDigitraffic(): Promise<IntelEvent[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        // Use the 'from' parameter to only get positions updated in the last 60 min
        const fromMs = Date.now() - 60 * 60 * 1000;
        const url = `https://meri.digitraffic.fi/api/ais/v1/locations?from=${fromMs}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Digitraffic ${res.status}`);

        const data = await res.json() as any;
        const features: any[] = data.features || [];

        const cutoff = Date.now() - 2 * 60 * 60 * 1000; // max 2h old

        return features
            .filter((f: any) => {
                if (!f.geometry?.coordinates?.[0] || !f.geometry?.coordinates?.[1]) return false;
                const p = f.properties || {};
                const sog = (p.sog ?? 0) / 10; // Digitraffic sends in 1/10 kn

                // Filter: must be underway (> 2 kn) — excludes anchored/docked/drifting
                if (sog < 2) return false;

                // Filter: must have recent timestamp
                const ts = p.timestampExternal ? new Date(p.timestampExternal).getTime() : 0;
                if (ts < cutoff) return false;

                return true;
            })
            .slice(0, 80)
            .map((f: any) => {
                const [lng, lat] = f.geometry.coordinates;
                const p = f.properties || {};
                const sog = (p.sog ?? 0) / 10;
                const cog = (p.cog ?? 0) / 10;
                const mmsi = p.mmsi || 0;
                const name = p.name || `VESSEL-${mmsi}`;
                const navStat = p.navStat ?? -1;

                return {
                    id: `DT-${mmsi}`,
                    type: "NAVAL" as const,
                    lat,
                    lng,
                    intensity: Math.min(10, Math.max(1, Math.round(sog / 3) + 2)),
                    label: `${name} | SOG ${sog.toFixed(1)}kn | HDG ${Math.round(cog)}°`,
                    color: LAYER_COLORS.NAVAL,
                    timestamp: p.timestampExternal
                        ? new Date(p.timestampExternal).toISOString()
                        : new Date().toISOString(),
                    meta: { source: "Digitraffic", mmsi, sog, cog, navStat },
                };
            });
    } catch (err: any) {
        clearTimeout(timeout);
        console.error("[naval] Digitraffic error:", err.message);
        return [];
    }
}

/* ─── Route handler ─────────────────────────────────────────────── */

/**
 * GET /api/intel/naval
 * Chain: AISStream WS → Digitraffic REST → Supabase cache → military seed
 */
router.get("/", async (_req: Request, res: Response) => {
    let liveVessels: IntelEvent[] = [];
    let sourceLabel = "";

    // 1) Try AISStream (WebSocket)
    const aisKey = process.env.AISSTREAM_API_KEY;
    if (aisKey) {
        liveVessels = await fetchAISStream(aisKey);
        if (liveVessels.length > 0) sourceLabel = "AISStream";
    }

    // 2) If AISStream returned nothing, try Digitraffic REST (free, no key)
    if (liveVessels.length === 0) {
        console.log("[naval] AISStream empty — trying Digitraffic REST fallback");
        liveVessels = await fetchDigitraffic();
        if (liveVessels.length > 0) sourceLabel = "Digitraffic (Finnish Maritime)";
    }

    // 3) Merge with military seed
    if (liveVessels.length > 0) {
        const events = [...MILITARY_SEED, ...liveVessels];
        const src = sourceLabel + " + Military Intel";
        upsertEvents(TABLE, events, src).catch(() => {});
        return res.json({ events, source: src, count: events.length });
    }

    // 4) Supabase cache fallback
    const cached = await readCachedEvents(TABLE, 6);
    if (cached && cached.events.length > 0) {
        return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
    }

    // 5) Last resort: static military data
    upsertEvents(TABLE, MILITARY_SEED, "Military Intel (static)").catch(() => {});
    res.json({ events: MILITARY_SEED, source: "Military Intel (static)", count: MILITARY_SEED.length });
});

export default router;
