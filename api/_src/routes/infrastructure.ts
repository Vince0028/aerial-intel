import { Router, type Request, type Response } from "express";
import { type IntelEvent } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { getSupabase } from "../supabaseClient.js";

const TABLE = "infrastructure";
const CABLE_TABLE = "submarine_cables";
const router = Router();

// ========== Geometry simplification (Douglas-Peucker) ==========
function perpendicularDist(pt: number[], a: number[], b: number[]): number {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((pt[0] - a[0]) ** 2 + (pt[1] - a[1]) ** 2);
    const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / lenSq));
    const px = a[0] + t * dx, py = a[1] + t * dy;
    return Math.sqrt((pt[0] - px) ** 2 + (pt[1] - py) ** 2);
}

function simplifyLine(coords: number[][], epsilon: number): number[][] {
    if (coords.length <= 2) return coords;
    let maxDist = 0, maxIdx = 0;
    for (let i = 1; i < coords.length - 1; i++) {
        const d = perpendicularDist(coords[i], coords[0], coords[coords.length - 1]);
        if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon) {
        const left = simplifyLine(coords.slice(0, maxIdx + 1), epsilon);
        const right = simplifyLine(coords.slice(maxIdx), epsilon);
        return left.slice(0, -1).concat(right);
    }
    return [coords[0], coords[coords.length - 1]];
}

// ========== Cable DB interface ==========
interface CablePathData {
    coords: [number, number][];
    name: string;
    color: string;
    length?: string;
    rfs?: string;
    owners?: string;
    url?: string;
}

interface CableRow {
    id: string;
    name: string;
    color: string;
    coords: [number, number][];
    length_km: string | null;
    rfs: string | null;
    owners: string | null;
    url: string | null;
}

// In-memory cache (avoids re-reading DB on every request within same invocation)
let memCache: CablePathData[] | null = null;
let memCacheTime = 0;
const MEM_TTL = 10 * 60 * 1000; // 10 min in-memory

/** Read cables from Supabase */
async function readCablesFromDB(): Promise<CablePathData[] | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
        const { data, error } = await sb
            .from(CABLE_TABLE)
            .select("name, color, coords, length_km, rfs, owners, url");
        if (error) { console.error("[cables] DB read:", error.message); return null; }
        if (!data || data.length === 0) return null;
        return (data as CableRow[]).map(r => ({
            coords: r.coords,
            name: r.name,
            color: r.color,
            length: r.length_km ?? undefined,
            rfs: r.rfs ?? undefined,
            owners: r.owners ?? undefined,
            url: r.url ?? undefined,
        }));
    } catch (e: any) { console.error("[cables] DB read:", e.message); return null; }
}

/** Fetch from TeleGeography, simplify, and upsert into Supabase */
async function seedCablesFromTeleGeography(): Promise<CablePathData[]> {
    const res = await fetch("https://www.submarinecablemap.com/api/v3/cable/cable-geo.json");
    if (!res.ok) throw new Error(`TeleGeography API: ${res.status}`);
    const geo = await res.json() as {
        features: {
            geometry: { coordinates: number[][][] };
            properties: { name: string; color: string; length?: string; rfs?: string; owners?: string; url?: string };
        }[];
    };

    const rows: CableRow[] = [];
    const paths: CablePathData[] = [];
    let segIdx = 0;

    for (const feat of geo.features) {
        const props = feat.properties;
        for (const rawCoords of feat.geometry.coordinates) {
            // Douglas-Peucker simplification — epsilon 0.15° ≈ ~17 km
            // Keeps cable shape accurate while massively reducing point count
            const simplified = simplifyLine(rawCoords, 0.15) as [number, number][];
            const slug = props.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
            const id = `cable-${slug}-${segIdx++}`;
            rows.push({
                id,
                name: props.name,
                color: props.color || "#00BFFF",
                coords: simplified,
                length_km: props.length ?? null,
                rfs: props.rfs ?? null,
                owners: props.owners ?? null,
                url: props.url ?? null,
            });
            paths.push({
                coords: simplified,
                name: props.name,
                color: props.color || "#00BFFF",
                length: props.length,
                rfs: props.rfs,
                owners: props.owners,
                url: props.url,
            });
        }
    }

    // Upsert into Supabase in batches of 200
    const sb = getSupabase();
    if (sb) {
        try {
            // Clear old data
            await sb.from(CABLE_TABLE).delete().neq("id", "__never__");
            for (let i = 0; i < rows.length; i += 200) {
                const batch = rows.slice(i, i + 200);
                const { error } = await sb.from(CABLE_TABLE).upsert(batch, { onConflict: "id" });
                if (error) console.error(`[cables] upsert batch ${i}:`, error.message);
            }
            console.log(`[cables] Seeded ${rows.length} cable segments into Supabase`);
        } catch (e: any) {
            console.error("[cables] DB seed:", e.message);
        }
    }

    return paths;
}

/** Get all cable paths — reads DB first, seeds from TeleGeography if empty */
async function fetchCablePaths(): Promise<CablePathData[]> {
    // In-memory cache
    if (memCache && Date.now() - memCacheTime < MEM_TTL) return memCache;

    // Try DB first
    const fromDB = await readCablesFromDB();
    if (fromDB && fromDB.length > 100) {
        memCache = fromDB;
        memCacheTime = Date.now();
        console.log(`[cables] Loaded ${fromDB.length} cable segments from Supabase`);
        return fromDB;
    }

    // DB empty → seed from TeleGeography
    try {
        const paths = await seedCablesFromTeleGeography();
        memCache = paths;
        memCacheTime = Date.now();
        return paths;
    } catch (err: any) {
        console.error("[cables] TeleGeography fetch failed:", err.message);
        return memCache || [];
    }
}

// ========== UNDERSEA PIPELINES ==========
const UNDERSEA_PIPELINES: IntelEvent[] = [
    // === EUROPE ΓÇö ENERGY ===
    { id: "PIPE-001", type: "INFRASTRUCTURE", lat: 54.20, lng: 12.10, intensity: 9, label: "Nord Stream ΓÇö Greifswald, Germany", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Nord Stream 1 & 2", product: "Natural Gas", landingPoint: "Greifswald, Germany", endPoint: "Vyborg, Russia", lengthKm: 1224, operator: "Nord Stream AG", status: "Damaged/Inactive (sabotage 2022)" } },
    { id: "PIPE-002", type: "INFRASTRUCTURE", lat: 60.70, lng: 28.75, intensity: 9, label: "Nord Stream ΓÇö Vyborg, Russia", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Nord Stream 1 & 2", product: "Natural Gas", landingPoint: "Vyborg, Russia", endPoint: "Greifswald, Germany", lengthKm: 1224, status: "Damaged/Inactive" } },
    { id: "PIPE-003", type: "INFRASTRUCTURE", lat: 58.58, lng: 1.72, intensity: 8, label: "Langeled Pipeline ΓÇö North Sea Gas", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Langeled", product: "Natural Gas", landingPoint: "Nyhamna, Norway ΓåÆ Easington, UK", endPoint: "UK", lengthKm: 1166, operator: "Gassco", status: "Active" } },
    { id: "PIPE-004", type: "INFRASTRUCTURE", lat: 60.68, lng: 5.62, intensity: 8, label: "Norpipe ΓÇö Norway to UK Gas", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Norpipe", product: "Natural Gas", landingPoint: "Ekofisk, Norway", endPoint: "Emden, Germany", lengthKm: 354, operator: "Gassco", status: "Active" } },
    { id: "PIPE-005", type: "INFRASTRUCTURE", lat: 42.00, lng: 19.85, intensity: 8, label: "TAP ΓÇö Trans Adriatic Pipeline (Albania)", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "TAP", product: "Natural Gas", landingPoint: "Fier, Albania", endPoint: "San Foca, Italy", lengthKm: 878, operator: "TAP AG", status: "Active" } },
    { id: "PIPE-006", type: "INFRASTRUCTURE", lat: 40.29, lng: 18.36, intensity: 8, label: "TAP ΓÇö Trans Adriatic Pipeline (Italy)", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "TAP", product: "Natural Gas", landingPoint: "San Foca, Italy", endPoint: "Fier, Albania", lengthKm: 878, status: "Active" } },
    { id: "PIPE-007", type: "INFRASTRUCTURE", lat: 59.30, lng: 17.96, intensity: 9, label: "Baltic Pipe ΓÇö Poland-Denmark-Norway Gas", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Baltic Pipe", product: "Natural Gas", landingPoint: "Multiple (Baltic Sea)", endPoint: "Poland", lengthKm: 900, operator: "Energinet/GAZ-SYSTEM", status: "Active" } },

    // === MIDDLE EAST ===
    { id: "PIPE-010", type: "INFRASTRUCTURE", lat: 26.19, lng: 51.56, intensity: 8, label: "Dolphin Gas Pipeline ΓÇö Qatar to UAE", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Dolphin", product: "Natural Gas", landingPoint: "Ras Laffan, Qatar", endPoint: "Taweelah, UAE", lengthKm: 364, operator: "Dolphin Energy", status: "Active" } },
    { id: "PIPE-011", type: "INFRASTRUCTURE", lat: 24.53, lng: 54.63, intensity: 8, label: "Dolphin Gas ΓÇö UAE Landing", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Dolphin", product: "Natural Gas", landingPoint: "Taweelah, UAE", endPoint: "Ras Laffan, Qatar", lengthKm: 364, status: "Active" } },
    { id: "PIPE-012", type: "INFRASTRUCTURE", lat: 31.79, lng: 34.63, intensity: 7, label: "EastMed Gas Pipeline ΓÇö Israel Hub", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "EastMed", product: "Natural Gas", landingPoint: "Ashkelon, Israel", endPoint: "Greece/Italy", lengthKm: 1900, status: "Proposed" } },

    // === RUSSIA ===
    { id: "PIPE-015", type: "INFRASTRUCTURE", lat: 41.68, lng: 41.64, intensity: 8, label: "TurkStream Gas ΓÇö Anapa to Istanbul", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "TurkStream", product: "Natural Gas", landingPoint: "Anapa, Russia", endPoint: "K─▒y─▒k├╢y, Turkey", lengthKm: 930, operator: "Gazprom/Bota┼ƒ", status: "Active" } },
    { id: "PIPE-016", type: "INFRASTRUCTURE", lat: 41.95, lng: 28.91, intensity: 8, label: "TurkStream ΓÇö Turkey Landing", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "TurkStream", product: "Natural Gas", landingPoint: "K─▒y─▒k├╢y, Turkey", endPoint: "Anapa, Russia", lengthKm: 930, status: "Active" } },

    // === ASIA ===
    { id: "PIPE-020", type: "INFRASTRUCTURE", lat: 20.60, lng: 110.33, intensity: 7, label: "South China Sea Gas ΓÇö Hainan Hub", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "SCS Gas", product: "Natural Gas / Oil", landingPoint: "Hainan, China", endPoint: "Multiple offshore", lengthKm: 500, operator: "CNOOC", status: "Active" } },
    { id: "PIPE-021", type: "INFRASTRUCTURE", lat: 1.35, lng: 104.02, intensity: 7, label: "Trans-ASEAN Gas Pipeline ΓÇö Singapore", color: "#FF8C00", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "TAGP", product: "Natural Gas", landingPoint: "Singapore", endPoint: "Malaysia/Indonesia", lengthKm: 4500, status: "Partially Active" } },

    // === STRATEGICALLY CRITICAL CHOKE POINTS ===
    { id: "PIPE-030", type: "INFRASTRUCTURE", lat: 30.45, lng: 32.35, intensity: 10, label: "Suez Canal Area ΓÇö Cable/Pipe Corridor", color: "#FF4500", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Suez Corridor", product: "Multiple cables + pipes", landingPoint: "Suez, Egypt", endPoint: "Multiple", note: "Critical chokepoint ΓÇö 15+ submarine cables transit here", status: "Strategic" } },
    { id: "PIPE-031", type: "INFRASTRUCTURE", lat: 12.58, lng: 43.15, intensity: 9, label: "Bab el-Mandeb Strait ΓÇö Cable Corridor", color: "#FF4500", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Bab el-Mandeb", product: "Submarine cables", landingPoint: "Djibouti", endPoint: "Yemen side", note: "17+ submarine cables transit ΓÇö Houthi threat zone", status: "Strategic/At Risk" } },
    { id: "PIPE-032", type: "INFRASTRUCTURE", lat: 1.27, lng: 103.85, intensity: 9, label: "Strait of Malacca ΓÇö Cable/Pipe Corridor", color: "#FF4500", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Malacca Corridor", product: "Submarine cables + gas pipes", landingPoint: "Singapore", endPoint: "Multiple", note: "Major undersea infrastructure choke point", status: "Strategic" } },
    { id: "PIPE-033", type: "INFRASTRUCTURE", lat: 36.00, lng: -5.60, intensity: 8, label: "Strait of Gibraltar ΓÇö Cable Corridor", color: "#FF4500", timestamp: "2026-02-20T00:00:00Z", meta: { category: "pipeline", pipelineSystem: "Gibraltar", product: "Submarine cables + gas", landingPoint: "Multiple", endPoint: "Multiple", note: "EU-Africa cable/pipe corridor", status: "Strategic" } },
];

// ========== PIPELINE ROUTES (for arc rendering — pipelines only) ==========
export interface PipelineRoute {
    id: string;
    name: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    type: "pipeline";
    status: string;
}

const PIPELINE_ROUTES: PipelineRoute[] = [
    { id: "ROUTE-NS", name: "Nord Stream", startLat: 60.70, startLng: 28.75, endLat: 54.20, endLng: 12.10, type: "pipeline", status: "Damaged" },
    { id: "ROUTE-LANGELED", name: "Langeled", startLat: 62.70, startLng: 6.15, endLat: 53.65, endLng: 0.10, type: "pipeline", status: "Active" },
    { id: "ROUTE-TAP", name: "TAP Pipeline", startLat: 42.00, startLng: 19.85, endLat: 40.29, endLng: 18.36, type: "pipeline", status: "Active" },
    { id: "ROUTE-TURKSTREAM", name: "TurkStream", startLat: 44.59, startLng: 37.35, endLat: 41.95, endLng: 28.91, type: "pipeline", status: "Active" },
    { id: "ROUTE-DOLPHIN", name: "Dolphin Gas", startLat: 26.19, startLng: 51.56, endLat: 24.53, endLng: 54.63, type: "pipeline", status: "Active" },
    { id: "ROUTE-BALTICPIPE", name: "Baltic Pipe", startLat: 62.70, startLng: 6.15, endLat: 54.50, endLng: 14.55, type: "pipeline", status: "Active" },
];

router.get("/", async (_req: Request, res: Response) => {
    // Fetch real submarine cable paths from TeleGeography (cached 6h in-memory)
    const cablePaths = await fetchCablePaths();

    // Pipeline point events → Supabase cache
    const cached = await readCachedEvents(TABLE);
    const events = cached && cached.events.length > 0
        ? cached.events
        : UNDERSEA_PIPELINES;

    if (!cached || cached.events.length === 0) {
        upsertEvents(TABLE, UNDERSEA_PIPELINES, "Undersea Pipelines (OSINT)").catch(() => {});
    }

    res.json({
        events,
        routes: PIPELINE_ROUTES,
        cablePaths,
        source: "Submarine Cables (TeleGeography) & Pipelines (OSINT)",
        count: events.length,
        cableCount: cablePaths.length,
        routeCount: PIPELINE_ROUTES.length,
    });
});

export default router;