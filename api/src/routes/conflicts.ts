import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";

const TABLE = "conflicts";
const router = Router();

/**
 * Country → approximate center coordinates for mapping GDELT articles
 */
const COUNTRY_COORDS: Record<string, [number, number]> = {
    "United States": [39.8, -98.6], "United Kingdom": [55.4, -3.4], "Germany": [51.2, 10.4],
    "France": [46.2, 2.2], "Russia": [61.5, 105.3], "China": [35.9, 104.2],
    "India": [20.6, 79.0], "Brazil": [-14.2, -51.9], "Ukraine": [48.4, 31.2],
    "Iran": [32.4, 53.7], "Syria": [34.8, 39.0], "Iraq": [33.2, 43.7],
    "Israel": [31.0, 34.8], "Palestine": [31.9, 35.2], "Egypt": [26.8, 30.8],
    "Saudi Arabia": [23.9, 45.1], "Pakistan": [30.4, 69.3], "Turkey": [38.9, 35.2],
    "Nigeria": [9.1, 8.7], "Ethiopia": [9.1, 40.5], "Myanmar": [21.9, 95.9],
    "Afghanistan": [33.9, 67.7], "Philippines": [12.9, 121.8], "Japan": [36.2, 138.3],
    "South Korea": [35.9, 127.8], "North Korea": [40.3, 127.5], "Sudan": [12.9, 30.2],
    "Libya": [26.3, 17.2], "Venezuela": [6.4, -66.6], "Colombia": [4.6, -74.3],
    "Mexico": [23.6, -102.5], "Lebanon": [33.9, 35.5], "Yemen": [15.6, 48.5],
    "Somalia": [5.2, 46.2], "Democratic Republic of the Congo": [-4.0, 21.8],
    "Mali": [17.6, -4.0], "Mozambique": [-18.7, 35.5], "Taiwan": [23.7, 120.9],
    "Poland": [51.9, 19.1], "Canada": [56.1, -106.3], "Australia": [-25.3, 133.8],
    "South Africa": [-30.6, 22.9], "Kenya": [-0.02, 37.9], "Algeria": [28.0, 1.7],
    "Morocco": [31.8, -7.1], "Tunisia": [33.9, 9.5], "Indonesia": [-0.8, 113.9],
    "Thailand": [15.9, 100.9], "Vietnam": [14.1, 108.3],
};

/**
 * GET /api/intel/conflicts
 * Fetches conflict/war/military news via GDELT DOC API v2 (ArtList mode)
 * Maps source countries → lat/lng for globe display
 * Falls back to Supabase cache on failure
 * Includes retry with backoff for GDELT rate-limiting (429)
 */
router.get("/", async (_req: Request, res: Response) => {
    const MAX_ATTEMPTS = 2;
    const RETRY_DELAY_MS = 6000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const url =
                "https://api.gdeltproject.org/api/v2/doc/doc?query=(conflict%20OR%20war%20OR%20military%20OR%20attack%20OR%20airstrike)&mode=ArtList&maxrecords=75&format=json&timespan=24h&sort=DateDesc";

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                // If rate-limited on first attempt, wait and retry
                if (response.status === 429 && attempt < MAX_ATTEMPTS) {
                    console.log(`[conflicts] GDELT 429 rate-limit, retrying in ${RETRY_DELAY_MS / 1000}s...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                    continue;
                }
                throw new Error(`GDELT responded ${response.status}`);
            }

            // GDELT sometimes returns plain text error messages instead of JSON
            const contentType = response.headers.get("content-type") || "";
            const text = await response.text();
            if (!contentType.includes("json") && !text.startsWith("{")) {
                throw new Error(`GDELT returned non-JSON: ${text.slice(0, 100)}`);
            }

            const data = JSON.parse(text) as any;
            const articles: any[] = data.articles || [];

            // Deduplicate by country to spread points across the globe
            const seenCountries = new Set<string>();
            const events: IntelEvent[] = [];

            for (let i = 0; i < articles.length && events.length < 50; i++) {
                const art = articles[i];
                const country = art.sourcecountry || "Unknown";
                const coords = COUNTRY_COORDS[country];
                if (!coords) continue; // skip if we can't map the country

                // Jitter so multiple events in the same country don't overlap
                const jitter = seenCountries.has(country) ? (Math.random() - 0.5) * 3 : 0;
                seenCountries.add(country);

                events.push({
                    id: `GDELT-${i}-${(art.url || "").replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`,
                    type: "COMBAT" as const,
                    lat: coords[0] + jitter,
                    lng: coords[1] + jitter,
                    intensity: Math.min(10, Math.max(3, Math.round(art.tone ? Math.abs(art.tone) : 5))),
                    label: (art.title || "Conflict event").slice(0, 120),
                    color: LAYER_COLORS.COMBAT,
                    timestamp: art.seendate
                        ? `${art.seendate.slice(0, 4)}-${art.seendate.slice(4, 6)}-${art.seendate.slice(6, 8)}T${art.seendate.slice(9, 11)}:${art.seendate.slice(11, 13)}:00Z`
                        : new Date().toISOString(),
                    meta: {
                        source: "GDELT",
                        url: art.url,
                        domain: art.domain,
                        sourceCountry: country,
                        language: art.language,
                    },
                });
            }

            // Only keep events with recent timestamps (reject old/stale articles)
            const freshEvents = filterFreshEvents(events, 7);

            // Cache to Supabase — await to ensure data is stored for fallback
            upsertEvents(TABLE, freshEvents, "GDELT DOC API v2").catch(e =>
                console.error("[conflicts] cache write failed:", e.message));

            return res.json({ events: freshEvents, source: "GDELT DOC API v2", count: freshEvents.length });
        } catch (err: any) {
            // If first attempt failed with a retryable error, loop continues
            if (attempt < MAX_ATTEMPTS && (err.message.includes("429") || err.message.includes("rate"))) {
                console.log(`[conflicts] Attempt ${attempt} failed, retrying...`);
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                continue;
            }

            console.error("[conflicts]", err.message);

            // Fallback: read from Supabase cache (max 3 days old)
            const cached = await readCachedEvents(TABLE, 3);
            if (cached && cached.events.length > 0) {
                console.log("[conflicts] Serving from Supabase cache");
                return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
            }

            return res.status(502).json({ error: "Failed to fetch conflict data", detail: err.message });
        }
    }
});

export default router;
