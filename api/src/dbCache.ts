/**
 * dbCache — shared helpers to read/write intel events from Supabase tables.
 *
 * Flow per route:
 *  1. Try to fetch fresh data from the external API
 *  2. If successful → upsert rows into Supabase, delete stale rows, return fresh data
 *  3. If external API fails → read cached data from Supabase
 *  4. If Supabase is also empty/unavailable → caller falls back to hardcoded data
 */
import { getSupabase } from "./supabaseClient.js";
import { type IntelEvent } from "./types.js";

interface CachedRow {
    id: string;
    type: string;
    lat: number;
    lng: number;
    intensity: number;
    label: string;
    color: string;
    timestamp: string;
    meta: Record<string, any>;
    source: string;
    fetched_at: string;
}

/** Convert an IntelEvent to a DB row shape */
function toRow(evt: IntelEvent, source: string): CachedRow {
    return {
        id: evt.id,
        type: evt.type,
        lat: evt.lat,
        lng: evt.lng,
        intensity: evt.intensity,
        label: evt.label,
        color: evt.color,
        timestamp: evt.timestamp,
        meta: evt.meta ?? {},
        source,
        fetched_at: new Date().toISOString(),
    };
}

/** Convert a DB row back to the API response event shape */
function toEvent(row: CachedRow): IntelEvent {
    return {
        id: row.id,
        type: row.type as IntelEvent["type"],
        lat: row.lat,
        lng: row.lng,
        intensity: row.intensity,
        label: row.label,
        color: row.color,
        timestamp: row.timestamp,
        meta: row.meta,
    };
}

/**
 * Filter events to only keep those with timestamps within the last N days.
 * Rejects events with unparseable or missing timestamps.
 * Use this before upserting to prevent stale/old data from polluting the cache.
 */
export function filterFreshEvents(events: IntelEvent[], maxAgeDays: number): IntelEvent[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    return events.filter(e => {
        if (!e.timestamp) return false;
        const ts = new Date(e.timestamp);
        return !isNaN(ts.getTime()) && ts >= cutoff;
    });
}

/**
 * Upsert fresh events into a Supabase table, then delete rows
 * that were NOT part of this batch (stale data cleanup).
 */
export async function upsertEvents(
    table: string,
    events: IntelEvent[],
    source: string,
): Promise<void> {
    const sb = getSupabase();
    if (!sb || events.length === 0) return;

    try {
        const rows = events.map((e) => toRow(e, source));

        // Upsert all rows (insert or update on conflict with id)
        const { error: upsertErr } = await sb
            .from(table)
            .upsert(rows, { onConflict: "id" });

        if (upsertErr) {
            console.error(`[dbCache] upsert ${table}:`, upsertErr.message);
            return;
        }

        // Delete old rows that aren't in the new batch
        const freshIds = events.map((e) => e.id);
        const { error: deleteErr } = await sb
            .from(table)
            .delete()
            .not("id", "in", `(${freshIds.map((id) => `"${id}"`).join(",")})`);

        if (deleteErr) {
            console.error(`[dbCache] cleanup ${table}:`, deleteErr.message);
        }
    } catch (err: any) {
        console.error(`[dbCache] upsertEvents ${table}:`, err.message);
    }
}

/**
 * Read all cached events from a Supabase table.
 * Returns null if Supabase is not configured or the table is empty.
 */
export async function readCachedEvents(
    table: string,
    maxCacheAgeDays?: number,
): Promise<{ events: IntelEvent[]; source: string } | null> {
    const sb = getSupabase();
    if (!sb) return null;

    try {
        let query = sb
            .from(table)
            .select("*");

        // Only serve recently-cached rows (prevents serving ancient stale data)
        if (maxCacheAgeDays !== undefined) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - maxCacheAgeDays);
            query = query.gte("fetched_at", cutoff.toISOString());
        }

        const { data, error } = await query.order("fetched_at", { ascending: false });

        if (error) {
            console.error(`[dbCache] read ${table}:`, error.message);
            return null;
        }

        if (!data || data.length === 0) return null;

        const events = (data as CachedRow[]).map(toEvent);
        const source = (data[0] as CachedRow).source || "Supabase Cache";
        return { events, source: `${source} (cached)` };
    } catch (err: any) {
        console.error(`[dbCache] readCachedEvents ${table}:`, err.message);
        return null;
    }
}
