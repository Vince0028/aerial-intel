import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import Globe from 'react-globe.gl';
import { LAYER_COLORS, type LayerKey } from '@/data/tacticalData';
import { createCategorySprite } from './GlobeSprites';

// ===== Unified point shape for the globe =====
export interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
  detail: string;
  color: string;
  radius: number;
  altitude: number;
  layer: LayerKey;
  raw: any;
  heading?: number;
  timestamp?: string;
}

// ===== Ring shape =====
interface GlobeRing {
  lat: number;
  lng: number;
  color: string;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
}

// ===== Arc shape =====
export interface ArcRoute {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
  label?: string;
}

// ===== Conflict Zone polygon =====
export interface ConflictZonePolygon {
  // GeoJSON Feature with properties
  type: 'Feature';
  properties: {
    ADMIN: string;
    ISO_A3: string;
    severity: number;
    reason: string;
  };
  geometry: any;
}

interface TacticalGlobeProps {
  activeLayers: Set<LayerKey>;
  points: GlobePoint[];
  rings: GlobeRing[];
  arcs: ArcRoute[];
  conflictZones?: ConflictZonePolygon[];
  onAssetSelect?: (asset: any) => void;
}

// Layer → inline SVG icon for tooltip header (Lucide paths, 24×24 viewBox)
const LAYER_SVG: Record<LayerKey, string> = {
  combat:         '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
  unrest:         '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  danger:         '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  aviation:       '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  naval:          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
  satellite:      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/></svg>',
  cyber:          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
  nuclear:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12h0.01"/><path d="M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2.3 8.1 2 11c-.1.5.4 1 1 1h5c0-1.5.8-2.8 2-3.4-1.1-1.4-2-2.8-2.5-4.4z"/><path d="M21 12c.6 0 1-.4 1-1-.3-2.9-1.8-5.5-4.1-7.1-.4-.3-1.1-.2-1.3.3-.6 1.6-1.4 3-2.5 4.4 1.2.6 2 1.9 2 3.4h5z"/><path d="M7.5 19.8c-.3.5-.1 1.1.4 1.3 1.2.6 2.5.9 3.8.9 1.4 0 2.8-.4 4-1.1.5-.2.6-.9.3-1.3-1-1.3-1.7-2.8-2-4.5C13 15.7 12.5 16 12 16s-1-.3-1.4-.6c-.4 1.7-1.1 3.2-2 4.5z"/></svg>',
  base:           '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  infrastructure: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1"/><path d="M7 21v-2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1"/><path d="M11 21V9.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V21"/><path d="M3 7h18"/><path d="M12 7V3"/></svg>',
  datacenter:     '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  oilsite:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="22" x2="22" y2="22"/><path d="M5 22V6a1 1 0 0 1 1-1h0a1 1 0 0 1 .8.4l4 5.6a1 1 0 0 1-.8 1.6H6"/><path d="M13 6l4-4"/><path d="M13 10V6"/><path d="M13 10h4"/></svg>',
  seismic:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
  cve:            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
  weather:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>',
  launch:         '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  ioda:           '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>',
  ooni:           '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
  threat:         '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
};

export default function TacticalGlobe({ activeLayers, points, rings, arcs, conflictZones = [], onAssetSelect }: TacticalGlobeProps) {
  const globeRef = useRef<any>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Globe init
  useEffect(() => {
    if (globeRef.current) {
      const g = globeRef.current;
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.3;
      g.controls().enableZoom = true;
      g.pointOfView({ lat: 25, lng: 30, altitude: 2.2 });
    }
  }, []);

  // Stop auto-rotate on hover, resume on leave
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !globeRef.current) return;

    const stop = () => { if (globeRef.current) globeRef.current.controls().autoRotate = false; };
    const start = () => { if (globeRef.current) globeRef.current.controls().autoRotate = true; };

    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    return () => {
      el.removeEventListener('mouseenter', stop);
      el.removeEventListener('mouseleave', start);
    };
  }, []);

  // Filter points by active layers
  const visiblePoints = useMemo(
    () => points.filter(p => activeLayers.has(p.layer)),
    [points, activeLayers]
  );

  // Stabilize arcs: only update the globe's arc data when arc positions actually change.
  // Prevents react-globe.gl from restarting all dash animations on every 60s data refetch.
  const [stableArcs, setStableArcs] = useState<ArcRoute[]>(arcs);
  const arcsKeyRef = useRef('');
  const arcsKey = useMemo(
    () => arcs.map(a =>
      `${Math.round(a.startLat * 10)},${Math.round(a.startLng * 10)},` +
      `${Math.round(a.endLat * 10)},${Math.round(a.endLng * 10)}`
    ).sort().join('|'),
    [arcs]
  );
  useEffect(() => {
    if (arcsKey === arcsKeyRef.current) return;
    arcsKeyRef.current = arcsKey;
    const t = setTimeout(() => setStableArcs(arcs), 800);
    return () => clearTimeout(t);
  }, [arcsKey, arcs]);

  // Rich HTML label for objects
  const renderLabel = useCallback((d: object) => {
    const p = d as GlobePoint;
    const icon = LAYER_SVG[p.layer] || '';
    return `<div style="
      background: rgba(5, 10, 20, 0.95);
      border: 1px solid ${p.color};
      border-radius: 6px;
      padding: 10px 14px;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px;
      color: #e0e0e0;
      max-width: 300px;
      line-height: 1.6;
      box-shadow: 0 0 20px ${p.color}30, 0 4px 12px rgba(0,0,0,0.6);
      pointer-events: none;
    ">
      <div style="color: ${p.color}; font-weight: 700; font-size: 12px; margin-bottom: 4px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
        ${icon} ${p.label}
      </div>
      ${p.detail ? `<div style="color: #a0a0a0; font-size: 10px;">${p.detail}</div>` : ''}
      ${p.timestamp ? `<div style="color: #b0b040; font-size: 10px; margin-top: 4px;">📅 ${(() => { try { const d = new Date(p.timestamp); return isNaN(d.getTime()) ? p.timestamp : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return p.timestamp; } })()}</div>` : ''}
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${p.color}30; color: #666; font-size: 9px; display: flex; justify-content: space-between;">
        <span>${p.lat.toFixed(2)}°N ${p.lng.toFixed(2)}°E</span>
        <span style="color: ${p.color};">${p.layer.toUpperCase()}</span>
      </div>
    </div>`;
  }, []);

  // Arc label
  const renderArcLabel = useCallback((d: object) => {
    const a = d as ArcRoute;
    if (!a.label) return '';
    return `<div style="
      background: rgba(5, 10, 20, 0.9);
      border: 1px solid ${a.color[0]};
      border-radius: 4px;
      padding: 4px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: ${a.color[0]};
      pointer-events: none;
    ">${a.label}</div>`;
  }, []);

  // Conflict zone polygon label
  const renderZoneLabel = useCallback((d: object) => {
    const feat = d as ConflictZonePolygon;
    const sev = feat.properties.severity;
    const sevColor = sev >= 8 ? '#FF2020' : sev >= 5 ? '#FF6600' : '#FFaa00';
    return `<div style="
      background: rgba(10, 0, 0, 0.92);
      border: 1px solid ${sevColor};
      border-radius: 6px;
      padding: 10px 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #e0e0e0;
      max-width: 260px;
      line-height: 1.5;
      box-shadow: 0 0 24px ${sevColor}40;
      pointer-events: none;
    ">
      <div style="color: ${sevColor}; font-weight: 700; font-size: 13px; margin-bottom: 4px;">⚠️ CONFLICT ZONE</div>
      <div style="font-size: 12px; margin-bottom: 4px;">${feat.properties.ADMIN}</div>
      <div style="color: #a0a0a0; font-size: 10px;">${feat.properties.reason}</div>
      <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid ${sevColor}30; font-size: 10px; color: ${sevColor};">THREAT LEVEL: ${sev}/10</div>
    </div>`;
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full globe-container relative">
      <Globe
        ref={globeRef as any}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="hsl(120, 100%, 50%)"
        atmosphereAltitude={0.12}

        // 3D Object markers — anchored sprites, no gliding
        objectsData={visiblePoints}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="altitude"
        objectLabel={renderLabel}
        objectThreeObject={(d: object) => {
          const p = d as GlobePoint;
          const scale = p.layer === 'aviation' ? 2.5 :
            p.layer === 'naval' ? 3.5 :
              p.layer === 'nuclear' ? 3.5 :
                p.layer === 'base' ? 3 :
                  p.layer === 'infrastructure' ? 2.2 : 2.8;
          return createCategorySprite(p.layer, p.color, p.heading, scale);
        }}
        onObjectClick={(obj: object) => onAssetSelect?.((obj as GlobePoint).raw)}

        // Rings — pulsing effects for combat, satellite, cyber
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius={(d: object) => (d as GlobeRing).maxR}
        ringPropagationSpeed={(d: object) => (d as GlobeRing).propagationSpeed}
        ringRepeatPeriod={(d: object) => (d as GlobeRing).repeatPeriod}
        ringColor={(d: object) => (d as GlobeRing).color}

        // Arcs — deployment + comms routes
        arcsData={stableArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(d: object) => (d as ArcRoute).color}
        arcLabel={renderArcLabel}
        arcDashLength={() => 0.4}
        arcDashGap={() => 0.2}
        arcDashAnimateTime={() => 2000}
        arcStroke={() => 0.4}

        // Conflict Zone polygons — country boundaries highlighted red
        // Kept flat (altitude ~0) so points/arcs above remain hoverable
        polygonsData={conflictZones}
        polygonCapCurvatureResolution={1}
        polygonCapColor={(d: object) => {
          const sev = (d as ConflictZonePolygon).properties.severity;
          const alpha = Math.min(0.45, 0.12 + sev * 0.03);
          return sev >= 8 ? `rgba(255, 20, 20, ${alpha})`
            : sev >= 5 ? `rgba(255, 100, 0, ${alpha})`
            : `rgba(255, 170, 0, ${alpha})`;
        }}
        polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
        polygonStrokeColor={(d: object) => {
          const sev = (d as ConflictZonePolygon).properties.severity;
          return sev >= 8 ? '#FF2020' : sev >= 5 ? '#FF6600' : '#FFaa00';
        }}
        polygonAltitude={() => 0.005}
        polygonLabel={renderZoneLabel}
      />
    </div>
  );
}
