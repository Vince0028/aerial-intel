import dotenv from "dotenv";
dotenv.config(); // loads .env for local dev (no-op in production)

import { getSupabase } from "./supabaseClient.js";
import app from "./app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   AERIAL INTEL API — PORT ${PORT}            ║`);
    console.log(`  ║   Status: OPERATIONAL                    ║`);
    console.log(`  ║   Health: http://localhost:${PORT}/api/health ║`);
    console.log(`  ╚══════════════════════════════════════════╝`);
    const sb = getSupabase();
    console.log(`  DB Cache: ${sb ? "✓ Supabase connected" : "✗ Supabase not configured (using in-memory only)"}\n`);
});
