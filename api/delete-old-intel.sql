-- Delete all events outside Feb 20, 2026 to Mar 8, 2026 for all main intel tables
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'seismic', 'weather', 'launches', 'cves', 'ioda', 'ooni', 'threats',
        'conflicts', 'unrest', 'cyber', 'satellite'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DELETE FROM %I WHERE timestamp < %L OR timestamp > %L', tbl, '2026-02-20', '2026-03-08');
    END LOOP;
END $$;

-- If you want to preview what will be deleted for a table, run:
-- SELECT COUNT(*) FROM seismic WHERE timestamp < '2026-02-20' OR timestamp > '2026-03-08';
