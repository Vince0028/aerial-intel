-- ============================================================
-- Aerial Intel — Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Creates separate tables per intel category + RLS policies
-- ============================================================

-- 1. CONFLICTS
CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'COMBAT',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF3131',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'GDELT',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. UNREST
CREATE TABLE IF NOT EXISTS unrest (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'UNREST',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FFBD59',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'ACLED',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AVIATION
CREATE TABLE IF NOT EXISTS aviation (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'AVIATION',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#00D2FF',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'OpenSky',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SATELLITE
CREATE TABLE IF NOT EXISTS satellite (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'SATELLITE',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF00FF',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'NASA FIRMS',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CYBER
CREATE TABLE IF NOT EXISTS cyber (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'CYBER',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF1493',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'Cloudflare Radar',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. NUCLEAR
CREATE TABLE IF NOT EXISTS nuclear (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'NUCLEAR',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#39FF14',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'WRI/OSINT',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. NAVAL
CREATE TABLE IF NOT EXISTS naval (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'NAVAL',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#7D5FFF',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'Naval Intel',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. BASES
CREATE TABLE IF NOT EXISTS bases (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'BASE',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FFFFFF',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'OSINT',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies (anon key needs SELECT + INSERT + UPDATE + DELETE)
-- ============================================================

ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unrest ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviation ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite ENABLE ROW LEVEL SECURITY;
ALTER TABLE cyber ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuclear ENABLE ROW LEVEL SECURITY;
ALTER TABLE naval ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon role (our API server)
CREATE POLICY "anon_full_access" ON conflicts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON unrest FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON aviation FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON satellite FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON cyber FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON nuclear FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON naval FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON bases FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Indexes for faster queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conflicts_fetched ON conflicts (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_unrest_fetched ON unrest (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_aviation_fetched ON aviation (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_fetched ON satellite (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_cyber_fetched ON cyber (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_nuclear_fetched ON nuclear (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_naval_fetched ON naval (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_bases_fetched ON bases (fetched_at DESC);

-- 9. DATACENTERS (AI / Cloud data centers worldwide)
CREATE TABLE IF NOT EXISTS datacenters (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'DATACENTER',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#A855F7',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'OSINT',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. OILSITES (Oil fields, refineries, terminals, platforms)
CREATE TABLE IF NOT EXISTS oilsites (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'OILSITE',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#F59E0B',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'OSINT',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE datacenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE oilsites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_access" ON datacenters FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON oilsites FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_datacenters_fetched ON datacenters (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_oilsites_fetched ON oilsites (fetched_at DESC);

-- 11. SEISMIC (USGS Earthquakes)
CREATE TABLE IF NOT EXISTS seismic (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'SEISMIC',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF6347',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'USGS',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. WEATHER (NASA EONET natural hazards)
CREATE TABLE IF NOT EXISTS weather (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'WEATHER',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#00CED1',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'NASA EONET',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. LAUNCHES (Launch Library 2)
CREATE TABLE IF NOT EXISTS launches (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'LAUNCH',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF4500',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'Launch Library 2',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. CVES (NIST NVD critical vulnerabilities)
CREATE TABLE IF NOT EXISTS cves (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'CVE',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#E11D48',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'NIST NVD',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. IODA (Internet outage detection)
CREATE TABLE IF NOT EXISTS ioda (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'IODA',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#DC2626',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'IODA',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. OONI (Internet censorship monitoring)
CREATE TABLE IF NOT EXISTS ooni (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'OONI',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8B5CF6',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'OONI',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. THREATS (AbuseIPDB threat intelligence)
CREATE TABLE IF NOT EXISTS threats (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'THREAT',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    intensity INTEGER NOT NULL DEFAULT 5,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#EF4444',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'AbuseIPDB',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seismic ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather ENABLE ROW LEVEL SECURITY;
ALTER TABLE launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cves ENABLE ROW LEVEL SECURITY;
ALTER TABLE ioda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ooni ENABLE ROW LEVEL SECURITY;
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_access" ON seismic FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON weather FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON launches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON cves FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON ioda FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON ooni FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON threats FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_seismic_fetched ON seismic (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_fetched ON weather (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_launches_fetched ON launches (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_cves_fetched ON cves (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_ioda_fetched ON ioda (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_ooni_fetched ON ooni (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_threats_fetched ON threats (fetched_at DESC);

-- ============================================================
-- AI Summaries — Groq-generated SITREP per intel category
-- Cached here to avoid rate-limiting (TTL enforced by app: 30 min)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_summaries (
    category TEXT PRIMARY KEY,          -- COMBAT | UNREST | AVIATION | etc.
    summary TEXT NOT NULL,
    model_used TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_full_access" ON ai_summaries FOR ALL TO anon USING (true) WITH CHECK (true);
