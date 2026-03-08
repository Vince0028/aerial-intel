-- fix-static-timestamps.sql
-- Run this in Supabase SQL Editor to update static reference data
-- timestamps to 2026-02-20 so they survive the date-range cleanup SQL.
--
-- Static tables (nuclear, bases, infrastructure) hold permanent reference
-- data — NOT time-bound intel events — so they should NOT be deleted by
-- the date-range cleanup. This script fixes their timestamps in place.

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
