import { Router, type Request, type Response } from "express";
import { type IntelEvent, LAYER_COLORS } from "../types.js";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";

const TABLE = "unrest";
const router = Router();

// Cache the token so we don't re-auth every request
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get an OAuth access token from ACLED using email + password
 * ACLED requires application/x-www-form-urlencoded (NOT JSON)
 * Docs: https://acleddata.com/api-documentation/getting-started
 */
async function getAcledToken(): Promise<string | null> {
    // Reuse cached token if still valid (tokens last 24h, we refresh every 12h)
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const email = process.env.ACLED_EMAIL;
    const password = process.env.ACLED_PASSWORD;
    if (!email || !password) return null;

    try {
        const body = new URLSearchParams({
            username: email,
            password: password,
            grant_type: "password",
            client_id: "acled",
        });

        const res = await fetch("https://acleddata.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`ACLED auth responded ${res.status}: ${text.slice(0, 200)}`);
        }
        const data = await res.json() as any;

        cachedToken = data.access_token;
        tokenExpiry = Date.now() + 12 * 60 * 60 * 1000; // refresh in 12 hours
        console.log("[unrest] ACLED OAuth token acquired");
        return cachedToken;
    } catch (err: any) {
        console.error("[unrest] ACLED auth failed:", err.message);
        return null;
    }
}

/**
 * GET /api/intel/unrest
 * Fetches protest/riot data from ACLED using OAuth token auth
 * Endpoint: https://acleddata.com/api/acled/read
 */
router.get("/", async (_req: Request, res: Response) => {
    const token = await getAcledToken();

    if (!token) {
        // No credentials — try Supabase cache first
        const cached = await readCachedEvents(TABLE, 7);
        if (cached && cached.events.length > 0) {
            console.log("[unrest] No ACLED credentials, serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }
        return res.status(200).json({
            events: [],
            source: "ACLED (no credentials configured)",
            count: 0,
            hint: "Set ACLED_EMAIL and ACLED_PASSWORD in .env — register free at acleddata.com",
        });
    }

    try {
        // ACLED returns oldest events first by default — use year filter to only
        // get current/recent data, then filterFreshEvents as a safety net
        const currentYear = new Date().getFullYear();
        const url = `https://acleddata.com/api/acled/read?limit=50&event_type=Protests:OR:event_type=Riots&year=${currentYear}|${currentYear - 1}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) throw new Error(`ACLED responded ${response.status}`);

        const data = await response.json() as any;

        const events: IntelEvent[] = (data.data || []).map((e: any) => ({
            id: `ACLED-${e.event_id_cnty}`,
            type: "UNREST" as const,
            lat: parseFloat(e.latitude) || 0,
            lng: parseFloat(e.longitude) || 0,
            intensity: Math.min(10, Math.max(1, (parseInt(e.fatalities) || 0) + 3)),
            label: `${e.event_type}: ${e.sub_event_type || ""} — ${e.admin1 || ""}, ${e.country}`,
            color: LAYER_COLORS.UNREST,
            timestamp: e.event_date || new Date().toISOString(),
            meta: {
                source: "ACLED",
                country: e.country,
                fatalities: e.fatalities,
                notes: (e.notes || "").slice(0, 200),
            },
        }));

        // ACLED has a natural data publication lag (weeks-to-months) so we use
        // a wider freshness window. The year filter already prevents ancient data.
        const freshEvents = filterFreshEvents(events, 17); // Feb 20 – Mar 8 window
        upsertEvents(TABLE, freshEvents, "ACLED API (OAuth)").catch(() => {});

        res.json({ events: freshEvents, source: "ACLED API (OAuth)", count: freshEvents.length });
    } catch (err: any) {
        console.error("[unrest]", err.message);
        if (err.message.includes("401")) {
            cachedToken = null;
            tokenExpiry = 0;
        }

        // Fallback: Supabase cache
        const cached = await readCachedEvents(TABLE, 7);
        if (cached && cached.events.length > 0) {
            console.log("[unrest] Serving from Supabase cache");
            return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
        }

        res.status(502).json({ error: "Failed to fetch unrest data", detail: err.message });
    }
});

export default router;
