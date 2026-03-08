# Aerial Intel — API Proxy

Express.js API proxy server that fetches from external intelligence sources, caches to Supabase, and normalizes data into a unified `IntelEvent` schema. Includes AI-powered analysis via Groq (3 models).

## Setup

```sh
cp .env.example .env   # Then fill in your API keys
npm install
npm run dev            # Starts on port 3001 with hot reload
```

## Environment Variables

| Variable | Source | Required | How to Get |
|----------|--------|----------|-----------|
| `SUPABASE_URL` | Supabase | **Yes** | Project URL from [supabase.com](https://supabase.com) Settings → API |
| `SUPABASE_ANON_KEY` | Supabase | **Yes** | Anon public key from Settings → API |
| `GROQ_API_KEY` | Groq | **Yes** | Free at [console.groq.com](https://console.groq.com) |
| `ACLED_API_KEY` | ACLED | Optional | Register at [acleddata.com](https://acleddata.com) with .edu email |
| `ACLED_EMAIL` | ACLED | Optional | Your registration email |
| `NASA_FIRMS_MAP_KEY` | NASA FIRMS | Optional | Request at [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | Optional | Free from [Radar dashboard](https://radar.cloudflare.com) |
| `OPENSKY_USERNAME` | OpenSky | Optional | [opensky-network.org](https://opensky-network.org) — increases rate limit |
| `OPENSKY_PASSWORD` | OpenSky | Optional | Falls back to anonymous if credentials fail |

## Endpoints

| Method | Path | Source | Auth | Count |
|--------|------|--------|------|-------|
| GET | `/api/health` | — | None | — |
| GET | `/api/intel/conflicts` | GDELT 2.0 | None | varies |
| GET | `/api/intel/unrest` | ACLED | Key | varies |
| GET | `/api/intel/aviation` | OpenSky | Optional | varies |
| GET | `/api/intel/satellite` | NASA FIRMS | Key | varies |
| GET | `/api/intel/cyber` | Cloudflare | Token | varies |
| GET | `/api/intel/nuclear` | Supabase seed | None | 12 |
| GET | `/api/intel/naval` | Digitraffic + seed | None | ~13 |
| GET | `/api/intel/bases` | Supabase seed | None | 99 |
| GET | `/api/intel/infrastructure` | Supabase seed | None | 48 pts + 23 routes |
| GET | `/api/intel/datacenters` | Supabase (DB-driven) | None | 55 |
| GET | `/api/intel/oilsites` | Supabase (DB-driven) | None | 56 |
| GET | `/api/intel/conflict-zones` | Groq AI | Key | 10-25 zones |
| POST | `/api/intel/summarize` | Groq AI (multi-model) | Key | — |
| POST | `/api/intel/predict` | Groq AI | Key | — |

> **DB-driven routes** (`datacenters`, `oilsites`) auto-seed Supabase on first request — no external API or API key needed.

## Response Schema

All GET endpoints return:
```json
{
  "events": [IntelEvent],
  "source": "API name",
  "count": 42
}
```

`IntelEvent` shape:
```json
{
  "id": "DC-001",
  "type": "DATACENTER",
  "lat": 39.04,
  "lng": -77.49,
  "intensity": 10,
  "label": "Ashburn, VA — World's Data Center Capital",
  "color": "#A855F7",
  "timestamp": "2026-03-08T12:00:00Z",
  "meta": { "operator": "AWS / Microsoft / Google", "capacity": "2000+ MW" }
}
```

## Event Types

| Type | Color | Source |
|------|-------|--------|
| `COMBAT` | `#FF3131` | GDELT |
| `UNREST` | `#FFBD59` | ACLED |
| `AVIATION` | `#00D2FF` | OpenSky |
| `SATELLITE` | `#FF00FF` | NASA FIRMS |
| `CYBER` | `#FF1493` | Cloudflare |
| `NUCLEAR` | `#39FF14` | Seed data |
| `NAVAL` | `#7D5FFF` | Digitraffic + seed |
| `BASE` | `#FFFFFF` | Seed data |
| `INFRASTRUCTURE` | `#00BFFF` | Seed data |
| `DATACENTER` | `#A855F7` | Supabase (DB-driven) |
| `OILSITE` | `#F59E0B` | Supabase (DB-driven) |
| `DANGER` | `#FF6B35` | Derived |
