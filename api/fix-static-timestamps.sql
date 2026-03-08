-- fix-static-timestamps.sql
-- Run this in Supabase SQL Editor to:
--   1. Fix old 2026-01-01 timestamps on static reference tables
--   2. Set up pg_cron to automatically purge expired live-data rows every night
--
-- NOTE: pg_cron requires Supabase Pro plan or higher.
-- If on Free plan, the Vercel Cron Job at /api/cleanup handles cleanup instead.

-- ─── PART 1: Fix timestamps on static reference tables ───────────────────────
-- These rows were seeded with 2026-01-01 and need to be in the Feb 20 window.

UPDATE nuclear
SET timestamp = '2026-02-20T00:00:00Z'
WHERE timestamp::timestamptz < '2026-02-20'::timestamptz
   OR timestamp::timestamptz > '2026-03-08'::timestamptz;

UPDATE bases
SET timestamp = '2026-02-20T00:00:00Z'
WHERE timestamp::timestamptz < '2026-02-20'::timestamptz
   OR timestamp::timestamptz > '2026-03-08'::timestamptz;

UPDATE infrastructure
SET timestamp = '2026-02-20T00:00:00Z'
WHERE timestamp::timestamptz < '2026-02-20'::timestamptz
   OR timestamp::timestamptz > '2026-03-08'::timestamptz;

UPDATE datacenters
SET timestamp = '2026-02-20T00:00:00Z'
WHERE timestamp::timestamptz < '2026-02-20'::timestamptz
   OR timestamp::timestamptz > '2026-03-08'::timestamptz;

UPDATE oilsites
SET timestamp = '2026-02-20T00:00:00Z'
WHERE timestamp::timestamptz < '2026-02-20'::timestamptz
   OR timestamp::timestamptz > '2026-03-08'::timestamptz;

-- Confirm counts after update
SELECT 'nuclear' AS tbl, COUNT(*) FROM nuclear
UNION ALL SELECT 'bases', COUNT(*) FROM bases
UNION ALL SELECT 'infrastructure', COUNT(*) FROM infrastructure
UNION ALL SELECT 'datacenters', COUNT(*) FROM datacenters
UNION ALL SELECT 'oilsites', COUNT(*) FROM oilsites;


-- ─── PART 2: Automatic pg_cron cleanup (Supabase Pro only) ────────────────────
-- Runs daily at 02:00 UTC — deletes live-data rows older than 17 days.
-- Static reference tables (nuclear, bases, infrastructure, datacenters, oilsites)
-- are intentionally excluded.
--
-- To enable: uncomment and run in Supabase SQL Editor.

/*
SELECT cron.schedule(
    'cleanup-stale-intel',          -- job name
    '0 2 * * *',                    -- cron: daily 02:00 UTC
    $$
    DO $$
    DECLARE
        tbl TEXT;
        tables TEXT[] := ARRAY[
            'conflicts', 'unrest', 'cyber', 'satellite',
            'seismic', 'weather', 'launches', 'cves',
            'ioda', 'ooni', 'threats'
        ];
        cutoff TIMESTAMPTZ := NOW() - INTERVAL '17 days';
    BEGIN
        FOREACH tbl IN ARRAY tables LOOP
            EXECUTE format(
                'DELETE FROM %I WHERE timestamp::timestamptz < %L',
                tbl, cutoff
            );
        END LOOP;
    END;
    $$
    $$
);
*/

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('cleanup-stale-intel');

