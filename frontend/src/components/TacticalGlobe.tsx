import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import {
  MOCK_FLIGHTS, MOCK_NAVAL, MOCK_EVENTS, MOCK_SATELLITE,
  MOCK_CYBER, MOCK_NUCLEAR, MOCK_BASES, MOCK_ARCS,
  LAYER_COLORS,
  type FlightAsset, type NavalAsset, type LayerKey,
} from '@/data/tacticalData';

// Combine all "point" data into a single array with a unified shape
interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
  color: string;
  radius: number;
  altitude: number;
  layer: LayerKey;
  raw: any;
}

interface TacticalGlobeProps {
  activeLayers: Set<LayerKey>;
  onAssetSelect?: (asset: any) => void;
}

function buildPoints(
  flights: FlightAsset[],
  naval: NavalAsset[],
  activeLayers: Set<LayerKey>,
): GlobePoint[] {
  const pts: GlobePoint[] = [];

  if (activeLayers.has('aviation')) {
    flights.forEach(f => pts.push({
      lat: f.lat, lng: f.lng,
      label: `✈ ${f.callsign} | ALT ${f.alt.toLocaleString()}ft | ${f.speed}kts`,
      color: LAYER_COLORS.aviation, radius: 0.35, altitude: 0.025,
      layer: 'aviation', raw: f,
    }));
  }

  if (activeLayers.has('naval')) {
    naval.forEach(n => pts.push({
      lat: n.lat, lng: n.lng,
      label: `⚓ ${n.name} | ${n.type.toUpperCase()} | ${n.speed}kts`,
      color: LAYER_COLORS.naval, radius: n.type === 'carrier_group' ? 0.55 : 0.35, altitude: 0.005,
      layer: 'naval', raw: n,
    }));
  }

  if (activeLayers.has('satellite')) {
    MOCK_SATELLITE.forEach(s => pts.push({
      lat: s.lat, lng: s.lng,
      label: `🛰 ${s.label} | CONF ${(s.confidence * 100).toFixed(0)}%`,
      color: LAYER_COLORS.satellite, radius: 0.4, altitude: 0.01,
      layer: 'satellite', raw: s,
    }));
  }

  if (activeLayers.has('cyber')) {
    MOCK_CYBER.forEach(c => pts.push({
      lat: c.lat, lng: c.lng,
      label: `📡 ${c.label} | ${c.type.toUpperCase()}`,
      color: LAYER_COLORS.cyber, radius: 0.35, altitude: 0.015,
      layer: 'cyber', raw: c,
    }));
  }

  if (activeLayers.has('nuclear')) {
    MOCK_NUCLEAR.forEach(n => pts.push({
      lat: n.lat, lng: n.lng,
      label: `☢ ${n.name} | ${n.type.toUpperCase()} | ${n.status}`,
      color: LAYER_COLORS.nuclear, radius: 0.4, altitude: 0.008,
      layer: 'nuclear', raw: n,
    }));
  }

  if (activeLayers.has('base')) {
    MOCK_BASES.forEach(b => pts.push({
      lat: b.lat, lng: b.lng,
      label: `🛡 ${b.name} | ${b.branch.toUpperCase()}`,
      color: LAYER_COLORS.base, radius: 0.3, altitude: 0.005,
      layer: 'base', raw: b,
    }));
  }

  return pts;
}

export default function TacticalGlobe({ activeLayers, onAssetSelect }: TacticalGlobeProps) {
  const globeRef = useRef<any>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [flights, setFlights] = useState(MOCK_FLIGHTS);
  const [naval, setNaval] = useState(MOCK_NAVAL);

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

  // Animate flights
  useEffect(() => {
    const interval = setInterval(() => {
      setFlights(prev => prev.map(f => ({
        ...f,
        lat: f.lat + Math.sin(f.heading * Math.PI / 180) * 0.08 + (Math.random() - 0.5) * 0.02,
        lng: f.lng + Math.cos(f.heading * Math.PI / 180) * 0.08 + (Math.random() - 0.5) * 0.02,
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Animate naval
  useEffect(() => {
    const interval = setInterval(() => {
      setNaval(prev => prev.map(n => ({
        ...n,
        lat: n.lat + Math.sin(n.heading * Math.PI / 180) * 0.015 + (Math.random() - 0.5) * 0.005,
        lng: n.lng + Math.cos(n.heading * Math.PI / 180) * 0.015 + (Math.random() - 0.5) * 0.005,
        heading: n.heading + (Math.random() - 0.5) * 5, // slight drift
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const points = buildPoints(flights, naval, activeLayers);

  // Build ring data from active conflict layers
  const ringData = MOCK_EVENTS.filter(e => activeLayers.has(e.category as LayerKey));

  const getEventColor = useCallback((d: object) => {
    const event = d as typeof MOCK_EVENTS[0];
    return LAYER_COLORS[event.category as keyof typeof LAYER_COLORS] || LAYER_COLORS.combat;
  }, []);

  // Satellite hits as additional rings (magenta pulses)
  const satRings = activeLayers.has('satellite')
    ? MOCK_SATELLITE.map(s => ({ ...s, type: 'satellite' as const, category: 'satellite' as const }))
    : [];

  const cyberRings = activeLayers.has('cyber')
    ? MOCK_CYBER.map(c => ({ ...c, category: 'cyber' as const }))
    : [];

  const allRings = [...ringData, ...satRings, ...cyberRings];

  const getRingColor = useCallback((d: object) => {
    const r = d as any;
    if (r.category === 'satellite') return LAYER_COLORS.satellite;
    if (r.category === 'cyber') return LAYER_COLORS.cyber;
    return LAYER_COLORS[r.category as keyof typeof LAYER_COLORS] || LAYER_COLORS.combat;
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
        // All points
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude="altitude"
        pointRadius="radius"
        pointColor="color"
        pointLabel={(d: object) => {
          const p = d as GlobePoint;
          return `<div style="color: ${p.color}; background: rgba(0,0,0,0.9); padding: 6px 10px; border: 1px solid ${p.color}40; font-family: monospace; font-size: 11px; max-width: 280px;">
            ${p.label}
          </div>`;
        }}
        onPointClick={(point: object) => onAssetSelect?.((point as GlobePoint).raw)}
        // Rings
        ringsData={allRings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius={(d: object) => {
          const r = d as any;
          if (r.category === 'satellite') return 2;
          if (r.category === 'cyber') return 2.5;
          return 3;
        }}
        ringPropagationSpeed={() => 2}
        ringRepeatPeriod={(d: object) => {
          const r = d as any;
          if (r.category === 'satellite') return 600;
          if (r.category === 'cyber') return 1000;
          return 800;
        }}
        ringColor={getRingColor as any}
        // Arcs
        arcsData={MOCK_ARCS}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(d: object) => {
          const a = d as typeof MOCK_ARCS[0];
          if (a.type === 'deployment') return ['#FF3131', '#FF313180'];
          if (a.type === 'comms') return ['#00D2FF', '#00D2FF80'];
          return ['#39FF14', '#39FF1480'];
        }}
        arcDashLength={() => 0.4}
        arcDashGap={() => 0.2}
        arcDashAnimateTime={() => 2000}
        arcStroke={() => 0.4}
      />
    </div>
  );
}
