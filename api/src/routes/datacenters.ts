/**
 * datacenters.ts — AI & Cloud Data Centers worldwide
 *
 * DB-driven: reads from Supabase `datacenters` table.
 * On first request, if the table is empty, seeds it with known facilities.
 * Subsequent requests always serve from the database.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "datacenters";
const COLOR = LAYER_COLORS.DATACENTER;

// ─── Seed data: major AI / cloud / hyperscale data centers ───
const SEED_DATA: IntelEvent[] = [
    // ── USA ──
    { id: "DC-001", type: "DATACENTER", lat: 39.0438, lng: -77.4874, intensity: 10, label: "Ashburn, VA — World's Data Center Capital", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Microsoft / Google / Meta", capacity: "2000+ MW", region: "US-East", facility: "Hyperscale Campus" } },
    { id: "DC-002", type: "DATACENTER", lat: 45.5945, lng: -121.1787, intensity: 9, label: "The Dalles, OR — Google Mega Campus", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google", capacity: "600+ MW", region: "US-West", facility: "AI Training Complex" } },
    { id: "DC-003", type: "DATACENTER", lat: 41.2619, lng: -95.8608, intensity: 7, label: "Omaha, NE — Meta AI Data Center", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Meta", capacity: "200+ MW", region: "US-Central", facility: "AI Research Campus" } },
    { id: "DC-004", type: "DATACENTER", lat: 36.0051, lng: -115.0872, intensity: 8, label: "Las Vegas, NV — Switch SuperNAP", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Switch / AWS", capacity: "500+ MW", region: "US-West", facility: "Hyperscale" } },
    { id: "DC-005", type: "DATACENTER", lat: 33.4484, lng: -112.0740, intensity: 8, label: "Phoenix, AZ — Microsoft AI Campus", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Microsoft / Apple", capacity: "400+ MW", region: "US-Southwest", facility: "AI Cloud" } },
    { id: "DC-006", type: "DATACENTER", lat: 32.7767, lng: -96.7970, intensity: 7, label: "Dallas, TX — CyrusOne / Equinix Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "CyrusOne / Equinix", capacity: "300+ MW", region: "US-South", facility: "Colocation" } },
    { id: "DC-007", type: "DATACENTER", lat: 47.6062, lng: -122.3321, intensity: 8, label: "Seattle, WA — Microsoft HQ Cloud", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Microsoft / Amazon", capacity: "350+ MW", region: "US-Northwest", facility: "Azure / AWS" } },
    { id: "DC-008", type: "DATACENTER", lat: 37.3861, lng: -122.0839, intensity: 9, label: "Santa Clara, CA — NVIDIA AI HQ", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "NVIDIA / Google", capacity: "250+ MW", region: "Silicon Valley", facility: "AI GPU Cluster" } },
    { id: "DC-009", type: "DATACENTER", lat: 41.8781, lng: -87.6298, intensity: 7, label: "Chicago, IL — Equinix / Digital Realty", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / Digital Realty", capacity: "300+ MW", region: "US-Midwest", facility: "Financial Cloud" } },
    { id: "DC-010", type: "DATACENTER", lat: 33.7490, lng: -84.3880, intensity: 6, label: "Atlanta, GA — Google / QTS Mega", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google / QTS", capacity: "200+ MW", region: "US-Southeast", facility: "Cloud Edge" } },
    { id: "DC-011", type: "DATACENTER", lat: 42.3601, lng: -71.0589, intensity: 6, label: "Boston, MA — Oracle / AWS Cloud", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Oracle / AWS", capacity: "150+ MW", region: "US-Northeast", facility: "Enterprise Cloud" } },

    // ── Europe ──
    { id: "DC-020", type: "DATACENTER", lat: 53.3498, lng: -6.2603, intensity: 9, label: "Dublin, Ireland — AWS / Microsoft / Google Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Microsoft / Google", capacity: "900+ MW", region: "EU-West", facility: "EU Hyperscale Hub" } },
    { id: "DC-021", type: "DATACENTER", lat: 52.3676, lng: 4.9041, intensity: 9, label: "Amsterdam, NL — Equinix AMS Campus", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / Interxion", capacity: "600+ MW", region: "EU-West", facility: "Internet Exchange Hub" } },
    { id: "DC-022", type: "DATACENTER", lat: 50.1109, lng: 8.6821, intensity: 8, label: "Frankfurt, DE — DE-CIX / Equinix", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / DE-CIX", capacity: "500+ MW", region: "EU-Central", facility: "Internet Exchange" } },
    { id: "DC-023", type: "DATACENTER", lat: 51.5074, lng: -0.1278, intensity: 8, label: "London, UK — Equinix LD Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / Global Switch", capacity: "500+ MW", region: "UK", facility: "LINX Hub" } },
    { id: "DC-024", type: "DATACENTER", lat: 48.8566, lng: 2.3522, intensity: 7, label: "Paris, FR — Interxion / Scaleway", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Interxion / Scaleway / OVHcloud", capacity: "300+ MW", region: "EU-West", facility: "Cloud & AI" } },
    { id: "DC-025", type: "DATACENTER", lat: 59.3293, lng: 18.0686, intensity: 7, label: "Stockholm, SE — AWS Nordic Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Ericsson", capacity: "200+ MW", region: "Nordics", facility: "Renewable-powered" } },
    { id: "DC-026", type: "DATACENTER", lat: 60.1699, lng: 24.9384, intensity: 7, label: "Helsinki, FI — Google / Equinix Nordic", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google / Equinix", capacity: "150+ MW", region: "Nordics", facility: "Edge / AI" } },
    { id: "DC-027", type: "DATACENTER", lat: 47.3769, lng: 8.5417, intensity: 7, label: "Zurich, CH — Google / IBM Research", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google / IBM", capacity: "200+ MW", region: "EU-Central", facility: "AI Research" } },
    { id: "DC-028", type: "DATACENTER", lat: 55.6761, lng: 12.5683, intensity: 6, label: "Copenhagen, DK — Apple / Meta Nordic DC", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Apple / Meta", capacity: "150+ MW", region: "Nordics", facility: "Green Energy" } },
    { id: "DC-029", type: "DATACENTER", lat: 40.4168, lng: -3.7038, intensity: 6, label: "Madrid, ES — AWS / Microsoft Iberia", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Microsoft", capacity: "200+ MW", region: "EU-South", facility: "Cloud Region" } },
    { id: "DC-030", type: "DATACENTER", lat: 45.4642, lng: 9.1900, intensity: 6, label: "Milan, IT — AWS / Equinix Mediterranean", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Equinix", capacity: "150+ MW", region: "EU-South", facility: "Cloud Region" } },
    { id: "DC-031", type: "DATACENTER", lat: 50.0755, lng: 14.4378, intensity: 5, label: "Prague, CZ — Oracle / Microsoft CE Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Oracle / Microsoft", capacity: "100+ MW", region: "EU-Central", facility: "Edge Cloud" } },
    { id: "DC-032", type: "DATACENTER", lat: 52.2297, lng: 21.0122, intensity: 5, label: "Warsaw, PL — Google / AWS East EU", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google / AWS", capacity: "100+ MW", region: "EU-East", facility: "Cloud Region" } },

    // ── Asia-Pacific ──
    { id: "DC-040", type: "DATACENTER", lat: 1.3521, lng: 103.8198, intensity: 9, label: "Singapore — Equinix / AWS APAC Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / AWS / Google", capacity: "800+ MW", region: "APAC", facility: "Hyperscale Hub" } },
    { id: "DC-041", type: "DATACENTER", lat: 35.6762, lng: 139.6503, intensity: 9, label: "Tokyo, JP — NTT / Equinix Asia Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "NTT / Equinix / AWS", capacity: "700+ MW", region: "APAC-NE", facility: "Hyperscale" } },
    { id: "DC-042", type: "DATACENTER", lat: 22.3193, lng: 114.1694, intensity: 8, label: "Hong Kong — Equinix / SUNeVision", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / SUNeVision", capacity: "500+ MW", region: "APAC", facility: "Internet Gateway" } },
    { id: "DC-043", type: "DATACENTER", lat: 37.5665, lng: 126.9780, intensity: 8, label: "Seoul, KR — Samsung / Naver AI Campus", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Samsung / Naver / AWS", capacity: "400+ MW", region: "APAC-NE", facility: "AI Cloud" } },
    { id: "DC-044", type: "DATACENTER", lat: -33.8688, lng: 151.2093, intensity: 7, label: "Sydney, AU — Equinix / AWS Oceania", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / AWS / Microsoft", capacity: "300+ MW", region: "Oceania", facility: "Cloud Region" } },
    { id: "DC-045", type: "DATACENTER", lat: 19.0760, lng: 72.8777, intensity: 8, label: "Mumbai, IN — Nxtra / AWS India Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Nxtra / AWS / Microsoft", capacity: "400+ MW", region: "South Asia", facility: "Hyperscale" } },
    { id: "DC-046", type: "DATACENTER", lat: 31.2304, lng: 121.4737, intensity: 9, label: "Shanghai, CN — Alibaba / Tencent Mega", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Alibaba / Tencent", capacity: "1000+ MW", region: "China-East", facility: "AI Hyperscale" } },
    { id: "DC-047", type: "DATACENTER", lat: 39.9042, lng: 116.4074, intensity: 9, label: "Beijing, CN — Baidu / ByteDance AI Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Baidu / ByteDance / Huawei", capacity: "800+ MW", region: "China-North", facility: "AI Training" } },
    { id: "DC-048", type: "DATACENTER", lat: 22.5431, lng: 114.0579, intensity: 8, label: "Shenzhen, CN — Huawei / Tencent South", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Huawei / Tencent", capacity: "500+ MW", region: "China-South", facility: "AI & Cloud" } },
    { id: "DC-049", type: "DATACENTER", lat: 34.6937, lng: 135.5023, intensity: 7, label: "Osaka, JP — AWS / Oracle West Japan", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Oracle", capacity: "200+ MW", region: "APAC-NE", facility: "Cloud Region" } },
    { id: "DC-050", type: "DATACENTER", lat: 13.7563, lng: 100.5018, intensity: 6, label: "Bangkok, TH — TRUE IDC / AWS SEA", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "TRUE IDC / AWS", capacity: "150+ MW", region: "ASEAN", facility: "Cloud Edge" } },
    { id: "DC-051", type: "DATACENTER", lat: 3.1390, lng: 101.6869, intensity: 7, label: "Kuala Lumpur, MY — AIMS / Microsoft SEA", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AIMS / Microsoft", capacity: "200+ MW", region: "ASEAN", facility: "Cloud Region" } },
    { id: "DC-052", type: "DATACENTER", lat: -6.2088, lng: 106.8456, intensity: 6, label: "Jakarta, ID — DCI / AWS Indonesia", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "DCI / AWS / Google", capacity: "200+ MW", region: "ASEAN", facility: "Cloud Region" } },

    // ── Middle East & Africa ──
    { id: "DC-060", type: "DATACENTER", lat: 25.2048, lng: 55.2708, intensity: 8, label: "Dubai, UAE — Khazna / Oracle AI Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Khazna / Oracle / AWS", capacity: "300+ MW", region: "Middle East", facility: "AI Cloud Hub" } },
    { id: "DC-061", type: "DATACENTER", lat: 24.7136, lng: 46.6753, intensity: 7, label: "Riyadh, SA — NEOM / Google Cloud", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "STC / Google / Oracle", capacity: "250+ MW", region: "Middle East", facility: "Vision 2030 AI" } },
    { id: "DC-062", type: "DATACENTER", lat: 32.0853, lng: 34.7818, intensity: 7, label: "Tel Aviv, IL — AWS / Azure Israel", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "AWS / Microsoft / Google", capacity: "200+ MW", region: "Middle East", facility: "AI Cloud Region" } },
    { id: "DC-063", type: "DATACENTER", lat: 25.2854, lng: 51.5310, intensity: 6, label: "Doha, QA — Ooredoo / Microsoft Gulf", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Ooredoo / Microsoft", capacity: "100+ MW", region: "Middle East", facility: "Cloud Edge" } },
    { id: "DC-064", type: "DATACENTER", lat: -33.9249, lng: 18.4241, intensity: 6, label: "Cape Town, ZA — Teraco / AWS Africa", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Teraco / AWS / Microsoft", capacity: "100+ MW", region: "Africa-South", facility: "Cloud Region" } },
    { id: "DC-065", type: "DATACENTER", lat: -26.2041, lng: 28.0473, intensity: 6, label: "Johannesburg, ZA — Teraco / Microsoft Africa", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Teraco / Microsoft", capacity: "150+ MW", region: "Africa-South", facility: "Azure Africa" } },
    { id: "DC-066", type: "DATACENTER", lat: -1.2921, lng: 36.8219, intensity: 5, label: "Nairobi, KE — IXAfrica / Google East Africa", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "IXAfrica / Google", capacity: "50+ MW", region: "Africa-East", facility: "Edge Cloud" } },
    { id: "DC-067", type: "DATACENTER", lat: 6.5244, lng: 3.3792, intensity: 5, label: "Lagos, NG — Rack Centre / Microsoft", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Rack Centre / Microsoft", capacity: "50+ MW", region: "Africa-West", facility: "Cloud Edge" } },

    // ── South America ──
    { id: "DC-070", type: "DATACENTER", lat: -23.5505, lng: -46.6333, intensity: 8, label: "São Paulo, BR — Equinix / AWS LATAM Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / AWS / Google", capacity: "400+ MW", region: "LATAM", facility: "Hyperscale Hub" } },
    { id: "DC-071", type: "DATACENTER", lat: -33.4489, lng: -70.6693, intensity: 6, label: "Santiago, CL — Google / Huawei LATAM South", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google / Huawei", capacity: "150+ MW", region: "LATAM-South", facility: "Cloud Region" } },
    { id: "DC-072", type: "DATACENTER", lat: 4.7110, lng: -74.0721, intensity: 5, label: "Bogotá, CO — Equinix / Oracle Andean", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / Oracle", capacity: "100+ MW", region: "LATAM-North", facility: "Cloud Edge" } },
    { id: "DC-073", type: "DATACENTER", lat: 19.4326, lng: -99.1332, intensity: 7, label: "Mexico City, MX — KIO / Equinix LATAM North", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "KIO / Equinix / AWS", capacity: "200+ MW", region: "LATAM-North", facility: "Cloud Region" } },
    { id: "DC-074", type: "DATACENTER", lat: -34.6037, lng: -58.3816, intensity: 6, label: "Buenos Aires, AR — Equinix / Google Argentina", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / Google", capacity: "100+ MW", region: "LATAM-South", facility: "Cloud Edge" } },

    // ── Canada ──
    { id: "DC-080", type: "DATACENTER", lat: 45.5017, lng: -73.5673, intensity: 7, label: "Montreal, CA — Google / OVHcloud AI Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Google / OVHcloud / AWS", capacity: "300+ MW", region: "Canada-East", facility: "AI Training (Hydro)" } },
    { id: "DC-081", type: "DATACENTER", lat: 43.6532, lng: -79.3832, intensity: 7, label: "Toronto, CA — Equinix / AWS Canada Central", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinix / AWS / Oracle", capacity: "250+ MW", region: "Canada-Central", facility: "Cloud Region" } },

    // ── Special / Government AI ──
    { id: "DC-090", type: "DATACENTER", lat: 40.7608, lng: -111.8910, intensity: 8, label: "Salt Lake City, UT — NSA Bumblehive", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "NSA / US Government", capacity: "Classified", region: "US-West", facility: "Intelligence Community DC" } },
    { id: "DC-091", type: "DATACENTER", lat: 55.7558, lng: 37.6173, intensity: 7, label: "Moscow, RU — Yandex / Sberbank AI", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Yandex / Sberbank", capacity: "300+ MW", region: "Russia", facility: "AI & Cloud" } },
    { id: "DC-092", type: "DATACENTER", lat: 40.1772, lng: 44.5035, intensity: 5, label: "Yerevan, AM — Armenian Data Center Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "GreenDC / Ucom", capacity: "30+ MW", region: "Caucasus", facility: "Regional Hub" } },
];

/**
 * GET /api/intel/datacenters
 * DB-first: always reads from Supabase.
 * If empty, seeds the table with initial data, then returns from DB.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        // 1. Try reading from database
        let cached = await readCachedEvents(TABLE);

        // 2. If DB is empty, seed it
        if (!cached || cached.events.length === 0) {
            console.log(`[datacenters] Table empty — seeding ${SEED_DATA.length} facilities...`);
            await upsertEvents(TABLE, SEED_DATA, "OSINT Seed Data");
            cached = await readCachedEvents(TABLE);
        }

        // 3. Serve from database
        if (cached && cached.events.length > 0) {
            return res.json({
                events: cached.events,
                source: cached.source,
                count: cached.events.length,
            });
        }

        // 4. Ultimate fallback: serve seed data directly (Supabase unreachable)
        console.warn("[datacenters] Supabase unavailable — serving seed data directly");
        return res.json({
            events: SEED_DATA,
            source: "OSINT Seed Data (no DB)",
            count: SEED_DATA.length,
        });
    } catch (err: any) {
        console.error("[datacenters] Error:", err.message);
        return res.json({
            events: SEED_DATA,
            source: "OSINT Seed Data (error fallback)",
            count: SEED_DATA.length,
        });
    }
});

export default router;
