import { Router, type Request, type Response } from "express";
import { readCachedEvents } from "../dbCache.js";

const TABLE = "nuclear";
const router = Router();

/**
 * GET /api/intel/nuclear
 * Returns nuclear facility locations from Supabase.
 * Data is managed directly in the database.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const cached = await readCachedEvents(TABLE);
        const events = cached?.events ?? [];
        return res.json({ events, source: cached?.source ?? "Supabase", count: events.length });
    } catch (err: any) {
        console.error("[nuclear] Error:", err.message);
        return res.json({ events: [], source: "error", count: 0 });
    }
});

export default router;