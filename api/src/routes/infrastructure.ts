import { Router, type Request, type Response } from "express";
import { type IntelEvent } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "infrastructure";
const router = Router();

const SUBMARINE_CABLES: IntelEvent[] = [
    // === TRANSATLANTIC ===
    { id: "CAB-001", type: "INFRASTRUCTURE", lat: 50.37, lng: -4.14, intensity: 9, label: "TAT-14 ΓÇö Transatlantic (Bude, UK)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "TAT-14", capacity: "3.2 Tbps", landingPoint: "Bude, UK", endPoint: "Tuckerton, USA", lengthKm: 15428, owners: "Multiple (consortium)", status: "Active" } },
    { id: "CAB-002", type: "INFRASTRUCTURE", lat: 39.52, lng: -74.32, intensity: 9, label: "TAT-14 ΓÇö Transatlantic (Tuckerton, USA)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "TAT-14", capacity: "3.2 Tbps", landingPoint: "Tuckerton, USA", endPoint: "Bude, UK", lengthKm: 15428, status: "Active" } },
    { id: "CAB-003", type: "INFRASTRUCTURE", lat: 50.37, lng: -4.14, intensity: 10, label: "AEC-1 ΓÇö Atlantic (Bude, UK)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "AEC-1", capacity: "Tbps class", landingPoint: "Bude, UK", endPoint: "Virginia Beach, USA", lengthKm: 12800, owners: "Aqua Comms", status: "Active" } },
    { id: "CAB-004", type: "INFRASTRUCTURE", lat: 36.85, lng: -75.97, intensity: 10, label: "AEC-1 ΓÇö Atlantic (Virginia Beach, USA)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "AEC-1", capacity: "Tbps class", landingPoint: "Virginia Beach, USA", endPoint: "Bude, UK", lengthKm: 12800, status: "Active" } },
    { id: "CAB-005", type: "INFRASTRUCTURE", lat: 41.19, lng: -73.20, intensity: 9, label: "Havfrue/AEC-2 ΓÇö NY to Denmark", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "Havfrue/AEC-2", capacity: "108 Tbps", landingPoint: "Wall, NJ, USA", endPoint: "Blaabjerg, Denmark", lengthKm: 7860, owners: "Google/Aqua Comms", status: "Active" } },
    { id: "CAB-006", type: "INFRASTRUCTURE", lat: 55.72, lng: 8.13, intensity: 9, label: "Havfrue/AEC-2 ΓÇö Denmark Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "Havfrue/AEC-2", capacity: "108 Tbps", landingPoint: "Blaabjerg, Denmark", endPoint: "Wall, NJ, USA", lengthKm: 7860, status: "Active" } },
    { id: "CAB-007", type: "INFRASTRUCTURE", lat: 39.77, lng: -74.10, intensity: 10, label: "MAREA ΓÇö US to Spain (Virginia Beach)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "MAREA", capacity: "200 Tbps", landingPoint: "Virginia Beach, USA", endPoint: "Bilbao, Spain", lengthKm: 6600, owners: "Microsoft/Meta/Telxius", status: "Active" } },
    { id: "CAB-008", type: "INFRASTRUCTURE", lat: 43.26, lng: -2.93, intensity: 10, label: "MAREA ΓÇö US to Spain (Bilbao)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "MAREA", capacity: "200 Tbps", landingPoint: "Bilbao, Spain", endPoint: "Virginia Beach, USA", lengthKm: 6600, status: "Active" } },

    // === TRANSPACIFIC ===
    { id: "CAB-010", type: "INFRASTRUCTURE", lat: 34.05, lng: -118.25, intensity: 9, label: "PLCN ΓÇö Pacific Light (LA, USA)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "PLCN", capacity: "144 Tbps", landingPoint: "El Segundo, CA, USA", endPoint: "Hong Kong", lengthKm: 12800, owners: "Google/Meta", status: "Active" } },
    { id: "CAB-011", type: "INFRASTRUCTURE", lat: 22.29, lng: 114.17, intensity: 9, label: "PLCN ΓÇö Pacific Light (Hong Kong)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "PLCN", capacity: "144 Tbps", landingPoint: "Hong Kong", endPoint: "El Segundo, CA, USA", lengthKm: 12800, status: "Active" } },
    { id: "CAB-012", type: "INFRASTRUCTURE", lat: 33.77, lng: -118.19, intensity: 10, label: "FASTER ΓÇö US to Japan (Hermosa Beach)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "FASTER", capacity: "60 Tbps", landingPoint: "Hermosa Beach, CA", endPoint: "Chiba/Shima, Japan", lengthKm: 11629, owners: "Google consortium", status: "Active" } },
    { id: "CAB-013", type: "INFRASTRUCTURE", lat: 35.60, lng: 140.11, intensity: 10, label: "FASTER ΓÇö US to Japan (Chiba)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "FASTER", capacity: "60 Tbps", landingPoint: "Chiba, Japan", endPoint: "Hermosa Beach, USA", lengthKm: 11629, status: "Active" } },
    { id: "CAB-014", type: "INFRASTRUCTURE", lat: 47.61, lng: -122.33, intensity: 9, label: "JGA ΓÇö Japan-Guam-Australia (Seattle CLS)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "JGA", capacity: "36 Tbps", landingPoint: "Seattle region, USA", endPoint: "Multiple (Japan/Guam/AU)", lengthKm: 9500, owners: "Google", status: "Active" } },

    // === ASIA-MIDDLE EAST-EUROPE ===
    { id: "CAB-020", type: "INFRASTRUCTURE", lat: 31.23, lng: 121.47, intensity: 9, label: "SEA-ME-WE 5 ΓÇö Shanghai Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "SEA-ME-WE 5", capacity: "24 Tbps", landingPoint: "Shanghai, China", endPoint: "Multiple (Europe)", lengthKm: 20000, owners: "Consortium (16+)", status: "Active" } },
    { id: "CAB-021", type: "INFRASTRUCTURE", lat: 1.35, lng: 103.82, intensity: 9, label: "SEA-ME-WE 5 ΓÇö Singapore Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "SEA-ME-WE 5", capacity: "24 Tbps", landingPoint: "Singapore", endPoint: "Multiple (Europe)", lengthKm: 20000, status: "Active" } },
    { id: "CAB-022", type: "INFRASTRUCTURE", lat: 30.78, lng: 32.27, intensity: 8, label: "SEA-ME-WE 5 ΓÇö Suez Transit Point", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "SEA-ME-WE 5", capacity: "24 Tbps", landingPoint: "Suez, Egypt", endPoint: "Multiple", lengthKm: 20000, status: "Active" } },
    { id: "CAB-023", type: "INFRASTRUCTURE", lat: 43.30, lng: 5.37, intensity: 9, label: "SEA-ME-WE 5 ΓÇö Marseille Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "SEA-ME-WE 5", capacity: "24 Tbps", landingPoint: "Marseille, France", endPoint: "Multiple (Asia)", lengthKm: 20000, status: "Active" } },

    // === AFRICA ===
    { id: "CAB-030", type: "INFRASTRUCTURE", lat: 43.30, lng: 5.37, intensity: 8, label: "2Africa ΓÇö Marseille Landing (Meta)", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "2Africa", capacity: "180+ Tbps", landingPoint: "Marseille, France", endPoint: "Multiple (Africa ring)", lengthKm: 45000, owners: "Meta/MTN/others", status: "Active" } },
    { id: "CAB-031", type: "INFRASTRUCTURE", lat: -33.92, lng: 18.42, intensity: 8, label: "2Africa ΓÇö Cape Town Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "2Africa", capacity: "180+ Tbps", landingPoint: "Cape Town, South Africa", endPoint: "Multiple (Africa ring)", lengthKm: 45000, status: "Active" } },
    { id: "CAB-032", type: "INFRASTRUCTURE", lat: 5.56, lng: -0.19, intensity: 7, label: "2Africa ΓÇö Accra Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "2Africa", capacity: "180+ Tbps", landingPoint: "Accra, Ghana", endPoint: "Multiple (Africa ring)", lengthKm: 45000, status: "Active" } },
    { id: "CAB-033", type: "INFRASTRUCTURE", lat: 6.45, lng: 3.39, intensity: 7, label: "2Africa ΓÇö Lagos Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "2Africa", capacity: "180+ Tbps", landingPoint: "Lagos, Nigeria", endPoint: "Multiple (Africa ring)", lengthKm: 45000, status: "Active" } },
    { id: "CAB-034", type: "INFRASTRUCTURE", lat: -4.04, lng: 39.67, intensity: 7, label: "2Africa ΓÇö Mombasa Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "2Africa", capacity: "180+ Tbps", landingPoint: "Mombasa, Kenya", endPoint: "Multiple (Africa ring)", lengthKm: 45000, status: "Active" } },

    // === SOUTH AMERICA ===
    { id: "CAB-040", type: "INFRASTRUCTURE", lat: 36.85, lng: -75.97, intensity: 9, label: "BRUSA ΓÇö Virginia Beach to Brazil", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "BRUSA", capacity: "70+ Tbps", landingPoint: "Virginia Beach, USA", endPoint: "Fortaleza/Rio, Brazil", lengthKm: 10556, owners: "Telxius", status: "Active" } },
    { id: "CAB-041", type: "INFRASTRUCTURE", lat: -3.72, lng: -38.52, intensity: 8, label: "BRUSA ΓÇö Fortaleza, Brazil Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "BRUSA", capacity: "70+ Tbps", landingPoint: "Fortaleza, Brazil", endPoint: "Virginia Beach, USA", lengthKm: 10556, status: "Active" } },
    { id: "CAB-042", type: "INFRASTRUCTURE", lat: -22.90, lng: -43.17, intensity: 8, label: "EllaLink ΓÇö Rio to Lisbon", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "EllaLink", capacity: "72 Tbps", landingPoint: "Rio de Janeiro, Brazil", endPoint: "Sines, Portugal", lengthKm: 6200, owners: "EllaLink", status: "Active" } },
    { id: "CAB-043", type: "INFRASTRUCTURE", lat: 37.95, lng: -8.87, intensity: 8, label: "EllaLink ΓÇö Sines, Portugal Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "EllaLink", capacity: "72 Tbps", landingPoint: "Sines, Portugal", endPoint: "Rio de Janeiro, Brazil", lengthKm: 6200, status: "Active" } },

    // === ARCTIC / POLAR ===
    { id: "CAB-050", type: "INFRASTRUCTURE", lat: 70.66, lng: 23.68, intensity: 7, label: "Far North Fiber ΓÇö Hammerfest, Norway", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "Far North Fiber", capacity: "Multi-Tbps", landingPoint: "Hammerfest, Norway", endPoint: "Japan (Arctic route)", lengthKm: 14000, owners: "Far North Digital", status: "Planned/Construction" } },
    { id: "CAB-051", type: "INFRASTRUCTURE", lat: 64.15, lng: -21.94, intensity: 7, label: "IRIS ΓÇö Iceland Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "IRIS/Danice", capacity: "Multi-Tbps", landingPoint: "Reykjavik, Iceland", endPoint: "Ireland/Denmark", lengthKm: 2500, owners: "Farice", status: "Active" } },

    // === AUSTRALIA / OCEANIA ===
    { id: "CAB-060", type: "INFRASTRUCTURE", lat: -33.86, lng: 151.21, intensity: 9, label: "Japan-Guam-Australia ΓÇö Sydney Landing", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "JGA South", capacity: "36 Tbps", landingPoint: "Sydney, Australia", endPoint: "Guam/Japan", lengthKm: 9500, owners: "Google", status: "Active" } },
    { id: "CAB-061", type: "INFRASTRUCTURE", lat: 13.47, lng: 144.75, intensity: 8, label: "JGA ΓÇö Guam Hub", color: "#00BFFF", timestamp: "2026-02-20T00:00:00Z", meta: { category: "cable", cableSystem: "JGA", landingPoint: "Guam", endPoint: "Multiple", lengthKm: 9500, status: "Active" } },
];

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

// ========== CABLE ROUTES (for arc rendering) ==========
export interface CableRoute {
    id: string;
    name: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    type: "cable" | "pipeline";
    capacity?: string;
    status: string;
}

const CABLE_ROUTES: CableRoute[] = [
    // Transatlantic cables
    { id: "ROUTE-TAT14", name: "TAT-14", startLat: 50.37, startLng: -4.14, endLat: 39.52, endLng: -74.32, type: "cable", capacity: "3.2 Tbps", status: "Active" },
    { id: "ROUTE-AEC1", name: "AEC-1", startLat: 50.37, startLng: -4.14, endLat: 36.85, endLng: -75.97, type: "cable", capacity: "Tbps class", status: "Active" },
    { id: "ROUTE-HAVFRUE", name: "Havfrue/AEC-2", startLat: 55.72, startLng: 8.13, endLat: 41.19, endLng: -73.20, type: "cable", capacity: "108 Tbps", status: "Active" },
    { id: "ROUTE-MAREA", name: "MAREA", startLat: 43.26, startLng: -2.93, endLat: 39.77, endLng: -74.10, type: "cable", capacity: "200 Tbps", status: "Active" },
    { id: "ROUTE-ELLALINK", name: "EllaLink", startLat: 37.95, startLng: -8.87, endLat: -22.90, endLng: -43.17, type: "cable", capacity: "72 Tbps", status: "Active" },

    // Transpacific cables
    { id: "ROUTE-PLCN", name: "PLCN", startLat: 34.05, startLng: -118.25, endLat: 22.29, endLng: 114.17, type: "cable", capacity: "144 Tbps", status: "Active" },
    { id: "ROUTE-FASTER", name: "FASTER", startLat: 33.77, startLng: -118.19, endLat: 35.60, endLng: 140.11, type: "cable", capacity: "60 Tbps", status: "Active" },
    { id: "ROUTE-JGA-S", name: "JGA South", startLat: -33.86, startLng: 151.21, endLat: 13.47, endLng: 144.75, type: "cable", status: "Active" },
    { id: "ROUTE-JGA-N", name: "JGA North", startLat: 13.47, startLng: 144.75, endLat: 35.60, endLng: 140.11, type: "cable", status: "Active" },

    // Asia-Europe (SEA-ME-WE 5 segments)
    { id: "ROUTE-SMW5-1", name: "SEA-ME-WE 5 (SG→Suez)", startLat: 1.35, startLng: 103.82, endLat: 30.78, endLng: 32.27, type: "cable", capacity: "24 Tbps", status: "Active" },
    { id: "ROUTE-SMW5-2", name: "SEA-ME-WE 5 (Suez→France)", startLat: 30.78, startLng: 32.27, endLat: 43.30, endLng: 5.37, type: "cable", capacity: "24 Tbps", status: "Active" },
    { id: "ROUTE-SMW5-3", name: "SEA-ME-WE 5 (China→SG)", startLat: 31.23, startLng: 121.47, endLat: 1.35, endLng: 103.82, type: "cable", capacity: "24 Tbps", status: "Active" },

    // Africa (2Africa ring segments)
    { id: "ROUTE-2AFR-1", name: "2Africa (France→Ghana)", startLat: 43.30, startLng: 5.37, endLat: 5.56, endLng: -0.19, type: "cable", capacity: "180+ Tbps", status: "Active" },
    { id: "ROUTE-2AFR-2", name: "2Africa (Ghana→Nigeria)", startLat: 5.56, startLng: -0.19, endLat: 6.45, endLng: 3.39, type: "cable", capacity: "180+ Tbps", status: "Active" },
    { id: "ROUTE-2AFR-3", name: "2Africa (Nigeria→Cape Town)", startLat: 6.45, startLng: 3.39, endLat: -33.92, endLng: 18.42, type: "cable", capacity: "180+ Tbps", status: "Active" },
    { id: "ROUTE-2AFR-4", name: "2Africa (Cape Town→Kenya)", startLat: -33.92, startLng: 18.42, endLat: -4.04, endLng: 39.67, type: "cable", capacity: "180+ Tbps", status: "Active" },

    // South America
    { id: "ROUTE-BRUSA", name: "BRUSA", startLat: 36.85, startLng: -75.97, endLat: -3.72, endLng: -38.52, type: "cable", capacity: "70+ Tbps", status: "Active" },

    // Pipelines
    { id: "ROUTE-NS", name: "Nord Stream", startLat: 60.70, startLng: 28.75, endLat: 54.20, endLng: 12.10, type: "pipeline", status: "Damaged" },
    { id: "ROUTE-LANGELED", name: "Langeled", startLat: 62.70, startLng: 6.15, endLat: 53.65, endLng: 0.10, type: "pipeline", status: "Active" },
    { id: "ROUTE-TAP", name: "TAP Pipeline", startLat: 42.00, startLng: 19.85, endLat: 40.29, endLng: 18.36, type: "pipeline", status: "Active" },
    { id: "ROUTE-TURKSTREAM", name: "TurkStream", startLat: 44.59, startLng: 37.35, endLat: 41.95, endLng: 28.91, type: "pipeline", status: "Active" },
    { id: "ROUTE-DOLPHIN", name: "Dolphin Gas", startLat: 26.19, startLng: 51.56, endLat: 24.53, endLng: 54.63, type: "pipeline", status: "Active" },
    { id: "ROUTE-BALTICPIPE", name: "Baltic Pipe", startLat: 62.70, startLng: 6.15, endLat: 54.50, endLng: 14.55, type: "pipeline", status: "Active" },
];

const ALL_INFRASTRUCTURE = [...SUBMARINE_CABLES, ...UNDERSEA_PIPELINES];

router.get("/", async (_req: Request, res: Response) => {
    const cached = await readCachedEvents(TABLE);
    if (cached && cached.events.length > 0) {
        return res.json({ events: cached.events, routes: CABLE_ROUTES, source: cached.source, count: cached.events.length, routeCount: CABLE_ROUTES.length });
    }
    upsertEvents(TABLE, ALL_INFRASTRUCTURE, "Submarine Cables & Pipelines (OSINT)").catch(() => {});
    res.json({ events: ALL_INFRASTRUCTURE, routes: CABLE_ROUTES, source: "Submarine Cables & Pipelines (OSINT)", count: ALL_INFRASTRUCTURE.length, routeCount: CABLE_ROUTES.length });
});

export default router;