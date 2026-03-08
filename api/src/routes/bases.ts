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
    { id: "BASE-001", type: "BASE", lat: 38.87, lng: -77.06, intensity: 10, label: "PENTAGON — Joint Command HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "USA" } },
    { id: "BASE-002", type: "BASE", lat: 51.12, lng: -1.79, intensity: 6, label: "SALISBURY PLAIN — British Army Training", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "army", country: "UK" } },
    { id: "BASE-003", type: "BASE", lat: 49.44, lng: 7.60, intensity: 8, label: "RAMSTEIN AB — USAFE HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Germany" } },
    { id: "BASE-004", type: "BASE", lat: 35.29, lng: 139.65, intensity: 9, label: "YOKOSUKA NAVAL BASE — 7th Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Japan" } },
    { id: "BASE-005", type: "BASE", lat: 26.23, lng: 50.59, intensity: 8, label: "NSA BAHRAIN — 5th Fleet HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Bahrain" } },
    { id: "BASE-006", type: "BASE", lat: 11.55, lng: 43.15, intensity: 7, label: "CAMP LEMONNIER — AFRICOM Forward Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "joint", country: "Djibouti" } },
    { id: "BASE-007", type: "BASE", lat: 14.79, lng: 120.27, intensity: 7, label: "SUBIC BAY — Former US Naval Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "Philippines" } },
    { id: "BASE-008", type: "BASE", lat: 24.25, lng: 54.55, intensity: 8, label: "AL DHAFRA AB — USAF Forward Op", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "UAE" } },
    { id: "BASE-009", type: "BASE", lat: 36.14, lng: -5.35, intensity: 6, label: "GIBRALTAR — Royal Navy Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "UK" } },
    { id: "BASE-010", type: "BASE", lat: 21.35, lng: -157.95, intensity: 9, label: "PEARL HARBOR — PACOM HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "navy", country: "USA" } },
    { id: "BASE-011", type: "BASE", lat: 35.06, lng: 32.96, intensity: 7, label: "RAF AKROTIRI — British Sovereign Base", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Cyprus/UK" } },
    { id: "BASE-012", type: "BASE", lat: 25.41, lng: 51.50, intensity: 8, label: "AL UDEID AB — CENTCOM Forward HQ", color: LAYER_COLORS.BASE, timestamp: "2026-01-01T00:00:00Z", meta: { branch: "airforce", country: "Qatar" } },
];

router.get("/", async (_req: Request, res: Response) => {
    // Try Supabase first
    const cached = await readCachedEvents(TABLE);
    if (cached && cached.events.length > 0) {
        return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
    }

    // Seed Supabase with static data
    upsertEvents(TABLE, MILITARY_BASES, "Military Bases (OSINT curated)").catch(() => {});
    res.json({ events: MILITARY_BASES, source: "Military Bases (OSINT curated)", count: MILITARY_BASES.length });
});

export default router;
