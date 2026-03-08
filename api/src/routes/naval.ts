import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents } from "../dbCache.js";

const TABLE = "naval";
const router = Router();

/**
 * GET /api/intel/naval
 * Static JSON of known naval homeports and carrier strike group positions.
 * Seeds Supabase on first call, then serves from DB.
 */

const NAVAL_INTEL: IntelEvent[] = [
    { id: "CSG-1", type: "NAVAL", lat: 14.8, lng: 120.3, intensity: 10, label: "CSG RONALD REAGAN — Subic Bay AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "7th Fleet", homeport: "Yokosuka" } },
    { id: "CSG-2", type: "NAVAL", lat: 35.29, lng: 139.65, intensity: 10, label: "CSG YOKOSUKA — In Port", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "7th Fleet", homeport: "Yokosuka" } },
    { id: "CSG-3", type: "NAVAL", lat: 21.35, lng: -157.95, intensity: 10, label: "CSG PEARL HARBOR — Pacific Patrol", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "3rd Fleet", homeport: "Pearl Harbor" } },
    { id: "CSG-4", type: "NAVAL", lat: 32.72, lng: -117.16, intensity: 10, label: "CSG SAN DIEGO — Pacific Fleet", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "3rd Fleet", homeport: "San Diego" } },
    { id: "CSG-5", type: "NAVAL", lat: 36.85, lng: -76.30, intensity: 10, label: "CSG NORFOLK — Atlantic Fleet", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "carrier_group", fleet: "2nd Fleet", homeport: "Norfolk" } },
    { id: "DDG-1", type: "NAVAL", lat: 26.23, lng: 50.59, intensity: 7, label: "DDG BAHRAIN PATROL — 5th Fleet AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "destroyer", fleet: "5th Fleet" } },
    { id: "DDG-2", type: "NAVAL", lat: 12.11, lng: 43.15, intensity: 7, label: "DDG DJIBOUTI — Horn of Africa", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "destroyer", fleet: "CJTF-HOA" } },
    { id: "DDG-3", type: "NAVAL", lat: 60.39, lng: 5.32, intensity: 6, label: "DDG NORTH SEA — NATO Patrol", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "destroyer", fleet: "6th Fleet" } },
    { id: "SSN-1", type: "NAVAL", lat: 68.0, lng: 33.0, intensity: 8, label: "SSN ARCTIC PATROL — Northern Fleet AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "submarine", classification: "SSN" } },
    { id: "SSN-2", type: "NAVAL", lat: 20.0, lng: 135.0, intensity: 8, label: "SSN PACIFIC DEEP — 7th Fleet AOR", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "submarine", classification: "SSBN" } },
    { id: "PC-1", type: "NAVAL", lat: 1.2, lng: 104.0, intensity: 4, label: "PATROL MALACCA — Strait Security", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "patrol", region: "Malacca Strait" } },
    { id: "PC-2", type: "NAVAL", lat: 30.0, lng: 32.5, intensity: 4, label: "PATROL SUEZ — Canal Security", color: LAYER_COLORS.NAVAL, timestamp: new Date().toISOString(), meta: { vesselType: "patrol", region: "Suez Canal" } },
];

router.get("/", async (_req: Request, res: Response) => {
    // Try Supabase first
    const cached = await readCachedEvents(TABLE);
    if (cached && cached.events.length > 0) {
        return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
    }

    // Seed Supabase with static data
    upsertEvents(TABLE, NAVAL_INTEL, "Naval Intel (static + OSINT)").catch(() => {});
    res.json({ events: NAVAL_INTEL, source: "Naval Intel (static + OSINT)", count: NAVAL_INTEL.length });
});

export default router;
