import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load .env
dotenv.config();

// Initialize Supabase (if credentials are set)
import { getSupabase } from "./supabaseClient.js";

// Import routes
import conflictsRoute from "./routes/conflicts.js";
import unrestRoute from "./routes/unrest.js";
import aviationRoute from "./routes/aviation.js";
import satelliteRoute from "./routes/satellite.js";
import cyberRoute from "./routes/cyber.js";
import nuclearRoute from "./routes/nuclear.js";
import navalRoute from "./routes/naval.js";
import basesRoute from "./routes/bases.js";
import predictRoute from "./routes/predict.js";
import conflictZonesRoute from "./routes/conflictZones.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        status: "operational",
        service: "Aerial Intel API",
        timestamp: new Date().toISOString(),
        endpoints: [
            "/api/intel/conflicts",
            "/api/intel/unrest",
            "/api/intel/aviation",
            "/api/intel/satellite",
            "/api/intel/cyber",
            "/api/intel/nuclear",
            "/api/intel/naval",
            "/api/intel/bases",
            "/api/intel/predict",
            "/api/intel/conflict-zones",
        ],
    });
});

// Intel routes
app.use("/api/intel/conflicts", conflictsRoute);
app.use("/api/intel/unrest", unrestRoute);
app.use("/api/intel/aviation", aviationRoute);
app.use("/api/intel/satellite", satelliteRoute);
app.use("/api/intel/cyber", cyberRoute);
app.use("/api/intel/nuclear", nuclearRoute);
app.use("/api/intel/naval", navalRoute);
app.use("/api/intel/bases", basesRoute);
app.use("/api/intel/predict", predictRoute);
app.use("/api/intel/conflict-zones", conflictZonesRoute);

// Start server
app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   AERIAL INTEL API — PORT ${PORT}            ║`);
    console.log(`  ║   Status: OPERATIONAL                    ║`);
    console.log(`  ║   Health: http://localhost:${PORT}/api/health ║`);
    console.log(`  ╚══════════════════════════════════════════╝`);
    const sb = getSupabase();
    console.log(`  DB Cache: ${sb ? "✓ Supabase connected" : "✗ Supabase not configured (using in-memory only)"}\n`);
});

export default app;
