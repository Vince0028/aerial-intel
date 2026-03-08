/**
 * cves.ts — Critical vulnerabilities from NIST NVD API v2
 * API: https://services.nvd.nist.gov/rest/json/cves/2.0
 * No API key required (5 req / 30 sec). Rate-limit friendly with mem-cache.
 * CVEs are geo-mapped to affected vendor HQ locations.
 */
import { Router, type Request, type Response } from "express";
import { upsertEvents, readCachedEvents, filterFreshEvents } from "../dbCache.js";
import { type IntelEvent, LAYER_COLORS } from "../types.js";

const router = Router();
const TABLE = "cves";
const COLOR = LAYER_COLORS.CVE;

let memCache: { events: IntelEvent[]; ts: number } | null = null;
const MEM_TTL = 30 * 60_000; // 30 min (respect NVD rate limits)

// Major tech vendor HQs for geo-mapping CVEs
const VENDOR_COORDS: Record<string, [number, number]> = {
    microsoft: [47.6405, -122.1295],   // Redmond WA
    apple: [37.3349, -122.0090],       // Cupertino CA
    google: [37.4220, -122.0841],      // Mountain View CA
    cisco: [37.4089, -121.9530],       // San Jose CA
    oracle: [37.5295, -122.2660],      // Redwood City CA
    adobe: [37.3311, -121.8910],       // San Jose CA
    ibm: [41.1178, -73.7198],         // Armonk NY
    intel: [37.3875, -121.9636],       // Santa Clara CA
    samsung: [37.2580, 127.0000],      // Suwon, Korea
    linux: [45.5210, -122.6765],       // Portland (Linux Foundation)
    redhat: [35.7796, -78.6382],       // Raleigh NC
    canonical: [51.5235, -0.0851],     // London
    debian: [48.8566, 2.3522],         // Paris
    apache: [37.7749, -122.4194],      // SF (Apache Foundation)
    wordpress: [37.7749, -122.4194],   // SF (Automattic)
    android: [37.4220, -122.0841],     // Mountain View
    chrome: [37.4220, -122.0841],      // Mountain View
    firefox: [37.3891, -122.0582],     // Mozilla MV
    mozilla: [37.3891, -122.0582],     // Mozilla MV
    vmware: [37.4022, -121.9500],      // Palo Alto
    fortinet: [37.4003, -122.0780],    // Sunnyvale CA
    paloalto: [37.4419, -122.1430],    // Santa Clara CA
    qualcomm: [32.8987, -117.2033],    // San Diego CA
    nvidia: [37.3707, -122.0375],      // Santa Clara CA
    huawei: [22.6528, 114.0579],       // Shenzhen
    zte: [22.5431, 114.0579],          // Shenzhen
    siemens: [48.1351, 11.5820],       // Munich
    sap: [49.2937, 8.6432],            // Walldorf, Germany
    dell: [30.2260, -97.7634],         // Round Rock TX
    hp: [37.4419, -122.1430],          // Palo Alto
    lenovo: [22.8000, 108.3200],       // China (HQ varies)
    aws: [47.6205, -122.3493],         // Seattle
    amazon: [47.6205, -122.3493],      // Seattle
    meta: [37.4848, -122.1484],        // Menlo Park
    facebook: [37.4848, -122.1484],    // Menlo Park
    tencent: [22.5431, 113.9368],      // Shenzhen
    alibaba: [30.2741, 120.1551],      // Hangzhou
    sophos: [51.7520, -1.2577],        // Oxford UK
    kaspersky: [55.7558, 37.6173],     // Moscow
};

// Default cluster coordinates for CVEs with unrecognized vendors
const CYBER_HUBS: [number, number][] = [
    [38.9535, -77.1467],  // NSA / Fort Meade
    [37.7749, -122.4194], // San Francisco
    [51.5074, -0.1278],   // London
    [35.6762, 139.6503],  // Tokyo
    [1.3521, 103.8198],   // Singapore
];

function findVendorCoords(description: string, cpeVendors: string[]): [number, number] {
    // Try to match CPE vendors first
    for (const v of cpeVendors) {
        const key = v.toLowerCase();
        if (VENDOR_COORDS[key]) return VENDOR_COORDS[key];
    }
    // Fall back to keyword match in description
    const lower = description.toLowerCase();
    for (const [vendor, coords] of Object.entries(VENDOR_COORDS)) {
        if (lower.includes(vendor)) return coords;
    }
    // Pick a random cyber hub
    return CYBER_HUBS[Math.floor(Math.random() * CYBER_HUBS.length)];
}

function cvssToIntensity(score: number): number {
    if (score >= 9.0) return 10;
    if (score >= 8.0) return 9;
    if (score >= 7.0) return 8;
    if (score >= 5.0) return 6;
    return 4;
}

async function fetchNVD(): Promise<IntelEvent[]> {
    // Use fixed window: Feb 20, 2026 to Mar 8, 2026
    const from = "2026-02-20T00:00:00";
    const to = "2026-03-08T23:59:59";
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${from}&pubEndDate=${to}&cvssV3Severity=CRITICAL&resultsPerPage=60`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`NVD ${res.status}`);
    const data = await res.json() as any;

    const events: IntelEvent[] = [];
    for (const vuln of data.vulnerabilities || []) {
        const cve = vuln.cve;
        const id = cve.id; // e.g. CVE-2024-12345
        const description = cve.descriptions?.find((d: any) => d.lang === "en")?.value || "No description";
        const published = cve.published || new Date().toISOString();

        // Extract CVSS score
        const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV3?.[0];
        const baseScore = metrics?.cvssData?.baseScore || 9.0;
        const severity = metrics?.cvssData?.baseSeverity || "CRITICAL";

        // Extract affected vendors from CPE
        const cpeVendors: string[] = [];
        for (const config of cve.configurations || []) {
            for (const node of config.nodes || []) {
                for (const match of node.cpeMatch || []) {
                    const parts = match.criteria?.split(":") || [];
                    if (parts.length > 3) cpeVendors.push(parts[3]);
                }
            }
        }

        const [lat, lng] = findVendorCoords(description, cpeVendors);

        events.push({
            id: `CVE-${id}`,
            type: "CVE",
            lat: lat + (Math.random() - 0.5) * 0.5, // slight jitter so dots don't overlap
            lng: lng + (Math.random() - 0.5) * 0.5,
            intensity: cvssToIntensity(baseScore),
            label: `${id} (${baseScore}) — ${description.slice(0, 100)}`,
            color: COLOR,
            timestamp: published,
            meta: {
                cve_id: id,
                cvss: baseScore,
                severity,
                vendors: cpeVendors.slice(0, 5).join(", "),
                description: description.slice(0, 400),
            },
        });
    }
    return events;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        if (memCache && Date.now() - memCache.ts < MEM_TTL) {
            return res.json({ events: memCache.events, source: "NVD (mem-cache)", count: memCache.events.length });
        }

        let events: IntelEvent[] = [];
        let source = "NIST NVD";
        try {
            const raw = await fetchNVD();
            events = filterFreshEvents(raw, 17);
            if (events.length > 0) {
                memCache = { events, ts: Date.now() };
                await upsertEvents(TABLE, events, source);
            }
        } catch (err: any) {
            console.warn(`[cves] NVD fetch failed: ${err.message}`);
        }

        if (events.length === 0) {
            const cached = await readCachedEvents(TABLE, 7);
            if (cached && cached.events.length > 0) {
                memCache = { events: cached.events, ts: Date.now() };
                return res.json({ events: cached.events, source: cached.source, count: cached.events.length });
            }
        }

        return res.json({ events, source, count: events.length });
    } catch (err: any) {
        console.error("[cves] Error:", err.message);
        return res.json({ events: [], source: "Error", count: 0 });
    }
});

export default router;
