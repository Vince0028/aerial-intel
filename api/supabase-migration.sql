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
