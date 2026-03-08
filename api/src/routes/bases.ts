import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "bases";
const router = Router();

/**
 * GET /api/intel/bases
 * Static JSON of known military installations worldwide.
 * Seeds Supabase on first call, then serves from DB.
 */

const MILITARY_BASES: IntelEvent[] = [
    // ========== USA — MAJOR INSTALLATIONS ==========
    { id: "BASE-001", type: "BASE", lat: 38.87, lng: -77.06, intensity: 10, label: "PENTAGON — Joint Command HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "USA", operator: "DoD" } },
    { id: "BASE-010", type: "BASE", lat: 21.35, lng: -157.95, intensity: 9, label: "PEARL HARBOR — INDOPACOM HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "USA", operator: "USN" } },
    { id: "BASE-011", type: "BASE", lat: 36.85, lng: -76.30, intensity: 9, label: "NORFOLK NAVAL STATION — Largest Naval Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "USA", operator: "USN" } },
    { id: "BASE-012", type: "BASE", lat: 32.72, lng: -117.16, intensity: 9, label: "SAN DIEGO NAVAL BASE — Pacific Fleet", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "USA", operator: "USN" } },
    { id: "BASE-013", type: "BASE", lat: 28.23, lng: -80.61, intensity: 9, label: "CAPE CANAVERAL SFS — Space Launch", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "spaceforce", country: "USA", operator: "USSF" } },
    { id: "BASE-014", type: "BASE", lat: 38.95, lng: -104.86, intensity: 9, label: "PETERSON SFB — NORTHCOM/SPACECOM HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "spaceforce", country: "USA", operator: "USSF" } },
    { id: "BASE-015", type: "BASE", lat: 35.04, lng: -106.60, intensity: 8, label: "KIRTLAND AFB — Nuclear Weapons Storage", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "USA", operator: "USAF" } },
    { id: "BASE-016", type: "BASE", lat: 30.43, lng: -86.69, intensity: 8, label: "EGLIN AFB — Armament Testing", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "USA", operator: "USAF" } },
    { id: "BASE-017", type: "BASE", lat: 39.11, lng: -121.44, intensity: 8, label: "BEALE AFB — U-2/Global Hawk ISR", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "USA", operator: "USAF" } },
    { id: "BASE-018", type: "BASE", lat: 35.26, lng: -116.05, intensity: 8, label: "FORT IRWIN — National Training Center", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "USA", operator: "US Army" } },
    { id: "BASE-019", type: "BASE", lat: 47.12, lng: -122.55, intensity: 8, label: "JBLM — Joint Base Lewis-McChord", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "USA", operator: "US Army" } },
    { id: "BASE-020", type: "BASE", lat: 39.01, lng: -76.56, intensity: 9, label: "NSA HQ — Fort Meade SIGINT Center", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "USA", operator: "NSA/CYBERCOM" } },

    // ========== USA OVERSEAS ==========
    { id: "BASE-003", type: "BASE", lat: 49.44, lng: 7.60, intensity: 8, label: "RAMSTEIN AB — USAFE/NATO HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Germany", operator: "USAF" } },
    { id: "BASE-004", type: "BASE", lat: 35.29, lng: 139.65, intensity: 9, label: "YOKOSUKA NAVAL BASE — 7th Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Japan", operator: "USN" } },
    { id: "BASE-005", type: "BASE", lat: 26.23, lng: 50.59, intensity: 8, label: "NSA BAHRAIN — 5th Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Bahrain", operator: "USN" } },
    { id: "BASE-006", type: "BASE", lat: 11.55, lng: 43.15, intensity: 7, label: "CAMP LEMONNIER — AFRICOM Forward", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Djibouti", operator: "AFRICOM" } },
    { id: "BASE-008", type: "BASE", lat: 24.25, lng: 54.55, intensity: 8, label: "AL DHAFRA AB — USAF Forward", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "UAE", operator: "USAF" } },
    { id: "BASE-021", type: "BASE", lat: 25.41, lng: 51.50, intensity: 8, label: "AL UDEID AB — CENTCOM Forward HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Qatar", operator: "USAF" } },
    { id: "BASE-022", type: "BASE", lat: 26.56, lng: 127.77, intensity: 8, label: "KADENA AB — USAF Pacific (Okinawa)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Japan", operator: "USAF" } },
    { id: "BASE-023", type: "BASE", lat: 36.96, lng: 127.03, intensity: 8, label: "CAMP HUMPHREYS — USFK HQ (Korea)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "South Korea", operator: "US Army" } },
    { id: "BASE-024", type: "BASE", lat: 35.75, lng: 126.81, intensity: 8, label: "KUNSAN AB — USAF Korea", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "South Korea", operator: "USAF" } },
    { id: "BASE-025", type: "BASE", lat: 13.47, lng: 144.80, intensity: 8, label: "ANDERSEN AFB — B-2/B-52 Pacific Hub (Guam)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Guam/USA", operator: "USAF" } },
    { id: "BASE-026", type: "BASE", lat: 37.40, lng: -5.88, intensity: 7, label: "MORÓN AB — USMC SPMAGTF (Spain)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "marines", country: "Spain", operator: "USMC" } },
    { id: "BASE-027", type: "BASE", lat: 36.62, lng: -6.35, intensity: 7, label: "ROTA NAVAL STATION — Aegis Ashore (Spain)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Spain", operator: "USN" } },
    { id: "BASE-028", type: "BASE", lat: 39.14, lng: -67.96, intensity: 7, label: "DEVESELU — Aegis Ashore BMD (Romania)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Romania", operator: "USN" } },
    { id: "BASE-029", type: "BASE", lat: 40.92, lng: 14.08, intensity: 7, label: "NSA NAPLES — 6th Fleet HQ (Italy)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Italy", operator: "USN" } },
    { id: "BASE-030", type: "BASE", lat: 37.05, lng: -8.27, intensity: 7, label: "LAJES FIELD — Mid-Atlantic Hub (Azores)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Portugal", operator: "USAF" } },
    { id: "BASE-031", type: "BASE", lat: 39.01, lng: 35.43, intensity: 7, label: "INCIRLIK AB — USAF Forward (Turkey)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Turkey", operator: "USAF" } },
    { id: "BASE-032", type: "BASE", lat: -7.31, lng: 72.41, intensity: 7, label: "DIEGO GARCIA — BIOT/Indian Ocean Hub", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "BIOT/UK", operator: "USN/RAF" } },

    // ========== UNITED KINGDOM ==========
    { id: "BASE-002", type: "BASE", lat: 51.12, lng: -1.79, intensity: 6, label: "SALISBURY PLAIN — British Army Training", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "UK", operator: "British Army" } },
    { id: "BASE-009", type: "BASE", lat: 36.14, lng: -5.35, intensity: 6, label: "GIBRALTAR — Royal Navy Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "UK", operator: "Royal Navy" } },
    { id: "BASE-040", type: "BASE", lat: 35.06, lng: 32.96, intensity: 7, label: "RAF AKROTIRI — Sovereign Base (Cyprus)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Cyprus/UK", operator: "RAF" } },
    { id: "BASE-041", type: "BASE", lat: 56.43, lng: -4.93, intensity: 8, label: "HMNB CLYDE — UK Trident SSBN Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "UK", operator: "Royal Navy" } },
    { id: "BASE-042", type: "BASE", lat: 50.79, lng: -1.11, intensity: 7, label: "HMNB PORTSMOUTH — Royal Navy HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "UK", operator: "Royal Navy" } },
    { id: "BASE-043", type: "BASE", lat: 52.36, lng: 0.49, intensity: 7, label: "RAF LAKENHEATH — USAF F-35 (UK)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "UK", operator: "USAF" } },

    // ========== FRANCE ==========
    { id: "BASE-050", type: "BASE", lat: 48.59, lng: 2.58, intensity: 8, label: "BALARD — French Armed Forces HQ (Paris)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "France", operator: "French MoD" } },
    { id: "BASE-051", type: "BASE", lat: 48.38, lng: -4.50, intensity: 8, label: "ÎLE LONGUE — French SSBN Base (Brest)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "France", operator: "Marine Nationale" } },
    { id: "BASE-052", type: "BASE", lat: 43.10, lng: 5.93, intensity: 7, label: "TOULON NAVAL BASE — French Mediterranean Fleet", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "France", operator: "Marine Nationale" } },
    { id: "BASE-053", type: "BASE", lat: 11.60, lng: 43.10, intensity: 7, label: "FFDj — French Forces Djibouti", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Djibouti", operator: "French Armed Forces" } },
    { id: "BASE-054", type: "BASE", lat: -21.34, lng: 55.47, intensity: 6, label: "BA 181 — French Air Base (Réunion)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "France", operator: "Armée de l'Air" } },

    // ========== RUSSIA ==========
    { id: "BASE-060", type: "BASE", lat: 55.75, lng: 37.62, intensity: 10, label: "MOSCOW — Russian MoD / General Staff HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Russia", operator: "Russian Armed Forces" } },
    { id: "BASE-061", type: "BASE", lat: 69.07, lng: 33.08, intensity: 9, label: "SEVEROMORSK — Northern Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Russia", operator: "Russian Navy" } },
    { id: "BASE-062", type: "BASE", lat: 43.12, lng: 131.90, intensity: 8, label: "VLADIVOSTOK — Pacific Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Russia", operator: "Russian Navy" } },
    { id: "BASE-063", type: "BASE", lat: 44.59, lng: 33.52, intensity: 8, label: "SEVASTOPOL — Black Sea Fleet HQ (Crimea)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Russia/Disputed", operator: "Russian Navy" } },
    { id: "BASE-064", type: "BASE", lat: 52.97, lng: 158.65, intensity: 8, label: "RYBACHIY — SSBN Base (Kamchatka)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Russia", operator: "Russian Navy" } },
    { id: "BASE-065", type: "BASE", lat: 35.00, lng: 35.75, intensity: 7, label: "KHMEIMIM AB — Russian Forces Syria", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Syria", operator: "Russian VKS" } },
    { id: "BASE-066", type: "BASE", lat: 34.89, lng: 35.70, intensity: 7, label: "TARTUS — Russian Naval Base (Syria)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Syria", operator: "Russian Navy" } },
    { id: "BASE-067", type: "BASE", lat: 62.95, lng: 40.82, intensity: 8, label: "PLESETSK COSMODROME — ICBM Launch Site", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "strategic", country: "Russia", operator: "Russian VKS" } },
    { id: "BASE-068", type: "BASE", lat: 54.33, lng: 48.95, intensity: 8, label: "ENGELS AB — Tu-160 Strategic Bomber Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Russia", operator: "Russian VKS" } },

    // ========== CHINA ==========
    { id: "BASE-070", type: "BASE", lat: 39.93, lng: 116.39, intensity: 10, label: "BEIJING — PLA Central Military Commission", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "China", operator: "PLA" } },
    { id: "BASE-071", type: "BASE", lat: 18.23, lng: 109.47, intensity: 9, label: "YULIN NAVAL BASE — SSBN/Carrier (Hainan)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "China", operator: "PLAN" } },
    { id: "BASE-072", type: "BASE", lat: 36.07, lng: 120.33, intensity: 8, label: "QINGDAO — North Sea Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "China", operator: "PLAN" } },
    { id: "BASE-073", type: "BASE", lat: 16.83, lng: 112.33, intensity: 8, label: "WOODY ISLAND — SCS Military Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "China (disputed)", operator: "PLA" } },
    { id: "BASE-074", type: "BASE", lat: 9.88, lng: 114.08, intensity: 8, label: "FIERY CROSS REEF — SCS Military Airstrip", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "China (disputed)", operator: "PLA" } },
    { id: "BASE-075", type: "BASE", lat: 10.38, lng: 114.97, intensity: 7, label: "SUBI REEF — SCS Military Outpost", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "China (disputed)", operator: "PLA" } },
    { id: "BASE-076", type: "BASE", lat: 11.05, lng: 43.09, intensity: 7, label: "PLA SUPPORT BASE — Djibouti", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Djibouti", operator: "PLA" } },
    { id: "BASE-077", type: "BASE", lat: 40.73, lng: 111.68, intensity: 8, label: "HOHHOT — PLA Northern Theater Cmd", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "China", operator: "PLA" } },

    // ========== INDIA ==========
    { id: "BASE-080", type: "BASE", lat: 28.58, lng: 77.17, intensity: 9, label: "NEW DELHI — Indian Armed Forces HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "India", operator: "Indian Armed Forces" } },
    { id: "BASE-081", type: "BASE", lat: 8.49, lng: 76.95, intensity: 8, label: "INS KADAMBA — Indian Navy (Karwar)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "India", operator: "Indian Navy" } },
    { id: "BASE-082", type: "BASE", lat: 18.95, lng: 72.81, intensity: 8, label: "MUMBAI — Western Naval Command", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "India", operator: "Indian Navy" } },
    { id: "BASE-083", type: "BASE", lat: 17.72, lng: 83.30, intensity: 8, label: "VISAKHAPATNAM — Eastern Naval Command", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "India", operator: "Indian Navy" } },
    { id: "BASE-084", type: "BASE", lat: 13.07, lng: 80.25, intensity: 7, label: "INS RAJALI — Naval Air Station (Tamil Nadu)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "India", operator: "Indian Navy" } },

    // ========== NATO EUROPE ==========
    { id: "BASE-090", type: "BASE", lat: 50.84, lng: 4.43, intensity: 8, label: "NATO HQ — SHAPE (Brussels)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Belgium", operator: "NATO" } },
    { id: "BASE-091", type: "BASE", lat: 50.36, lng: 7.90, intensity: 7, label: "BÜCHEL AB — NATO Nuclear Sharing (Germany)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Germany", operator: "Luftwaffe/NATO" } },
    { id: "BASE-092", type: "BASE", lat: 69.30, lng: 16.12, intensity: 7, label: "EVENES AB — Norwegian F-35 Base (Arctic)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Norway", operator: "Norwegian AF" } },
    { id: "BASE-093", type: "BASE", lat: 65.60, lng: 22.13, intensity: 7, label: "BODEN GARRISON — Swedish Army North", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "Sweden", operator: "Swedish Armed Forces" } },
    { id: "BASE-094", type: "BASE", lat: 54.83, lng: 9.85, intensity: 7, label: "FLENSBURG — German Naval Command (Baltic)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Germany", operator: "Deutsche Marine" } },
    { id: "BASE-095", type: "BASE", lat: 40.65, lng: 22.95, intensity: 7, label: "THESSALONIKI — NATO LANDCOM (Greece)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "Greece", operator: "NATO" } },
    { id: "BASE-096", type: "BASE", lat: 59.37, lng: 24.79, intensity: 7, label: "TAPA — NATO eFP Battlegroup (Estonia)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "Estonia", operator: "NATO/UK-led" } },
    { id: "BASE-097", type: "BASE", lat: 56.95, lng: 24.12, intensity: 7, label: "ĀDAŽI — NATO eFP Battlegroup (Latvia)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "Latvia", operator: "NATO/Canada-led" } },
    { id: "BASE-098", type: "BASE", lat: 54.64, lng: 25.10, intensity: 7, label: "RUKLA — NATO eFP Battlegroup (Lithuania)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "Lithuania", operator: "NATO/Germany-led" } },
    { id: "BASE-099", type: "BASE", lat: 51.73, lng: 19.47, intensity: 7, label: "ŁASK AB — NATO/Polish F-16 Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Poland", operator: "Polish AF" } },

    // ========== TURKEY ==========
    { id: "BASE-100", type: "BASE", lat: 39.93, lng: 32.87, intensity: 8, label: "ANKARA — Turkish General Staff HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Turkey", operator: "Turkish Armed Forces" } },
    { id: "BASE-101", type: "BASE", lat: 37.00, lng: 35.43, intensity: 7, label: "INCIRLIK AB — NATO/USAF (Turkey)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Turkey", operator: "USAF/TuAF" } },

    // ========== ISRAEL ==========
    { id: "BASE-105", type: "BASE", lat: 32.01, lng: 34.77, intensity: 8, label: "TEL AVIV — IDF HQ (HaKirya)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Israel", operator: "IDF" } },
    { id: "BASE-106", type: "BASE", lat: 30.62, lng: 34.67, intensity: 8, label: "NEVATIM AB — IAF F-35 Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Israel", operator: "IAF" } },
    { id: "BASE-107", type: "BASE", lat: 29.56, lng: 34.98, intensity: 7, label: "EILAT — Israeli Naval Base (Red Sea)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Israel", operator: "Israeli Navy" } },

    // ========== JAPAN ==========
    { id: "BASE-110", type: "BASE", lat: 35.68, lng: 139.73, intensity: 8, label: "ICHIGAYA — JSDF Joint Staff HQ (Tokyo)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Japan", operator: "JSDF" } },
    { id: "BASE-111", type: "BASE", lat: 33.45, lng: 131.04, intensity: 7, label: "IWAKUNI — USMC/JMSDF Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "marines", country: "Japan", operator: "USMC" } },
    { id: "BASE-112", type: "BASE", lat: 33.16, lng: 129.72, intensity: 7, label: "SASEBO — USN/JMSDF Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Japan", operator: "USN/JMSDF" } },

    // ========== SOUTH KOREA ==========
    { id: "BASE-115", type: "BASE", lat: 37.53, lng: 127.00, intensity: 8, label: "SEOUL — ROK MND HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "South Korea", operator: "ROK Armed Forces" } },

    // ========== AUSTRALIA ==========
    { id: "BASE-120", type: "BASE", lat: -12.46, lng: 130.84, intensity: 7, label: "RAAF TINDAL — Northern Australia Strike", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Australia", operator: "RAAF" } },
    { id: "BASE-121", type: "BASE", lat: -31.83, lng: 115.88, intensity: 7, label: "HMAS STIRLING — Royal Australian Navy (Perth)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Australia", operator: "RAN" } },
    { id: "BASE-122", type: "BASE", lat: -23.80, lng: 133.90, intensity: 7, label: "PINE GAP — Joint Intelligence Facility", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Australia", operator: "ASD/CIA" } },

    // ========== MIDDLE EAST / GULF ==========
    { id: "BASE-125", type: "BASE", lat: 24.43, lng: 54.65, intensity: 7, label: "ABU DHABI — UAE Armed Forces HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "UAE", operator: "UAE Armed Forces" } },
    { id: "BASE-126", type: "BASE", lat: 24.93, lng: 46.72, intensity: 8, label: "RIYADH — Saudi MoD / RSAF HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Saudi Arabia", operator: "Saudi Armed Forces" } },
    { id: "BASE-127", type: "BASE", lat: 21.28, lng: 40.41, intensity: 8, label: "KING FAISAL AB — RSAF (Taif)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Saudi Arabia", operator: "RSAF" } },

    // ========== AFRICA ==========
    { id: "BASE-130", type: "BASE", lat: 36.77, lng: 3.06, intensity: 6, label: "ALGIERS — Algerian Armed Forces HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Algeria", operator: "ANP" } },
    { id: "BASE-131", type: "BASE", lat: 30.05, lng: 31.23, intensity: 7, label: "CAIRO — Egyptian Armed Forces HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Egypt", operator: "Egyptian AF" } },

    // ========== SOUTH AMERICA ==========
    { id: "BASE-135", type: "BASE", lat: -15.80, lng: -47.88, intensity: 7, label: "BRASÍLIA — Brazilian MoD / Joint Staff", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Brazil", operator: "Brazilian Armed Forces" } },

    // ========== NORTH KOREA ==========
    { id: "BASE-140", type: "BASE", lat: 39.04, lng: 125.76, intensity: 9, label: "PYONGYANG — KPA Supreme Command", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "North Korea", operator: "KPA" } },
    { id: "BASE-141", type: "BASE", lat: 39.66, lng: 124.71, intensity: 8, label: "YONGBYON — Nuclear Facilities Complex", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "strategic", country: "North Korea", operator: "KPA" } },

    // ========== IRAN ==========
    { id: "BASE-145", type: "BASE", lat: 35.69, lng: 51.39, intensity: 8, label: "TEHRAN — IRGC / Artesh HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Iran", operator: "IRGC/Artesh" } },
    { id: "BASE-146", type: "BASE", lat: 27.18, lng: 56.27, intensity: 8, label: "BANDAR ABBAS — IRIN Naval Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Iran", operator: "IRIN" } },

    // ========== PAKISTAN ==========
    { id: "BASE-150", type: "BASE", lat: 33.69, lng: 73.04, intensity: 8, label: "RAWALPINDI — Pakistan Army GHQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "Pakistan", operator: "Pakistan Army" } },
    { id: "BASE-151", type: "BASE", lat: 25.28, lng: 66.62, intensity: 7, label: "PNS JINNAH — Pakistan Navy (Karachi)", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Pakistan", operator: "Pakistan Navy" } },

    // ========== PHILIPPINES ==========
    { id: "BASE-007", type: "BASE", lat: 14.79, lng: 120.27, intensity: 7, label: "SUBIC BAY — Philippine/US EDCA Site", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Philippines", operator: "AFP/USN" } },

    // ========== TAIWAN ==========
    { id: "BASE-155", type: "BASE", lat: 25.08, lng: 121.51, intensity: 8, label: "TAIPEI — ROC MND HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Taiwan", operator: "ROC Armed Forces" } },
    { id: "BASE-156", type: "BASE", lat: 23.58, lng: 119.60, intensity: 7, label: "PENGHU — ROC Forward Defense Islands", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Taiwan", operator: "ROC Armed Forces" } },
];

router.get("/", async (_req: Request, res: Response) => {
    // Always serve the full static dataset (much larger than any old cache)
    // Upsert to Supabase in background for persistence
    upsertEvents(TABLE, MILITARY_BASES, "Military Bases (OSINT curated — global)").catch(() => {});
    res.json({ events: MILITARY_BASES, source: "Military Bases (OSINT curated — global)", count: MILITARY_BASES.length });
});

export default router;
