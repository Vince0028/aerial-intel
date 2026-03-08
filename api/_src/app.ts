/**
 * app.ts — Express application (no server listen).
 * Imported by server.ts (local dev) and api/index.ts (Vercel serverless).
 */
import express from "express";
import cors from "cors";

// Routes
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
import cleanupRoute from "./routes/cleanup.js";

const app = express();

// ─── CORS ───────────────────────────────────────────────────────────────────
// In production (Vercel) the frontend and API share the same domain via rewrites,
// so same-origin requests have no Origin header at all — CORS is irrelevant.
// We still allow localhost + any ALLOWED_ORIGINS env var for dev/staging.
const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
]);

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow requests with no Origin (same-domain, Vercel cron, curl)
            if (!origin || allowedOrigins.has(origin)) return cb(null, true);
            // Allow any *.vercel.app domain for preview deployments
            if (/\.vercel\.app$/.test(origin)) return cb(null, true);
            cb(null, true); // Permissive — tighten if needed
        },
    })
);

app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({
        status: "operational",
        service: "Aerial Intel API",
        timestamp: new Date().toISOString(),
    });
});

// ─── Intel routes ────────────────────────────────────────────────────────────
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
app.use("/api/cleanup", cleanupRoute);

export default app;
