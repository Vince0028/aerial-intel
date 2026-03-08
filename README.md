# Aerial Intel

**Global Command Center** — Real-time tactical intelligence, 3D globe visualization, and asset tracking powered by live data feeds, Supabase caching, and AI.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Data Flow](#data-flow)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [API Endpoints](#api-endpoints)
- [Data Sources](#data-sources)
- [Frontend Components](#frontend-components)
- [API Status & Troubleshooting](#api-status--troubleshooting)
- [Features](#features)

---

## Architecture Overview

```mermaid
graph TB
    subgraph External["☁️ External APIs"]
        GDELT["GDELT 2.0 GEO"]
        ACLED["ACLED API"]
        OPENSKY["OpenSky Network"]
        FIRMS["NASA FIRMS"]
        CLOUDFLARE["Cloudflare Radar"]
        DIGITRAFFIC["Digitraffic Maritime"]
        GROQ["Groq AI (3 models)"]
    end

    subgraph API["🖥️ Express API Server :3001"]
        ROUTES["API Routes<br/>/api/intel/*"]
        CACHE["dbCache.ts<br/>upsert / read"]
        CLIENT["supabaseClient.ts"]
    end

    subgraph DB["🗄️ Supabase (PostgreSQL)"]
        T1["conflicts"]
        T2["unrest"]
        T3["aviation"]
        T4["satellite"]
        T5["cyber"]
        T6["nuclear"]
        T7["naval"]
        T8["bases"]
        T9["datacenters"]
        T10["oilsites"]
        T11["ai_summaries"]
    end

    subgraph FE["🌐 React Frontend :8080"]
        QUERY["TanStack Query<br/>60s auto-refresh"]
        GLOBE["TacticalGlobe<br/>react-globe.gl"]
        FEED["IntelFeed + AI SITREP"]
        TRACKER["AssetTracker"]
        HUD["HudOverlay"]
    end

    GDELT & ACLED & OPENSKY & FIRMS & CLOUDFLARE & DIGITRAFFIC --> ROUTES
    GROQ --> ROUTES
    ROUTES --> CACHE
    CACHE --> CLIENT --> DB
    DB --> CLIENT --> CACHE --> ROUTES
    ROUTES -->|JSON| QUERY
    QUERY --> GLOBE & FEED & TRACKER
    HUD --> GLOBE

    style External fill:#1a1a2e,stroke:#FF3131,color:#fff
    style API fill:#1a1a2e,stroke:#00D2FF,color:#fff
    style DB fill:#1a1a2e,stroke:#39FF14,color:#fff
    style FE fill:#1a1a2e,stroke:#FFBD59,color:#fff
```

---

## Data Flow

```mermaid
sequenceDiagram
    participant FE as Frontend<br/>(TanStack Query)
    participant API as API Server<br/>(Express :3001)
    participant EXT as External API
    participant SB as Supabase<br/>(PostgreSQL)

    FE->>API: GET /api/intel/conflicts
    API->>EXT: Fetch from GDELT/ACLED/etc.

    alt External API succeeds
        EXT-->>API: JSON response
        API->>SB: upsertEvents(table, events)
        SB-->>API: OK
        API-->>FE: { events: [...], source, count }
    else External API fails (timeout/auth/404)
        EXT--xAPI: Error
        API->>SB: readCachedEvents(table)
        SB-->>API: Cached events
        API-->>FE: { events: [...], source: "Supabase cache" }
    end

    Note over FE: Auto-refetches every 60s
```

### DB-Driven Routes (Datacenters, Oil Sites, Nuclear, Bases)

These layers use a **database-first** approach — data lives in Supabase and is auto-seeded on first request.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as API Server
    participant SB as Supabase

    FE->>API: GET /api/intel/datacenters
    API->>SB: readCachedEvents("datacenters")

    alt Cache has data
        SB-->>API: DB events
        API-->>FE: { events: [...], source: "OSINT Seed Data (cached)" }
    else Cache is empty (first run)
        SB-->>API: []
        Note over API: Auto-seeds initial data
        API->>SB: upsertEvents("datacenters", SEED_DATA)
        API->>SB: readCachedEvents("datacenters")
        SB-->>API: Seeded events
        API-->>FE: { events: [...], source: "OSINT Seed Data (cached)" }
    end
```

> **No external API required** for data centers, oil sites, bases, infrastructure, and nuclear layers. They use curated OSINT seed data stored in Supabase.

---

## Project Structure

```
aerial-intel/
├── README.md
├── api/                          # Express.js API proxy + Supabase cache
│   ├── .env                      # API keys & Supabase credentials
│   ├── package.json
│   ├── tsconfig.json
│   ├── supabase-migration.sql    # Database schema (10 tables + RLS)
│   └── src/
│       ├── server.ts             # Express app, CORS, route mounting
│       ├── types.ts              # Shared TypeScript types (12 event types)
│       ├── supabaseClient.ts     # Singleton Supabase client
│       ├── dbCache.ts            # upsertEvents() & readCachedEvents()
│       └── routes/
│           ├── conflicts.ts      # GDELT → /api/intel/conflicts
│           ├── unrest.ts         # ACLED → /api/intel/unrest
│           ├── aviation.ts       # OpenSky → /api/intel/aviation
│           ├── satellite.ts      # NASA FIRMS → /api/intel/satellite
│           ├── cyber.ts          # Cloudflare → /api/intel/cyber
│           ├── nuclear.ts        # Seed → /api/intel/nuclear
│           ├── naval.ts          # Digitraffic → /api/intel/naval
│           ├── bases.ts          # Seed → /api/intel/bases (99 bases)
│           ├── infrastructure.ts # Seed → /api/intel/infrastructure
│           ├── datacenters.ts    # DB-driven → /api/intel/datacenters
│           ├── oilsites.ts       # DB-driven → /api/intel/oilsites
│           ├── conflictZones.ts  # Groq AI → /api/intel/conflict-zones
│           ├── summarize.ts      # Groq AI → /api/intel/summarize
│           └── predict.ts        # Groq AI → /api/intel/predict
├── frontend/                     # React + Vite frontend
│   ├── package.json
│   ├── vite.config.ts            # Dev proxy → :3001
│   ├── tailwind.config.ts
│   └── src/
│       ├── App.tsx               # Router setup
│       ├── main.tsx              # Entry point + QueryClient
│       ├── pages/
│       │   └── Index.tsx         # Main page — orchestrates all panels
│       ├── hooks/
│       │   └── useIntelData.ts   # TanStack Query hooks for all endpoints
│       ├── data/
│       │   └── tacticalData.ts   # Layer colors, labels, types (12 layers)
│       └── components/
│           ├── TacticalGlobe.tsx  # 3D globe (react-globe.gl)
│           ├── IntelFeed.tsx      # Live intel feed + AI SITREP briefing
│           ├── AssetTracker.tsx   # Asset counts & selected asset info
│           ├── StatusBar.tsx      # Bottom status bar
│           ├── HudOverlay.tsx     # Tactical HUD overlay
│           ├── LayerLegend.tsx    # Layer toggle legend (12 layers)
│           ├── NavLink.tsx        # Navigation link component
│           ├── GlobeMarker.ts    # SVG marker definitions
│           ├── GlobeSprites.ts   # Canvas sprite rendering (12 icons)
│           └── ui/               # shadcn/ui components
└── backend/                      # Reserved for future services
```

---

## Tech Stack

```mermaid
graph LR
    subgraph Frontend
        React["React 18"]
        Vite["Vite 5"]
        TW["Tailwind CSS"]
        TQ["TanStack Query"]
        Globe["react-globe.gl"]
        Three["Three.js"]
        Shadcn["shadcn/ui"]
    end

    subgraph Backend
        Express["Express 4"]
        TSX["tsx (hot reload)"]
        TS["TypeScript"]
    end

    subgraph Database
        Supa["Supabase"]
        PG["PostgreSQL"]
        RLS["Row Level Security"]
    end

    subgraph AI
        Groq["Groq Cloud"]
        Llama["llama-3.3-70b"]
    end

    React --> TQ --> Express --> Supa --> PG
    Globe --> Three
    Express --> Groq

    style Frontend fill:#1e293b,stroke:#00D2FF,color:#fff
    style Backend fill:#1e293b,stroke:#39FF14,color:#fff
    style Database fill:#1e293b,stroke:#FF3131,color:#fff
    style AI fill:#1e293b,stroke:#FFBD59,color:#fff
```

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, topojson-client |
| **3D Globe** | Three.js, react-globe.gl, custom canvas sprites, conflict zone polygons |
| **API Proxy** | Express.js, TypeScript, tsx (hot reload) |
| **Database** | Supabase (PostgreSQL), RLS policies, 10 intel tables + AI summaries |
| **AI** | Groq — llama-3.3-70b-versatile, mixtral-8x7b-32768, llama-3.1-8b-instant |
| **State** | TanStack React Query (60s auto-refresh) |
| **Maritime** | Digitraffic (Finnish Transport) live AIS tracking |

---

## Quick Start

```sh
# 1. Clone & install
git clone <repo-url>
cd aerial-intel

# 2. Set up the API server
cd api
cp .env.example .env        # Fill in your API keys (see Environment Variables)
npm install
npm run dev                  # Starts on port 3001

# 3. Set up the frontend (separate terminal)
cd frontend
npm install
npm run dev                  # Starts on port 8080, proxies /api → :3001

# 4. Set up Supabase (see Supabase Setup section)
# Run supabase-migration.sql in your Supabase SQL editor
```

---

## Environment Variables

Create `api/.env` with these keys:

```env
# ——— Supabase (REQUIRED) ———
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# ——— External API Keys ———
ACLED_EMAIL=your@email.edu
ACLED_KEY=your-acled-key

OPENSKY_USER=your-username
OPENSKY_PASS=your-password

NASA_FIRMS_KEY=your-firms-key

CLOUDFLARE_RADAR_TOKEN=your-cf-token

GROQ_API_KEY=gsk_your-groq-key
```

---

## Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file:

```sql
-- File: api/supabase-migration.sql
-- Creates 8 tables: conflicts, unrest, aviation, satellite, cyber, nuclear, naval, bases
-- Each table has: id, type, lat, lng, intensity, label, color, timestamp, meta, source, fetched_at
-- RLS policies grant anon full CRUD access
-- Indexes on fetched_at for cache eviction
```

3. Copy your **Project URL** and **anon public key** from **Settings → API** into `api/.env`

### Database Schema

All 10 intel tables share an identical schema. The `meta` column is JSONB for flexible per-category data (callsign, heading, vessel type, operator, capacity, etc.).

```mermaid
erDiagram
    INTEL_TABLE {
        text id PK "Unique event ID"
        text type "Event type (COMBAT, DATACENTER, etc.)"
        float8 lat "Latitude"
        float8 lng "Longitude"
        int4 intensity "1-10 severity scale"
        text label "Human-readable description"
        text color "Hex color for rendering"
        timestamptz timestamp "Event timestamp"
        jsonb meta "Flexible metadata"
        text source "Data source name"
        timestamptz fetched_at "Cache timestamp"
    }

    ai_summaries {
        text category PK "COMBAT, UNREST, etc."
        text summary "Groq-generated SITREP text"
        text model_used "Model that generated it"
        timestamptz created_at "Cache timestamp"
    }
```

**Tables:** `conflicts`, `unrest`, `aviation`, `satellite`, `cyber`, `nuclear`, `naval`, `bases`, `datacenters`, `oilsites`, `ai_summaries`

---

## API Endpoints

All endpoints return the unified `ApiResponse` schema:

```json
{
  "events": [
    {
      "id": "EVT-001",
      "type": "COMBAT",
      "lat": 50.45,
      "lng": 30.52,
      "intensity": 8,
      "label": "Artillery exchange near Kyiv",
      "color": "#FF3131",
      "timestamp": "2025-01-15T14:32:07Z",
      "meta": { "source": "GDELT" }
    }
  ],
  "source": "GDELT → Supabase",
  "count": 1
}
```

| Method | Endpoint | Source | Auth | Description |
|--------|----------|--------|------|-------------|
| `GET` | `/api/health` | — | None | Server status + endpoint list |
| `GET` | `/api/intel/conflicts` | GDELT 2.0 | None | Armed conflict events |
| `GET` | `/api/intel/unrest` | ACLED | Key | Protests, riots, civil unrest |
| `GET` | `/api/intel/aviation` | OpenSky | Optional | Live aircraft positions |
| `GET` | `/api/intel/satellite` | NASA FIRMS | Key | Thermal hotspots (fire/explosion) |
| `GET` | `/api/intel/cyber` | Cloudflare Radar | Token | Internet outages & anomalies |
| `GET` | `/api/intel/nuclear` | Supabase seed | None | Nuclear facility locations |
| `GET` | `/api/intel/naval` | Digitraffic + seed | None | Live vessel tracking + military seed |
| `GET` | `/api/intel/bases` | Supabase seed | None | 99 military bases across 43 countries |
| `GET` | `/api/intel/infrastructure` | Supabase seed | None | Submarine cables & pipelines (48 points, 23 routes) |
| `GET` | `/api/intel/datacenters` | Supabase (DB-driven) | None | 55 AI/cloud data centers worldwide |
| `GET` | `/api/intel/oilsites` | Supabase (DB-driven) | None | 56 oil fields, refineries & chokepoints |
| `GET` | `/api/intel/conflict-zones` | Groq AI | Key | AI-identified active conflict zone countries |
| `POST` | `/api/intel/summarize` | Groq AI | Key | AI SITREP briefing per category |
| `POST` | `/api/intel/predict` | Groq AI | Key | AI flight path prediction |

---

## Data Sources

### Live API Sources

| Category | API | Auth | Notes |
|----------|-----|------|-------|
| ⚔️ **Combat** | [GDELT 2.0 GEO API](https://api.gdeltproject.org) | Free, no key | Falls back to Supabase cache |
| 📢 **Unrest** | [ACLED API](https://acleddata.com) | Free .edu email | Falls back to Supabase cache |
| ✈️ **Aviation** | [OpenSky Network](https://opensky-network.org) | Optional (increases rate limit) | Auto-falls back to anonymous on 401 |
| 🛰️ **Satellite** | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov) | Free MAP_KEY | Falls back to Supabase cache |
| 📡 **Cyber** | [Cloudflare Radar](https://radar.cloudflare.com) | Free token | Falls back to Supabase cache |
| ⚓ **Naval** | [Digitraffic](https://meri.digitraffic.fi) | None | Live Baltic AIS + military seed (SOG >2kn, <2h) |

### Database-Driven Sources (no external API needed)

These layers auto-seed into Supabase on first request. Data can be managed directly in the database.

| Category | Data | Count |
|----------|------|-------|
| 🖥️ **Data Centers** | AI/cloud data centers (AWS, Google, Meta, NVIDIA, Alibaba, etc.) | 55 facilities |
| 🛢️ **Oil Sites** | Oil fields, refineries, terminals, offshore platforms, chokepoints | 56 sites |
| 🛡️ **Bases** | Military installations across 43 countries | 99 bases |
| 🔌 **Infrastructure** | Submarine cables & pipelines (points + arc routes) | 48 points, 23 routes |
| ☢️ **Nuclear** | Known nuclear facility coordinates | 12 sites |

### AI-Powered Features

| Feature | Provider | Model | Description |
|---------|----------|-------|-------------|
| 🤖 **Flight Prediction** | [Groq](https://console.groq.com) | llama-3.3-70b-versatile | AI flight path analysis |
| 📋 **AI SITREP Briefing** | Groq | Multi-model (3 models by category) | Per-category intelligence summary |
| 🗺️ **Conflict Zones** | Groq | llama-3.3-70b-versatile | AI-identified active war/civil conflict countries (rendered as polygons) |

#### AI Model Assignment

| Categories | Model | Rationale |
|-----------|-------|-----------|
| COMBAT, NUCLEAR, Conflict Zones | `llama-3.3-70b-versatile` | Complex geopolitical analysis |
| CYBER, AVIATION | `mixtral-8x7b-32768` | Technical pattern recognition |
| UNREST, SATELLITE, NAVAL, others | `llama-3.1-8b-instant` | Fast event summarization |

---

## Frontend Components

```mermaid
graph TB
    subgraph Page["Index.tsx (Main Page)"]
        direction TB
        HEADER["Header — Layer count + Live status"]
        LEFT["IntelFeed — Live message feed"]
        CENTER["TacticalGlobe — 3D globe"]
        RIGHT["AssetTracker — Counts + selected asset"]
        BOTTOM["StatusBar — System status"]
        LEGEND["LayerLegend — Toggle layers"]
        HUD["HudOverlay — Tactical HUD"]
    end

    subgraph Data["Data Layer"]
        HOOK["useAllIntelData()"]
        TQ2["TanStack Query"]
        API2["API Server /api/intel/*"]
    end

    HOOK --> LEFT & CENTER & RIGHT & BOTTOM
    TQ2 --> HOOK
    API2 --> TQ2
    LEGEND --> CENTER
    HUD --> CENTER

    style Page fill:#0f172a,stroke:#00D2FF,color:#fff
    style Data fill:#0f172a,stroke:#39FF14,color:#fff
```

| Component | Purpose |
|-----------|---------|
| `TacticalGlobe` | 3D interactive globe with points, rings, arcs, conflict zone polygons, and custom canvas sprites |
| `IntelFeed` | Real-time scrolling feed of intel events + collapsible AI SITREP briefings per category |
| `AssetTracker` | Shows event counts per layer + details of selected asset |
| `LayerLegend` | 3-column grid of toggleable layer buttons (12 layers) |
| `HudOverlay` | Tactical heads-up display overlay on the globe |
| `StatusBar` | Footer showing layer counts and connection status |
| `GlobeMarker` | SVG icon definitions for each event category |
| `GlobeSprites` | Canvas-based Three.js sprite rendering for 12 category icons |

---

## API Status & Troubleshooting

### Current API Issues (as of testing)

| Endpoint | Error | Likely Cause | Fix |
|----------|-------|-------------|-----|
| `/intel/conflicts` | 502 (GDELT 404) | GDELT GEO endpoint may have moved | Check [GDELT docs](https://blog.gdeltproject.org/gdelt-geo-2-0-api-searching-the-world/) for updated URL |
| `/intel/unrest` | 400 (ACLED auth) | OAuth token format changed | Re-check [ACLED access](https://acleddata.com/acleddatanew/wp-content/uploads/2021/11/ACLED_APInstructions.pdf) |
| `/intel/aviation` | 401 (OpenSky) | Credentials rejected or rate limit | Register new account at [OpenSky](https://opensky-network.org/index.php/-/login) |
| `/intel/satellite` | Timeout | NASA FIRMS slow or key expired | Regenerate key at [FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/) |
| `/intel/cyber` | 400 (Cloudflare) | Token invalid or API v4 change | Create new token at [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens) |

> **Note:** When external APIs fail, the API server automatically falls back to reading cached data from Supabase. Data will still appear on the globe if it was previously fetched successfully.

### Suggested Free Military/OSINT APIs

| API | Category | Free? | Description |
|-----|----------|-------|-------------|
| [GDELT DOC API](https://api.gdeltproject.org/api/v2/doc/doc) | Conflicts | ✅ | Alternative GDELT endpoint — full-text search with geo extraction. More reliable than GEO API. |
| [ACLED Direct Export](https://acleddata.com/data-export-tool/) | Unrest | ✅ (with account) | CSV download instead of OAuth endpoint — simpler auth flow. |
| [ADS-B Exchange](https://www.adsbexchange.com/data/) | Aviation | ✅ (RapidAPI) | Community-driven aircraft tracking, free tier via RapidAPI. |
| [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/) | Aviation | ✅ (limited) | Flight tracking with 500 free queries/month. |
| [NASA EONET](https://eonet.gsfc.nasa.gov/api/v3/events) | Satellite/Events | ✅ | Earth Observatory Natural Event Tracker — no key required. |
| [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) | Seismic | ✅ | Real-time earthquake data — no key, JSON format. |
| [Global Terrorism Database](https://www.start.umd.edu/gtd/) | Terrorism | ✅ (academic) | Historical terrorism events with lat/lng. |
| [SIPRI Arms Transfers](https://armstrade.sipri.org/armstrade/page/values.php) | Military | ✅ | Arms transfer data between countries. |
| [Military Periscope](https://www.militaryperiscope.com/) | Bases/Assets | ✅ (limited) | Order of battle & equipment databases. |
| [MarineTraffic API](https://www.marinetraffic.com/en/ais-api-services) | Naval | ⚠️ Free trial | AIS vessel tracking (better than OpenShipData). |
| [Shodan](https://www.shodan.io/) | Cyber | ✅ (limited) | Internet-facing device scanner, good for cyber threat mapping. |

---

## Features

- 🌍 Interactive 3D tactical globe with animated canvas sprites, arcs, rings, and conflict zone polygons
- 📡 12 data layers: combat, unrest, aviation, naval, satellite, cyber, nuclear, bases, infrastructure, data centers, oil sites, danger
- 🗄️ Supabase (PostgreSQL) caching — data persists even when external APIs fail
- 🤖 Multi-model AI SITREP briefings per category (Groq — 3 models by domain)
- 🗺️ AI-identified conflict zone overlay (civil wars, insurgencies rendered as country polygons)
- ✈️ AI-powered flight path prediction
- ⚓ Live maritime tracking via Digitraffic AIS (SOG-filtered, recency-checked)
- 🛡️ 99 military bases across 43 countries with Pentagon command link arcs
- 🖥️ 55 AI/cloud data centers worldwide (database-driven, no API needed)
- 🛢️ 56 global oil sites including strategic chokepoints (database-driven)
- 🔌 Submarine cable & pipeline network with arc rendering (23 routes)
- 📊 Auto-refreshing data (60s intervals via TanStack Query)
- 🔒 Row Level Security on all Supabase tables
- ⚡ Hot module reload in dev (Vite frontend + tsx API server)

---

## License

MIT
