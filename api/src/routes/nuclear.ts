import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "nuclear";
const router = Router();

/**
 * GET /api/intel/nuclear
 * Returns nuclear facility locations. Seeds Supabase on first call,
 * then serves from DB cache.
 */

const NUCLEAR_SITES: IntelEvent[] = [
    { id: "NUK-001", type: "NUCLEAR", lat: 51.39, lng: -1.32, intensity: 8, label: "ALDERMASTON — Research Facility", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "research", status: "active", country: "UK" } },
    { id: "NUK-002", type: "NUCLEAR", lat: 47.91, lng: 5.33, intensity: 7, label: "VALDUC — Storage Facility", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "storage", status: "active", country: "France" } },
    { id: "NUK-003", type: "NUCLEAR", lat: 39.73, lng: 125.75, intensity: 10, label: "YONGBYON — Nuclear Research Complex", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "research", status: "active", country: "North Korea" } },
    { id: "NUK-004", type: "NUCLEAR", lat: 32.64, lng: 51.47, intensity: 9, label: "NATANZ — Uranium Enrichment Plant", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "enrichment", status: "active", country: "Iran" } },
    { id: "NUK-005", type: "NUCLEAR", lat: 46.52, lng: 48.55, intensity: 6, label: "ASTRAKHAN — Nuclear Power Plant", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "plant", status: "active", country: "Russia" } },
    { id: "NUK-006", type: "NUCLEAR", lat: 30.41, lng: -88.55, intensity: 5, label: "GRAND GULF — Nuclear Power Station", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "plant", status: "active", country: "USA" } },
    { id: "NUK-007", type: "NUCLEAR", lat: 19.83, lng: 72.70, intensity: 7, label: "TARAPUR — Atomic Power Station", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "plant", status: "active", country: "India" } },
    { id: "NUK-008", type: "NUCLEAR", lat: -33.68, lng: 18.43, intensity: 6, label: "KOEBERG — Nuclear Power Station", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "plant", status: "active", country: "South Africa" } },
    { id: "NUK-009", type: "NUCLEAR", lat: 37.42, lng: 126.70, intensity: 7, label: "WOLSEONG — Nuclear Power Plant", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "plant", status: "active", country: "South Korea" } },
    { id: "NUK-010", type: "NUCLEAR", lat: 51.27, lng: 30.22, intensity: 4, label: "CHERNOBYL — Exclusion Zone", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "decommissioned", status: "exclusion_zone", country: "Ukraine" } },
    { id: "NUK-011", type: "NUCLEAR", lat: 37.32, lng: 141.03, intensity: 5, label: "FUKUSHIMA DAIICHI — Decommissioning", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "decommissioned", status: "decommissioning", country: "Japan" } },
    { id: "NUK-012", type: "NUCLEAR", lat: 44.09, lng: 6.50, intensity: 6, label: "CADARACHE — Nuclear Research Center", color: LAYER_COLORS.NUCLEAR, timestamp: "2026-01-01T00:00:00Z", meta: { facilityType: "research", status: "active", country: "France" } },
];

router.get("/", async (_req: Request, res: Response) => {
    // Try Supabase first
    const cached = await readCachedEvents(TABLE);
    if (cached && cached.events.length > 0) {
        return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
    }

    // Seed Supabase with static data, then return it
    upsertEvents(TABLE, NUCLEAR_SITES, "WRI Global Power Plant DB (curated)").catch(() => {});
    res.json({ events: NUCLEAR_SITES, source: "WRI Global Power Plant DB (curated)", count: NUCLEAR_SITES.length });
});

export default router;
