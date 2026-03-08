/**
 * ping.ts — Lightweight keepalive endpoint.
 *
 * Performs a minimal Supabase query so the free-tier project does not
 * pause due to 7-day inactivity.  No authentication required on the
 * caller side — credentials stay server-side.
 *
 * Called by:
 *   • cron-job.org:  GET <your-vercel-domain>/api/ping  (daily, any time)
 *   • Vercel Cron:   /api/ping  schedule "0 3 * * *"  (fallback)
 *   • Manual:        GET /api/ping
 */
import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    const start = Date.now();
    const sb = getSupabase();

    if (!sb) {
        return res.json({
            status: "ok",
            supabase: "not configured",
            latencyMs: Date.now() - start,
            timestamp: new Date().toISOString(),
        });
    }

    // Cheapest possible round-trip: fetch one row from a static table.
    const { error } = await sb.from("nuclear").select("id").limit(1);

    return res.json({
        status: "ok",
        supabase: error ? `error: ${error.message}` : "alive",
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
    });
});

export default router;
