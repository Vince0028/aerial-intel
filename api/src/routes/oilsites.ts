/**
 * oilsites.ts — Oil fields, refineries, terminals & offshore platforms worldwide
 *
 * DB-driven: reads from Supabase `oilsites` table.
 * On first request, if the table is empty, seeds it with known facilities.
 * Subsequent requests always serve from the database.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "oilsites";
const COLOR = LAYER_COLORS.OILSITE;

// ─── Seed data: major oil & gas facilities worldwide ───
const SEED_DATA: IntelEvent[] = [
    // ══════════════════════════════════════════
    // MIDDLE EAST (largest producers)
    // ══════════════════════════════════════════
    { id: "OIL-001", type: "OILSITE", lat: 25.3548, lng: 49.9884, intensity: 10, label: "Ghawar Field, SA — World's Largest Oil Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Saudi Aramco", type: "Oil Field", production: "3.8M bbl/day", country: "Saudi Arabia" } },
    { id: "OIL-002", type: "OILSITE", lat: 28.9784, lng: 48.0800, intensity: 9, label: "Burgan Field, KW — Mega Oil Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "KOC", type: "Oil Field", production: "1.6M bbl/day", country: "Kuwait" } },
    { id: "OIL-003", type: "OILSITE", lat: 26.6400, lng: 51.5200, intensity: 8, label: "Ras Tanura, SA — World's Largest Oil Terminal", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Saudi Aramco", type: "Export Terminal", production: "6.5M bbl/day capacity", country: "Saudi Arabia" } },
    { id: "OIL-004", type: "OILSITE", lat: 30.4300, lng: 47.9600, intensity: 8, label: "Rumaila Field, IQ — Southern Iraq Mega Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "BP / PetroChina", type: "Oil Field", production: "1.5M bbl/day", country: "Iraq" } },
    { id: "OIL-005", type: "OILSITE", lat: 25.7900, lng: 55.9400, intensity: 7, label: "Jebel Ali Refinery, UAE — Major Gulf Refinery", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "ENOC", type: "Refinery", production: "210K bbl/day", country: "UAE" } },
    { id: "OIL-006", type: "OILSITE", lat: 26.2000, lng: 50.5500, intensity: 7, label: "Bahrain Petroleum, BH — BAPCO Refinery", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "BAPCO", type: "Refinery", production: "267K bbl/day", country: "Bahrain" } },
    { id: "OIL-007", type: "OILSITE", lat: 31.8000, lng: 48.7000, intensity: 8, label: "Abadan Refinery, IR — Karun River Complex", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "NIOC", type: "Refinery", production: "400K bbl/day", country: "Iran" } },
    { id: "OIL-008", type: "OILSITE", lat: 26.4200, lng: 52.1000, intensity: 9, label: "South Pars/North Dome, IR/QA — World's Largest Gas Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "NIOC / QatarEnergy", type: "Gas Field", production: "Largest natural gas field", country: "Iran/Qatar" } },
    { id: "OIL-009", type: "OILSITE", lat: 23.6000, lng: 57.5000, intensity: 6, label: "Fahud Field, OM — Oman's Key Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "PDO", type: "Oil Field", production: "350K bbl/day", country: "Oman" } },

    // ══════════════════════════════════════════
    // RUSSIA & CENTRAL ASIA
    // ══════════════════════════════════════════
    { id: "OIL-010", type: "OILSITE", lat: 61.2500, lng: 73.3833, intensity: 9, label: "Samotlor Field, RU — Largest in Russia", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Rosneft", type: "Oil Field", production: "2M+ bbl/day (peaked)", country: "Russia" } },
    { id: "OIL-011", type: "OILSITE", lat: 68.9500, lng: 76.5000, intensity: 7, label: "Vankor Field, RU — West Siberia Arctic", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Rosneft", type: "Oil Field", production: "440K bbl/day", country: "Russia" } },
    { id: "OIL-012", type: "OILSITE", lat: 56.1366, lng: 40.3966, intensity: 6, label: "Nizhny Novgorod Refinery, RU — LUKOIL", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "LUKOIL", type: "Refinery", production: "340K bbl/day", country: "Russia" } },
    { id: "OIL-013", type: "OILSITE", lat: 47.1000, lng: 51.9000, intensity: 8, label: "Tengiz Field, KZ — Caspian Sea Giant", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Tengizchevroil (Chevron)", type: "Oil Field", production: "700K bbl/day", country: "Kazakhstan" } },
    { id: "OIL-014", type: "OILSITE", lat: 40.5000, lng: 50.0000, intensity: 7, label: "Azeri-Chirag-Gunashli, AZ — Caspian Platform", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "BP-SOCAR", type: "Offshore Platform", production: "500K bbl/day", country: "Azerbaijan" } },

    // ══════════════════════════════════════════
    // NORTH AMERICA
    // ══════════════════════════════════════════
    { id: "OIL-020", type: "OILSITE", lat: 31.9686, lng: -99.9018, intensity: 9, label: "Permian Basin, TX — US Shale Oil Capital", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Various (Pioneer, Chevron, ExxonMobil)", type: "Shale Basin", production: "5.9M bbl/day", country: "USA" } },
    { id: "OIL-021", type: "OILSITE", lat: 70.2002, lng: -148.4597, intensity: 7, label: "Prudhoe Bay, AK — North Slope Alaska", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "BP / ConocoPhillips", type: "Oil Field", production: "300K bbl/day", country: "USA" } },
    { id: "OIL-022", type: "OILSITE", lat: 28.9000, lng: -89.0000, intensity: 8, label: "Gulf of Mexico Deepwater, US — Offshore Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Shell / BP / Chevron", type: "Offshore Platform", production: "1.8M bbl/day", country: "USA" } },
    { id: "OIL-023", type: "OILSITE", lat: 30.0000, lng: -93.2000, intensity: 8, label: "Port Arthur, TX — Largest US Refinery", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Motiva (Saudi Aramco)", type: "Refinery", production: "630K bbl/day", country: "USA" } },
    { id: "OIL-024", type: "OILSITE", lat: 29.7500, lng: -95.3600, intensity: 7, label: "Houston Ship Channel, TX — Refinery Row", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "ExxonMobil / Shell / Chevron", type: "Refinery Complex", production: "2M+ bbl/day combined", country: "USA" } },
    { id: "OIL-025", type: "OILSITE", lat: 48.0000, lng: -103.5000, intensity: 7, label: "Bakken Formation, ND — Shale Oil Play", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Continental / Hess / Whiting", type: "Shale Basin", production: "1.1M bbl/day", country: "USA" } },
    { id: "OIL-026", type: "OILSITE", lat: 56.7264, lng: -111.3803, intensity: 8, label: "Athabasca Oil Sands, AB — Canadian Tar Sands", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Suncor / Syncrude / CNRL", type: "Oil Sands", production: "3.1M bbl/day", country: "Canada" } },
    { id: "OIL-027", type: "OILSITE", lat: 53.9333, lng: -122.7500, intensity: 6, label: "Montney Formation, BC — Canadian Gas Play", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Ovintiv / Tourmaline", type: "Gas Field", production: "Major gas producer", country: "Canada" } },
    { id: "OIL-028", type: "OILSITE", lat: 18.0000, lng: -94.5000, intensity: 7, label: "Cantarell Complex, MX — Bay of Campeche", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Pemex", type: "Offshore Platform", production: "150K bbl/day (declining)", country: "Mexico" } },

    // ══════════════════════════════════════════
    // AFRICA
    // ══════════════════════════════════════════
    { id: "OIL-030", type: "OILSITE", lat: 4.7500, lng: 7.0000, intensity: 8, label: "Niger Delta, NG — Nigeria Oil Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Shell / TotalEnergies / ENI", type: "Oil Field Complex", production: "2M bbl/day", country: "Nigeria" } },
    { id: "OIL-031", type: "OILSITE", lat: -5.8300, lng: 12.0700, intensity: 7, label: "Cabinda, AO — Angola Offshore", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Chevron / TotalEnergies", type: "Offshore Platform", production: "1.2M bbl/day", country: "Angola" } },
    { id: "OIL-032", type: "OILSITE", lat: 32.9000, lng: 11.9800, intensity: 7, label: "Sharara Field, LY — Libya's Largest", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "NOC Libya / Repsol", type: "Oil Field", production: "300K bbl/day", country: "Libya" } },
    { id: "OIL-033", type: "OILSITE", lat: 31.6100, lng: 8.0000, intensity: 7, label: "Hassi Messaoud, DZ — Algeria Super Giant", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Sonatrach", type: "Oil Field", production: "400K bbl/day", country: "Algeria" } },
    { id: "OIL-034", type: "OILSITE", lat: -4.3000, lng: 15.3000, intensity: 5, label: "Moho-Bilondo, CG — Congo Deepwater", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "TotalEnergies", type: "Offshore Platform", production: "120K bbl/day", country: "Republic of Congo" } },
    { id: "OIL-035", type: "OILSITE", lat: -3.5000, lng: 9.5000, intensity: 5, label: "Alen Platform, GQ — Equatorial Guinea Offshore", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Noble Energy / Marathon", type: "Offshore Platform", production: "80K bbl/day", country: "Equatorial Guinea" } },

    // ══════════════════════════════════════════
    // SOUTH AMERICA
    // ══════════════════════════════════════════
    { id: "OIL-040", type: "OILSITE", lat: -22.0000, lng: -40.0000, intensity: 8, label: "Pre-Salt Basin, BR — Brazil Deepwater", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Petrobras", type: "Offshore Deepwater", production: "3.4M bbl/day", country: "Brazil" } },
    { id: "OIL-041", type: "OILSITE", lat: 10.5000, lng: -71.5000, intensity: 7, label: "Lake Maracaibo, VE — Venezuela Oil Belt", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "PDVSA", type: "Oil Field", production: "800K bbl/day", country: "Venezuela" } },
    { id: "OIL-042", type: "OILSITE", lat: 8.0000, lng: -66.0000, intensity: 8, label: "Orinoco Belt, VE — Heavy Oil Mega Reserve", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "PDVSA / Chevron", type: "Heavy Oil", production: "Largest reserves globally (300B bbl)", country: "Venezuela" } },
    { id: "OIL-043", type: "OILSITE", lat: 7.0000, lng: -58.0000, intensity: 7, label: "Stabroek Block, GY — Guyana Offshore Boom", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "ExxonMobil / Hess / CNOOC", type: "Offshore Platform", production: "600K bbl/day (growing)", country: "Guyana" } },
    { id: "OIL-044", type: "OILSITE", lat: -38.0000, lng: -68.0000, intensity: 7, label: "Vaca Muerta, AR — Argentine Shale", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "YPF / Shell / Chevron", type: "Shale Basin", production: "400K bbl/day (growing)", country: "Argentina" } },
    { id: "OIL-045", type: "OILSITE", lat: -0.3000, lng: -79.5000, intensity: 5, label: "Yasuní ITT Block, EC — Amazon Basin Oil", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Petroecuador", type: "Oil Field", production: "150K bbl/day", country: "Ecuador" } },

    // ══════════════════════════════════════════
    // NORTH SEA & EUROPE
    // ══════════════════════════════════════════
    { id: "OIL-050", type: "OILSITE", lat: 59.0000, lng: 2.0000, intensity: 7, label: "Johan Sverdrup, NO — North Sea Giant", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Equinor", type: "Offshore Platform", production: "755K bbl/day", country: "Norway" } },
    { id: "OIL-051", type: "OILSITE", lat: 57.5000, lng: 1.5000, intensity: 6, label: "Forties Field, UK — North Sea Legacy", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Apache / Harbour Energy", type: "Offshore Platform", production: "Declining (legacy field)", country: "UK" } },
    { id: "OIL-052", type: "OILSITE", lat: 51.9500, lng: 4.1200, intensity: 7, label: "Rotterdam Europoort, NL — Europe's Largest Port Refinery", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Shell / BP / ExxonMobil", type: "Refinery Complex", production: "1.2M bbl/day combined", country: "Netherlands" } },
    { id: "OIL-053", type: "OILSITE", lat: 37.9400, lng: -0.7700, intensity: 6, label: "Cartagena Refinery, ES — Repsol Spain", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Repsol", type: "Refinery", production: "220K bbl/day", country: "Spain" } },
    { id: "OIL-054", type: "OILSITE", lat: 45.4100, lng: 9.2700, intensity: 6, label: "Sarroch Refinery, IT — Saras Mediterranean", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Saras", type: "Refinery", production: "300K bbl/day", country: "Italy" } },

    // ══════════════════════════════════════════
    // ASIA-PACIFIC
    // ══════════════════════════════════════════
    { id: "OIL-060", type: "OILSITE", lat: 63.0000, lng: 75.0000, intensity: 8, label: "Priobskoye Field, RU — West Siberia Giant", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Rosneft", type: "Oil Field", production: "700K bbl/day", country: "Russia" } },
    { id: "OIL-061", type: "OILSITE", lat: 45.8000, lng: 126.5000, intensity: 7, label: "Daqing Field, CN — China's Largest Oil Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "PetroChina (CNPC)", type: "Oil Field", production: "650K bbl/day", country: "China" } },
    { id: "OIL-062", type: "OILSITE", lat: 21.7500, lng: 120.5000, intensity: 6, label: "Zhanjiang, CN — CNOOC South China Sea", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "CNOOC", type: "Offshore Platform", production: "200K bbl/day", country: "China" } },
    { id: "OIL-063", type: "OILSITE", lat: 23.0000, lng: 72.6000, intensity: 8, label: "Jamnagar Refinery, IN — World's Largest", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Reliance Industries", type: "Refinery", production: "1.36M bbl/day", country: "India" } },
    { id: "OIL-064", type: "OILSITE", lat: 1.3000, lng: 103.7000, intensity: 7, label: "Jurong Island, SG — Singapore Refinery Hub", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Shell / ExxonMobil", type: "Refinery Complex", production: "1.5M bbl/day combined", country: "Singapore" } },
    { id: "OIL-065", type: "OILSITE", lat: 35.4000, lng: 136.9000, intensity: 6, label: "Yokkaichi Refinery, JP — JXTG/ENEOS Japan", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "ENEOS", type: "Refinery", production: "255K bbl/day", country: "Japan" } },
    { id: "OIL-066", type: "OILSITE", lat: 35.5000, lng: 129.3000, intensity: 7, label: "Ulsan Refinery, KR — SK Energy South Korea", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "SK Energy", type: "Refinery", production: "840K bbl/day", country: "South Korea" } },
    { id: "OIL-067", type: "OILSITE", lat: 0.5000, lng: 117.0000, intensity: 7, label: "Mahakam Block, ID — Borneo LNG", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Pertamina / TotalEnergies", type: "LNG Field", production: "Major LNG producer", country: "Indonesia" } },
    { id: "OIL-068", type: "OILSITE", lat: -19.7500, lng: 116.1000, intensity: 6, label: "North West Shelf, AU — Australia LNG", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Woodside", type: "LNG Platform", production: "Major LNG exporter", country: "Australia" } },
    { id: "OIL-069", type: "OILSITE", lat: 20.5000, lng: 107.0000, intensity: 5, label: "Bach Ho Field, VN — Vietnam Offshore", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Vietsovpetro", type: "Offshore Platform", production: "100K bbl/day", country: "Vietnam" } },
    { id: "OIL-070", type: "OILSITE", lat: 5.3000, lng: 114.8000, intensity: 5, label: "Seria Field, BN — Brunei Legacy Field", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Brunei Shell Petroleum", type: "Oil Field", production: "100K bbl/day", country: "Brunei" } },

    // ══════════════════════════════════════════
    // STRATEGIC CHOKEPOINTS & TERMINALS
    // ══════════════════════════════════════════
    { id: "OIL-080", type: "OILSITE", lat: 26.5600, lng: 56.2500, intensity: 9, label: "Strait of Hormuz — 21% of Global Oil Transit", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "International Waters", type: "Chokepoint", production: "21M bbl/day transit", country: "International" } },
    { id: "OIL-081", type: "OILSITE", lat: 30.4500, lng: 32.3500, intensity: 8, label: "Suez Canal/SUMED, EG — Oil Transit Corridor", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Suez Canal Authority", type: "Chokepoint", production: "5.5M bbl/day transit", country: "Egypt" } },
    { id: "OIL-082", type: "OILSITE", lat: 12.5000, lng: 43.3000, intensity: 7, label: "Bab el-Mandeb Strait — Red Sea Chokepoint", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "International Waters", type: "Chokepoint", production: "4.8M bbl/day transit", country: "International" } },
    { id: "OIL-083", type: "OILSITE", lat: 1.2000, lng: 103.8000, intensity: 8, label: "Strait of Malacca — Asia Oil Gateway", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "International Waters", type: "Chokepoint", production: "16M bbl/day transit", country: "International" } },
    { id: "OIL-084", type: "OILSITE", lat: -6.0000, lng: -35.0000, intensity: 5, label: "FPSO Carioca, BR — Pre-Salt Santos Basin", color: COLOR, timestamp: new Date().toISOString(), meta: { operator: "Petrobras", type: "FPSO Platform", production: "180K bbl/day", country: "Brazil" } },
];

/**
 * GET /api/intel/oilsites
 * DB-first: always reads from Supabase.
 * If empty, seeds the table with initial data, then returns from DB.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        // 1. Try reading from database
        let cached = await readCachedEvents(TABLE);

        // 2. If DB is empty, seed it
        if (!cached || cached.events.length === 0) {
            console.log(`[oilsites] Table empty — seeding ${SEED_DATA.length} facilities...`);
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
        console.warn("[oilsites] Supabase unavailable — serving seed data directly");
        return res.json({
            events: SEED_DATA,
            source: "OSINT Seed Data (no DB)",
            count: SEED_DATA.length,
        });
    } catch (err: any) {
        console.error("[oilsites] Error:", err.message);
        return res.json({
            events: SEED_DATA,
            source: "OSINT Seed Data (error fallback)",
            count: SEED_DATA.length,
        });
    }
});

export default router;
