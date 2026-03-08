/**
 * cleanup.ts — Expires stale rows from live-data Supabase tables.
 *
 * Called by:
 *   • Vercel Cron Job: daily at 02:00 UTC (configured in /vercel.json)
 *   • Manual: GET /api/cleanup  (add ?secret=<CRON_SECRET> if you want auth)
 *
 * Static reference tables (nuclear, bases, infrastructure, datacenters, oilsites)
 * are intentionally skipped — they hold permanent reference data.
 */
import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

/** Live-data tables that should be purged of rows older than MAX_AGE_DAYS */
const LIVE_TABLES = [
    "conflicts", "unrest", "cyber", "satellite",
    "seismic", "weather", "launches", "cves",
    "ioda", "ooni", "threats",
];

const MAX_AGE_DAYS = 17;

router.get("/", async (_req: Request, res: Response) => {
    const sb = getSupabase();
    if (!sb) {
        return res.json({ status: "skipped", reason: "Supabase not configured" });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
    const cutoffISO = cutoff.toISOString();

    const results: Record<string, string> = {};

    for (const table of LIVE_TABLES) {
        try {
            const { error, count } = await sb
                .from(table)
                .delete({ count: "exact" })
                .lt("timestamp", cutoffISO);

            results[table] = error
                ? `error: ${error.message}`
                : `deleted ${count ?? 0} rows`;
        } catch (e: any) {
            results[table] = `error: ${e.message}`;
        }
    }

    console.log(`[cleanup] Ran at ${new Date().toISOString()}, cutoff=${cutoffISO}`, results);

    return res.json({
        status: "ok",
        cutoff: cutoffISO,
        tables: results,
    });
});

export default router;
