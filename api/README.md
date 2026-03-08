# Aerial Intel — API Proxy

Express.js API proxy server that fetches from external intelligence sources and normalizes data into a unified `IntelEvent` schema.

## Setup

```sh
cp .env.example .env   # Then fill in your API keys
npm install
npm run dev            # Starts on port 3001 with hot reload
```

## Environment Variables

| Variable | Source | How to Get |
|----------|--------|-----------|
| `ACLED_API_KEY` | ACLED | Register at [acleddata.com](https://acleddata.com) with .edu email |
| `ACLED_EMAIL` | ACLED | Your registration email |
| `NASA_FIRMS_MAP_KEY` | NASA FIRMS | Request at [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) |
| `GROQ_API_KEY` | Groq | Free at [console.groq.com](https://console.groq.com) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | Free from [Radar dashboard](https://radar.cloudflare.com) |
| `OPENSKY_USERNAME` | OpenSky | Optional — [opensky-network.org](https://opensky-network.org) |
| `OPENSKY_PASSWORD` | OpenSky | Optional — increases rate limit to 4000/day |

## Endpoints

| Method | Path | Source | Auth |
|--------|------|--------|------|
| GET | `/api/health` | — | None |
| GET | `/api/intel/conflicts` | GDELT 2.0 | None |
| GET | `/api/intel/unrest` | ACLED | Key |
| GET | `/api/intel/aviation` | OpenSky | Optional |
| GET | `/api/intel/satellite` | NASA FIRMS | Key |
| GET | `/api/intel/cyber` | Cloudflare | Token |
| GET | `/api/intel/nuclear` | Static DB | None |
| GET | `/api/intel/naval` | Static Intel | None |
| GET | `/api/intel/bases` | Static Intel | None |
| POST | `/api/intel/predict` | Groq AI | Key |

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
  "id": "GDELT-123",
  "type": "COMBAT",
  "lat": 50.4,
  "lng": 30.5,
  "intensity": 8,
  "label": "Conflict reported near Kyiv",
  "color": "#FF3131",
  "timestamp": "2026-03-08T12:00:00Z",
  "meta": { "source": "GDELT", "url": "..." }
}
```
