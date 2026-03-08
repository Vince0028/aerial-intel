import { useState, useCallback, useMemo, useEffect } from 'react';
import TacticalGlobe, { type GlobePoint, type ArcRoute, type ConflictZonePolygon } from '@/components/TacticalGlobe';
import IntelFeed from '@/components/IntelFeed';
import AssetTracker from '@/components/AssetTracker';
import StatusBar from '@/components/StatusBar';
import HudOverlay from '@/components/HudOverlay';
import LayerLegend from '@/components/LayerLegend';
import { type LayerKey, LAYER_COLORS } from '@/data/tacticalData';
import { useAllIntelData, useConflictZones } from '@/hooks/useIntelData';

const ALL_LAYERS: LayerKey[] = ['combat', 'unrest', 'aviation', 'naval', 'satellite', 'cyber', 'nuclear', 'base', 'infrastructure', 'datacenter', 'oilsite', 'seismic', 'cve', 'weather', 'launch', 'ioda', 'ooni', 'threat'];

// Map API event type to our layer key
const TYPE_TO_LAYER: Record<string, LayerKey> = {
  COMBAT: 'combat', UNREST: 'unrest',
  AVIATION: 'aviation', NAVAL: 'naval', SATELLITE: 'satellite',
  CYBER: 'cyber', NUCLEAR: 'nuclear', BASE: 'base',
  INFRASTRUCTURE: 'infrastructure', DATACENTER: 'datacenter', OILSITE: 'oilsite',
  SEISMIC: 'seismic', CVE: 'cve', WEATHER: 'weather', LAUNCH: 'launch',
  IODA: 'ioda', OONI: 'ooni', THREAT: 'threat',
};

const Index = () => {
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(
    new Set(ALL_LAYERS.filter(l => l !== 'seismic' && l !== 'weather'))
  );
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Fetch live data from API
  const intel = useAllIntelData();

  // Fetch AI-identified conflict zones
  const conflictZonesQuery = useConflictZones();

  // Load GeoJSON country boundaries once
  const [geoJson, setGeoJson] = useState<any[]>([]);
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => {
        // Convert TopoJSON to GeoJSON features
        import('topojson-client').then(({ feature }) => {
          const fc = feature(topo, topo.objects.countries) as any;
          setGeoJson(fc.features);
        });
      })
      .catch(err => console.error('[geoJson] Failed to load country boundaries:', err));
  }, []);

  // Match AI conflict zones with GeoJSON country features
  // Uses ISO numeric code or country name matching
  const conflictZonePolygons = useMemo<ConflictZonePolygon[]>(() => {
    const zones = conflictZonesQuery.data?.zones || [];
    if (zones.length === 0 || geoJson.length === 0) return [];

    // Build lookup from ISO numeric → AI zone (world-atlas uses numeric IDs)
    // We'll match by name since world-atlas doesn't have ISO_A3
    const ISO_TO_NUMERIC: Record<string, string> = {
      'AFG': '004', 'DZA': '012', 'AGO': '024', 'BDI': '108', 'CMR': '120',
      'CAF': '140', 'TCD': '148', 'COL': '170', 'COD': '180', 'CUB': '192',
      'EGY': '818', 'ERI': '232', 'ETH': '231', 'IRN': '364', 'IRQ': '368',
      'ISR': '376', 'LBN': '422', 'LBY': '434', 'MLI': '466', 'MMR': '104',
      'MOZ': '508', 'NGA': '566', 'PAK': '586', 'PSE': '275', 'RUS': '643',
      'SDN': '729', 'SOM': '706', 'SSD': '728', 'SYR': '760', 'UKR': '804',
      'VEN': '862', 'YEM': '887', 'MEX': '484', 'PHL': '608', 'MYS': '458',
      'TUR': '792', 'SAU': '682', 'IND': '356', 'CHN': '156', 'KOR': '410',
      'PRK': '408', 'THA': '764', 'IDN': '360', 'BGD': '050', 'HTI': '332',
      'KEN': '404', 'UGA': '800', 'TZA': '834', 'ZWE': '716', 'NER': '562',
      'BFA': '854', 'GBR': '826', 'FRA': '250', 'DEU': '276', 'USA': '840',
    };

    const polygons: ConflictZonePolygon[] = [];

    for (const zone of zones) {
      const numericId = ISO_TO_NUMERIC[zone.iso];
      if (!numericId) continue;

      const feature = geoJson.find((f: any) => f.id === numericId);
      if (!feature) continue;

      polygons.push({
        type: 'Feature',
        properties: {
          ADMIN: zone.country,
          ISO_A3: zone.iso,
          severity: zone.severity,
          reason: zone.reason,
        },
        geometry: feature.geometry,
      });
    }

    return polygons;
  }, [conflictZonesQuery.data, geoJson]);

  const toggleLayer = useCallback((layer: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  // Build globe points from all API responses
  const points = useMemo<GlobePoint[]>(() => {
    const pts: GlobePoint[] = [];
    const allSources = [
      intel.conflicts, intel.unrest, intel.aviation,
      intel.satellite, intel.cyber, intel.nuclear,
      intel.naval, intel.bases, intel.infrastructure,
      intel.datacenters, intel.oilsites,
      intel.seismic, intel.weather, intel.launches,
      intel.cves, intel.ioda, intel.ooni,
      intel.threats,
    ];

    for (const source of allSources) {
      if (!source?.events) continue;
      for (const evt of source.events) {
        const layer = TYPE_TO_LAYER[evt.type] || 'combat';
        // Size & altitude per category
        let radius = 0.35;
        let altitude = 0.008;
        if (layer === 'aviation') { radius = 0.3; altitude = 0.025; }
        else if (layer === 'naval') { radius = evt.meta?.vesselType === 'carrier_group' ? 0.55 : 0.4; altitude = 0.005; }
        else if (layer === 'combat') { radius = 0.45; altitude = 0.012; }
        else if (layer === 'nuclear') { radius = 0.4; altitude = 0.008; }
        else if (layer === 'satellite') { radius = 0.35; altitude = 0.01; }
        else if (layer === 'cyber') { radius = 0.35; altitude = 0.015; }
        else if (layer === 'base') { radius = 0.3; altitude = 0.005; }
        else if (layer === 'infrastructure') { radius = 0.25; altitude = 0.003; }
        else if (layer === 'datacenter') { radius = 0.3; altitude = 0.008; }
        else if (layer === 'oilsite') { radius = 0.3; altitude = 0.006; }
        else if (layer === 'seismic') { radius = 0.4; altitude = 0.01; }
        else if (layer === 'cve') { radius = 0.3; altitude = 0.012; }
        else if (layer === 'weather') { radius = 0.4; altitude = 0.01; }
        else if (layer === 'launch') { radius = 0.35; altitude = 0.02; }
        else if (layer === 'ioda') { radius = 0.4; altitude = 0.012; }
        else if (layer === 'ooni') { radius = 0.35; altitude = 0.012; }
        else if (layer === 'threat') { radius = 0.35; altitude = 0.012; }

        pts.push({
          lat: evt.lat,
          lng: evt.lng,
          label: evt.label,
          detail: evt.meta ? Object.entries(evt.meta)
            .filter(([k]) => !['source', 'notes'].includes(k))
            .map(([k, v]) => `${k}: ${v}`)
            .slice(0, 4)
            .join(' · ') : '',
          color: evt.color || LAYER_COLORS[layer] || '#ffffff',
          radius,
          altitude,
          layer,
          raw: evt,
          heading: evt.meta?.heading,
          timestamp: evt.timestamp,
        });
      }
    }
    return pts;
  }, [intel]);

  // Build rings from combat, satellite, and cyber events
  const rings = useMemo(() => {
    const r: any[] = [];
    const addRings = (source: any, color: string, maxR: number, speed: number, period: number) => {
      if (!source?.events) return;
      for (const evt of source.events) {
        r.push({ lat: evt.lat, lng: evt.lng, color, maxR, propagationSpeed: speed, repeatPeriod: period });
      }
    };
    addRings(intel.conflicts, LAYER_COLORS.combat, 3, 2, 800);
    addRings(intel.satellite, LAYER_COLORS.satellite, 2, 2, 600);
    addRings(intel.cyber, LAYER_COLORS.cyber, 2.5, 2, 1000);
    addRings(intel.seismic, LAYER_COLORS.seismic, 3.5, 2, 700);
    addRings(intel.ioda, LAYER_COLORS.ioda, 2.5, 2, 900);
    return r;
  }, [intel]);

  // Dynamic arcs derived from real API data
  // 1. Naval: homeport → current position (deployment routes)
  // 2. Bases: Pentagon/command HQs → forward operating bases
  const arcs = useMemo<ArcRoute[]>(() => {
    const result: ArcRoute[] = [];

    // --- Known homeport coordinates (for naval deployment arcs) ---
    const HOMEPORTS: Record<string, [number, number]> = {
      'Yokosuka':      [35.29, 139.65],
      'Pearl Harbor':  [21.35, -157.95],
      'San Diego':     [32.72, -117.16],
      'Norfolk':       [36.85, -76.30],
      'Bahrain':       [26.23, 50.59],
      'Rota':          [36.62, -6.35],
      'Sasebo':        [33.16, 129.72],
    };

    // Naval deployment arcs: homeport → current deployed position
    if (intel.naval?.events) {
      for (const ship of intel.naval.events) {
        const hp = ship.meta?.homeport as string | undefined;
        if (!hp || !HOMEPORTS[hp]) continue;
        const [homeLat, homeLng] = HOMEPORTS[hp];

        // Skip if vessel is still at its homeport (distance < 2°)
        if (Math.abs(ship.lat - homeLat) < 2 && Math.abs(ship.lng - homeLng) < 2) continue;

        const isCapital = ship.meta?.vesselType === 'carrier_group';
        result.push({
          startLat: homeLat,
          startLng: homeLng,
          endLat: ship.lat,
          endLng: ship.lng,
          color: isCapital
            ? ['#39FF14', '#39FF1480']   // green for carrier groups
            : ['#00D2FF', '#00D2FF80'],  // cyan for escorts/destroyers
          label: `${ship.label?.split('—')[0]?.trim() || 'VESSEL'} deployment from ${hp}`,
        });
      }
    }

    // Base-to-base command links: connect Pentagon to major forward bases
    if (intel.bases?.events) {
      const pentagon = intel.bases.events.find(b => b.id === 'BASE-001');
      if (pentagon) {
        // Forward HQs that report to Pentagon (CENTCOM, EUCOM, INDOPACOM, AFRICOM forward bases)
        const forwardBaseIds = [
          'BASE-003',  // Ramstein AB - USAFE/NATO HQ
          'BASE-005',  // NSA Bahrain - 5th Fleet
          'BASE-006',  // Camp Lemonnier - AFRICOM
          'BASE-008',  // Al Dhafra AB - UAE
          'BASE-021',  // Al Udeid - CENTCOM Forward
          'BASE-022',  // Kadena AB - USAF Pacific
          'BASE-023',  // Camp Humphreys - USFK
          'BASE-025',  // Andersen AFB - Guam
          'BASE-032',  // Diego Garcia - Indian Ocean
        ];
        for (const fwd of intel.bases.events) {
          if (!forwardBaseIds.includes(fwd.id)) continue;
          result.push({
            startLat: pentagon.lat,
            startLng: pentagon.lng,
            endLat: fwd.lat,
            endLng: fwd.lng,
            color: ['#FF3131', '#FF313180'], // red for command links
            label: `COMLINK: Pentagon → ${fwd.label?.split('—')[0]?.trim() || 'FWD BASE'}`,
          });
        }
      }
    }

    // Infrastructure: submarine cable and pipeline routes
    if (activeLayers.has('infrastructure') && intel.infrastructure?.routes) {
      for (const route of intel.infrastructure.routes) {
        const isCable = route.type === 'cable';
        result.push({
          startLat: route.startLat,
          startLng: route.startLng,
          endLat: route.endLat,
          endLng: route.endLng,
          color: isCable
            ? ['#00BFFF', '#00BFFF60']   // deep sky blue for cables
            : ['#FF8C00', '#FF8C0060'],   // dark orange for pipelines
          label: `${isCable ? '🔌' : '🛢️'} ${route.name}${route.capacity ? ` (${route.capacity})` : ''} — ${route.status}`,
        });
      }
    }

    return result;
  }, [intel, activeLayers]);

  // Count events per layer for AssetTracker
  const layerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of points) {
      counts[p.layer] = (counts[p.layer] || 0) + 1;
    }
    return counts;
  }, [points]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <div className="scanline-overlay" />

      {/* Header */}
      <header className="h-10 border-b border-border bg-card/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary tactical-pulse" />
          <h1 className="text-[11px] font-bold tracking-[0.3em] uppercase text-foreground">
            GLOBAL COMMAND CENTER
          </h1>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
          <span>{activeLayers.size} LAYERS ACTIVE</span>
          {intel.isLive
            ? <span className="text-tactical-glow">■ LIVE</span>
            : <span className="text-tactical-amber">■ NO DATA</span>
          }
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel */}
        <aside className="w-72 border-r border-border bg-card/50 p-3 overflow-hidden flex flex-col shrink-0">
          <IntelFeed />
        </aside>

        {/* Center - Globe */}
        <section className="flex-1 relative bg-background overflow-hidden">
          <HudOverlay />
          <div className="absolute bottom-3 left-3 z-10">
            <LayerLegend activeLayers={activeLayers} onToggle={toggleLayer} />
          </div>
          <TacticalGlobe
            activeLayers={activeLayers}
            points={points}
            rings={rings}
            arcs={arcs}
            conflictZones={conflictZonePolygons}
            onAssetSelect={setSelectedAsset}
          />
        </section>

        {/* Right Panel */}
        <aside className="w-64 border-l border-border bg-card/50 p-3 overflow-hidden flex flex-col shrink-0">
          <AssetTracker selectedAsset={selectedAsset} activeLayers={activeLayers} layerCounts={layerCounts} />
        </aside>
      </div>

      <StatusBar layerCounts={layerCounts} isLive={intel.isLive} />
    </div>
  );
};

export default Index;
