/**
 * Vercel serverless entry point.
 *
 * Vercel builds this file and exposes the Express app as a serverless function.
 * All /api/* requests are routed here via vercel.json rewrites.
 *
 * Environment variables are set in Vercel Dashboard → Project → Settings →
 * Environment Variables. dotenv.config() is called for local fallback only
 * (it's a harmless no-op when no .env file exists).
 */
import dotenv from "dotenv";
dotenv.config();

import app from "./_src/app.js";

export default app;
