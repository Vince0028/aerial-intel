import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

// Layer → emoji map for tooltip header
const LAYER_EMOJI: Record<LayerKey, string> = {
  combat: '⚔️', unrest: '📢', danger: '⚠️', aviation: '✈️',
  naval: '⚓', satellite: '🛰️', cyber: '📡', nuclear: '☢️', base: '🛡️',
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

  // Rich HTML label for objects
  const renderLabel = useCallback((d: object) => {
    const p = d as GlobePoint;
    const emoji = LAYER_EMOJI[p.layer] || '●';
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
      <div style="color: ${p.color}; font-weight: 700; font-size: 12px; margin-bottom: 4px; letter-spacing: 0.5px;">
        ${emoji} ${p.label}
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
                p.layer === 'base' ? 3 : 2.8;
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
        arcsData={arcs}
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
