import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

/**
 * Model selection per domain — high-stakes categories get the biggest model.
 */
const CATEGORY_MODELS: Record<string, string> = {
    COMBAT:    "llama-3.3-70b-versatile",
    NUCLEAR:   "llama-3.3-70b-versatile",
    CYBER:     "mixtral-8x7b-32768",
    AVIATION:  "mixtral-8x7b-32768",
    UNREST:    "llama-3.1-8b-instant",
    SATELLITE: "llama-3.1-8b-instant",
    NAVAL:     "llama-3.1-8b-instant",
    BASE:      "llama-3.1-8b-instant",
};
const DEFAULT_MODEL = "llama-3.1-8b-instant";

/** Supabase cache TTL — 30 minutes */
const CACHE_TTL_MS = 30 * 60 * 1000;

/** In-memory fallback so Supabase lag doesn't cause double-calls */
const memCache = new Map<string, { summary: string; model: string; ts: number }>();

interface SummarizeEvent {
    label: string;
    type: string;
    intensity: number;
}

async function callGroq(model: string, category: string, events: SummarizeEvent[], apiKey: string): Promise<string> {
    const eventLines = events
        .slice(0, 25)
        .map((e, i) => `${i + 1}. intensity=${e.intensity}/10 — ${e.label}`)
        .join("\n");

    const categoryLabel = category.charAt(0) + category.slice(1).toLowerCase();

    const prompt = `You are a military intelligence analyst. Write a SITREP for the ${categoryLabel} domain.

Rules:
- Use bullet points only (start each with -)
- 4 to 6 bullets maximum
- Each bullet is one short sentence, under 15 words
- No em dashes, no markdown bold, no headers
- Plain direct military language
- Lead with the highest threat finding
- State location, threat type, and severity where relevant

${category} EVENTS:
${eventLines}

SITREP:`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 300,
        }),
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Groq [${model}] ${res.status}`);
    const data = await res.json() as any;
    return (data.choices?.[0]?.message?.content || "").trim();
}

/**
 * POST /api/intel/summarize
 * Body: { category: string, events: SummarizeEvent[] }
 * Returns: { summary, model, category, source }
 *
 * Cache chain: memory → Supabase ai_summaries table → fresh Groq call → save to Supabase
 */
router.post("/", async (req: Request, res: Response) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "GROQ_API_KEY not configured" });

    const { category, events }: { category: string; events: SummarizeEvent[] } = req.body;
    if (!category || !events?.length) {
        return res.json({ summary: "", category, source: "empty" });
    }

    const cat = category.toUpperCase();

    // 1. In-memory cache
    const mem = memCache.get(cat);
    if (mem && Date.now() - mem.ts < CACHE_TTL_MS) {
        return res.json({ summary: mem.summary, model: mem.model, category: cat, source: "memory-cache" });
    }

    // 2. Supabase cache
    const sb = getSupabase();
    if (sb) {
        try {
            const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
            const { data: rows } = await sb
                .from("ai_summaries")
                .select("summary, model_used, created_at")
                .eq("category", cat)
                .gte("created_at", cutoff)
                .order("created_at", { ascending: false })
                .limit(1);

            if (rows && rows.length > 0) {
                const { summary, model_used } = rows[0];
                memCache.set(cat, { summary, model: model_used, ts: Date.now() });
                return res.json({ summary, model: model_used, category: cat, source: "supabase-cache" });
            }
        } catch (_) { /* ai_summaries table doesn't exist yet — skip to Groq */ }
    }

    // 3. Fresh Groq call
    const model = CATEGORY_MODELS[cat] ?? DEFAULT_MODEL;
    try {
        const summary = await callGroq(model, cat, events, apiKey);

        // Persist to Supabase — wrapped separately so a missing table or RLS error
        // does NOT discard the freshly-generated summary
        if (sb && summary) {
            try {
                await sb.from("ai_summaries").upsert(
                    { category: cat, summary, model_used: model, created_at: new Date().toISOString() },
                    { onConflict: "category" }
                );
            } catch (dbErr: any) {
                console.warn(`[summarize] Supabase save failed for ${cat}:`, dbErr.message);
            }
        }

        memCache.set(cat, { summary, model, ts: Date.now() });
        console.log(`[summarize] ${cat} via ${model} (${events.length} events)`);

        res.json({ summary, model, category: cat, source: "groq" });
    } catch (err: any) {
        console.error(`[summarize] ${cat}:`, err.message);

        // Serve stale Supabase entry if Groq fails (table may not exist yet — safe to ignore)
        if (sb) {
            try {
                const { data: stale } = await sb
                    .from("ai_summaries")
                    .select("summary, model_used")
                    .eq("category", cat)
                    .order("created_at", { ascending: false })
                    .limit(1);
                if (stale?.[0]) {
                    return res.json({ summary: stale[0].summary, model: stale[0].model_used, category: cat, source: "stale-cache" });
                }
            } catch (_) { /* table doesn't exist yet — fall through */ }
        }

        res.json({ summary: "", category: cat, source: "error", error: err.message });
    }
});

export default router;
