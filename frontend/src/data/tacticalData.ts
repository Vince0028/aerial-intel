// Tactical data types and display configuration for the globe

import type { LucideIcon } from 'lucide-react';
import {
  Crosshair, Flame, TriangleAlert, Plane, Anchor,
  Satellite, Zap, Radiation, Shield, Cable, Cpu, Fuel,
  Activity, Bug, CloudLightning, Rocket, WifiOff, EyeOff, ShieldAlert,
} from 'lucide-react';

// ===== LAYER COLORS =====
export const LAYER_COLORS = {
  combat: '#FF3131',
  unrest: '#FFBD59',
  danger: '#FF6B35',
  aviation: '#00D2FF',
  naval: '#7D5FFF',
  satellite: '#FF00FF',
  cyber: '#FF1493',
  nuclear: '#39FF14',
  base: '#FFFFFF',
  infrastructure: '#00BFFF',
  datacenter: '#A855F7',
  oilsite: '#F59E0B',
  seismic: '#FF6347',
  cve: '#E11D48',
  weather: '#00CED1',
  launch: '#FF4500',
  ioda: '#DC2626',
  ooni: '#8B5CF6',
  threat: '#EF4444',
} as const;

export const LAYER_LABELS = {
  combat: 'Killzone',
  unrest: 'Unrest',
  danger: 'Danger',
  aviation: 'Aviation',
  naval: 'Maritime',
  satellite: 'Satellite',
  cyber: 'Cyber',
  nuclear: 'Nuclear',
  base: 'Bases',
  infrastructure: 'Subsea',
  datacenter: 'Data Centers',
  oilsite: 'Oil Sites',
  seismic: 'Seismic',
  cve: 'CVE',
  weather: 'Weather',
  launch: 'Launches',
  ioda: 'Outages',
  ooni: 'Censorship',
  threat: 'Threats',
} as const;

// ===== LAYER ICONS (Lucide React components) =====
export const LAYER_ICONS: Record<LayerKey, LucideIcon> = {
  combat: Crosshair,
  unrest: Flame,
  danger: TriangleAlert,
  aviation: Plane,
  naval: Anchor,
  satellite: Satellite,
  cyber: Zap,
  nuclear: Radiation,
  base: Shield,
  infrastructure: Cable,
  datacenter: Cpu,
  oilsite: Fuel,
  seismic: Activity,
  cve: Bug,
  weather: CloudLightning,
  launch: Rocket,
  ioda: WifiOff,
  ooni: EyeOff,
  threat: ShieldAlert,
};

export type LayerKey = keyof typeof LAYER_COLORS;
