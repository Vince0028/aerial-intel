import { Router, type Request, type Response } from "express";
import { readCachedEvents } from "../dbCache.js";

const router = Router();
const TABLE = "datacenters";

/**
 * GET /api/intel/datacenters
 * Returns AI & cloud data center locations from Supabase.
 * Data is managed directly in the database.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const cached = await readCachedEvents(TABLE);
        const events = cached?.events ?? [];
        return res.json({ events, source: cached?.source ?? "Supabase", count: events.length });
    } catch (err: any) {
        console.error("[datacenters] Error:", err.message);
        return res.json({ events: [], source: "error", count: 0 });
    }
});

export default router;
