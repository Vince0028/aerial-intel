/**
 * Supabase client singleton
 * Uses anon key — make sure RLS policies are set up (see supabase-migration.sql)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    if (_client) return _client;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.warn("[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — DB caching disabled");
        return null;
    }

    _client = createClient(url, key);
    console.log("[supabase] Client initialized");
    return _client;
}
