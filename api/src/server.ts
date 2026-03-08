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
import summarizeRoute from "./routes/summarize.js";
import infrastructureRoute from "./routes/infrastructure.js";
import datacentersRoute from "./routes/datacenters.js";
import oilsitesRoute from "./routes/oilsites.js";
import seismicRoute from "./routes/seismic.js";
import weatherRoute from "./routes/weather.js";
import launchesRoute from "./routes/launches.js";
import cvesRoute from "./routes/cves.js";
import iodaRoute from "./routes/ioda.js";
import ooniRoute from "./routes/ooni.js";
import threatsRoute from "./routes/threats.js";

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
            "/api/intel/summarize",
            "/api/intel/infrastructure",
            "/api/intel/datacenters",
            "/api/intel/oilsites",
            "/api/intel/seismic",
            "/api/intel/weather",
            "/api/intel/launches",
            "/api/intel/cves",
            "/api/intel/ioda",
            "/api/intel/ooni",
            "/api/intel/threats",
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
app.use("/api/intel/summarize", summarizeRoute);
app.use("/api/intel/infrastructure", infrastructureRoute);
app.use("/api/intel/datacenters", datacentersRoute);
app.use("/api/intel/oilsites", oilsitesRoute);
app.use("/api/intel/seismic", seismicRoute);
app.use("/api/intel/weather", weatherRoute);
app.use("/api/intel/launches", launchesRoute);
app.use("/api/intel/cves", cvesRoute);
app.use("/api/intel/ioda", iodaRoute);
app.use("/api/intel/ooni", ooniRoute);
app.use("/api/intel/threats", threatsRoute);

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
