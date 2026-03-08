// All static and mock data for the tactical globe

// ===== TYPES =====
export interface FlightAsset {
  id: string;
  lat: number;
  lng: number;
  alt: number;
  callsign: string;
  heading: number;
  speed: number;
  category: 'aviation';
}

export interface NavalAsset {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'carrier_group' | 'destroyer' | 'submarine' | 'patrol';
  heading: number;
  speed: number;
  category: 'naval';
}

export interface ConflictEvent {
  lat: number;
  lng: number;
  label: string;
  intensity: number;
  type: 'conflict' | 'unrest' | 'monitoring';
  category: 'combat' | 'unrest' | 'danger';
}

export interface SatelliteHit {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'thermal' | 'imagery' | 'explosion';
  confidence: number;
  category: 'satellite';
}

export interface CyberEvent {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'outage' | 'jamming' | 'intrusion';
  severity: number;
  category: 'cyber';
}

export interface NuclearSite {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'plant' | 'research' | 'storage';
  status: 'active' | 'standby' | 'decommissioned';
  category: 'nuclear';
}

export interface MilitaryBase {
  id: string;
  lat: number;
  lng: number;
  name: string;
  branch: 'navy' | 'airforce' | 'army' | 'joint';
  category: 'base';
}

export interface ArcRoute {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  type: 'supply' | 'deployment' | 'comms';
}

// ===== FLIGHT DATA =====
export const MOCK_FLIGHTS: FlightAsset[] = [
  { id: 'MIL-001', lat: 38.9, lng: -77.0, alt: 35000, callsign: 'EAGLE01', heading: 45, speed: 480, category: 'aviation' },
  { id: 'MIL-002', lat: 51.5, lng: -0.1, alt: 42000, callsign: 'HAWK07', heading: 120, speed: 520, category: 'aviation' },
  { id: 'MIL-003', lat: 35.7, lng: 139.7, alt: 38000, callsign: 'VIPER12', heading: 270, speed: 450, category: 'aviation' },
  { id: 'MIL-004', lat: 48.8, lng: 2.3, alt: 41000, callsign: 'PHANTOM3', heading: 180, speed: 510, category: 'aviation' },
  { id: 'MIL-005', lat: 55.7, lng: 37.6, alt: 39000, callsign: 'BEAR09', heading: 300, speed: 430, category: 'aviation' },
  { id: 'MIL-006', lat: -33.9, lng: 151.2, alt: 36000, callsign: 'RAPTOR5', heading: 90, speed: 470, category: 'aviation' },
  { id: 'MIL-007', lat: 25.2, lng: 55.3, alt: 40000, callsign: 'FALCON8', heading: 210, speed: 490, category: 'aviation' },
  { id: 'MIL-008', lat: 1.3, lng: 103.8, alt: 37000, callsign: 'COBRA11', heading: 330, speed: 460, category: 'aviation' },
  { id: 'MIL-009', lat: 37.5, lng: 127.0, alt: 43000, callsign: 'STRIKE4', heading: 60, speed: 540, category: 'aviation' },
  { id: 'MIL-010', lat: 28.6, lng: 77.2, alt: 34000, callsign: 'TIGER06', heading: 150, speed: 440, category: 'aviation' },
  { id: 'MIL-011', lat: 59.3, lng: 18.1, alt: 38000, callsign: 'GHOST02', heading: 240, speed: 500, category: 'aviation' },
  { id: 'MIL-012', lat: 14.5, lng: 121.0, alt: 36000, callsign: 'DELTA07', heading: 15, speed: 475, category: 'aviation' },
];

// ===== NAVAL DATA =====
export const MOCK_NAVAL: NavalAsset[] = [
  // Carrier Strike Groups
  { id: 'CSG-1', lat: 14.8, lng: 120.3, name: 'CSG RONALD REAGAN', type: 'carrier_group', heading: 45, speed: 18, category: 'naval' },
  { id: 'CSG-2', lat: 35.3, lng: 139.6, name: 'CSG YOKOSUKA', type: 'carrier_group', heading: 180, speed: 12, category: 'naval' },
  { id: 'CSG-3', lat: 21.3, lng: -157.9, name: 'CSG PEARL HARBOR', type: 'carrier_group', heading: 270, speed: 15, category: 'naval' },
  { id: 'CSG-4', lat: 32.7, lng: -117.2, name: 'CSG SAN DIEGO', type: 'carrier_group', heading: 310, speed: 14, category: 'naval' },
  { id: 'CSG-5', lat: 36.8, lng: -76.3, name: 'CSG NORFOLK', type: 'carrier_group', heading: 90, speed: 16, category: 'naval' },
  // Destroyers
  { id: 'DDG-1', lat: 26.2, lng: 50.6, name: 'DDG BAHRAIN PATROL', type: 'destroyer', heading: 120, speed: 22, category: 'naval' },
  { id: 'DDG-2', lat: 12.1, lng: 43.1, name: 'DDG DJIBOUTI', type: 'destroyer', heading: 200, speed: 20, category: 'naval' },
  { id: 'DDG-3', lat: 60.4, lng: 5.3, name: 'DDG NORTH SEA', type: 'destroyer', heading: 350, speed: 18, category: 'naval' },
  // Submarines (approximate known patrol areas)
  { id: 'SSN-1', lat: 68.0, lng: 33.0, name: 'SSN ARCTIC PATROL', type: 'submarine', heading: 90, speed: 8, category: 'naval' },
  { id: 'SSN-2', lat: 20.0, lng: 135.0, name: 'SSN PACIFIC DEEP', type: 'submarine', heading: 270, speed: 6, category: 'naval' },
  // Patrol boats
  { id: 'PC-1', lat: 1.2, lng: 104.0, name: 'PATROL MALACCA', type: 'patrol', heading: 45, speed: 25, category: 'naval' },
  { id: 'PC-2', lat: 30.0, lng: 32.5, name: 'PATROL SUEZ', type: 'patrol', heading: 180, speed: 20, category: 'naval' },
];

// ===== CONFLICT/UNREST EVENTS =====
export const MOCK_EVENTS: ConflictEvent[] = [
  { lat: 50.4, lng: 30.5, label: 'ZONE-ALPHA', intensity: 0.9, type: 'conflict', category: 'combat' },
  { lat: 33.3, lng: 44.4, label: 'ZONE-BRAVO', intensity: 0.7, type: 'conflict', category: 'combat' },
  { lat: 15.5, lng: 32.5, label: 'ZONE-CHARLIE', intensity: 0.5, type: 'unrest', category: 'unrest' },
  { lat: 6.5, lng: 3.4, label: 'ZONE-DELTA', intensity: 0.4, type: 'unrest', category: 'unrest' },
  { lat: 34.0, lng: -6.8, label: 'ZONE-ECHO', intensity: 0.3, type: 'monitoring', category: 'danger' },
  { lat: 13.7, lng: 100.5, label: 'ZONE-FOXTROT', intensity: 0.6, type: 'conflict', category: 'combat' },
  { lat: 36.2, lng: 37.1, label: 'ZONE-GOLF', intensity: 0.8, type: 'conflict', category: 'combat' },
  { lat: 15.4, lng: 44.2, label: 'ZONE-HOTEL', intensity: 0.6, type: 'conflict', category: 'combat' },
];

// ===== SATELLITE / THERMAL HITS =====
export const MOCK_SATELLITE: SatelliteHit[] = [
  { id: 'SAT-001', lat: 48.1, lng: 37.8, label: 'THERMAL-001 Industrial fire', type: 'thermal', confidence: 0.92, category: 'satellite' },
  { id: 'SAT-002', lat: 34.5, lng: 69.2, label: 'THERMAL-002 Anomaly detected', type: 'explosion', confidence: 0.87, category: 'satellite' },
  { id: 'SAT-003', lat: 31.8, lng: 35.2, label: 'IMAGERY-001 New construction', type: 'imagery', confidence: 0.78, category: 'satellite' },
  { id: 'SAT-004', lat: 39.0, lng: 125.7, label: 'THERMAL-003 Launch site activity', type: 'thermal', confidence: 0.95, category: 'satellite' },
  { id: 'SAT-005', lat: 11.6, lng: 43.1, label: 'THERMAL-004 Port activity', type: 'thermal', confidence: 0.81, category: 'satellite' },
  { id: 'SAT-006', lat: 61.8, lng: 34.3, label: 'IMAGERY-002 Vehicle staging', type: 'imagery', confidence: 0.73, category: 'satellite' },
  { id: 'SAT-007', lat: 25.3, lng: 51.5, label: 'THERMAL-005 Refinery flare', type: 'thermal', confidence: 0.69, category: 'satellite' },
];

// ===== CYBER / SIGNAL EVENTS =====
export const MOCK_CYBER: CyberEvent[] = [
  { id: 'CYB-001', lat: 50.4, lng: 30.5, label: 'Internet outage — Kyiv region', type: 'outage', severity: 0.9, category: 'cyber' },
  { id: 'CYB-002', lat: 41.0, lng: 29.0, label: 'GPS jamming — Bosphorus strait', type: 'jamming', severity: 0.8, category: 'cyber' },
  { id: 'CYB-003', lat: 59.9, lng: 30.3, label: 'GPS spoofing detected — Baltic', type: 'jamming', severity: 0.7, category: 'cyber' },
  { id: 'CYB-004', lat: 33.9, lng: 35.5, label: 'Network disruption — Beirut', type: 'outage', severity: 0.6, category: 'cyber' },
  { id: 'CYB-005', lat: 24.5, lng: 54.7, label: 'Cyber intrusion attempt — UAE', type: 'intrusion', severity: 0.85, category: 'cyber' },
  { id: 'CYB-006', lat: 35.7, lng: 51.4, label: 'Internet throttling — Tehran', type: 'outage', severity: 0.75, category: 'cyber' },
];

// ===== NUCLEAR SITES =====
export const MOCK_NUCLEAR: NuclearSite[] = [
  { id: 'NUK-001', lat: 51.4, lng: -1.3, name: 'ALDERMASTON', type: 'research', status: 'active', category: 'nuclear' },
  { id: 'NUK-002', lat: 47.9, lng: 5.3, name: 'VALDUC', type: 'storage', status: 'active', category: 'nuclear' },
  { id: 'NUK-003', lat: 39.7, lng: 125.7, name: 'YONGBYON', type: 'research', status: 'active', category: 'nuclear' },
  { id: 'NUK-004', lat: 32.6, lng: 51.5, name: 'NATANZ', type: 'plant', status: 'active', category: 'nuclear' },
  { id: 'NUK-005', lat: 46.5, lng: 48.6, name: 'ASTRAKHAN NPP', type: 'plant', status: 'active', category: 'nuclear' },
  { id: 'NUK-006', lat: 30.4, lng: -88.5, name: 'GRAND GULF', type: 'plant', status: 'active', category: 'nuclear' },
  { id: 'NUK-007', lat: 19.8, lng: 75.7, name: 'TARAPUR', type: 'plant', status: 'active', category: 'nuclear' },
  { id: 'NUK-008', lat: -30.1, lng: 30.8, name: 'KOEBERG', type: 'plant', status: 'active', category: 'nuclear' },
];

// ===== MILITARY BASES =====
export const MOCK_BASES: MilitaryBase[] = [
  { id: 'BASE-001', lat: 38.7, lng: -77.0, name: 'PENTAGON', branch: 'joint', category: 'base' },
  { id: 'BASE-002', lat: 51.1, lng: -1.8, name: 'SALISBURY PLAIN', branch: 'army', category: 'base' },
  { id: 'BASE-003', lat: 49.0, lng: 2.1, name: 'RAMSTEIN AB', branch: 'airforce', category: 'base' },
  { id: 'BASE-004', lat: 35.4, lng: 139.5, name: 'YOKOSUKA NB', branch: 'navy', category: 'base' },
  { id: 'BASE-005', lat: 26.5, lng: 50.0, name: 'NSA BAHRAIN', branch: 'navy', category: 'base' },
  { id: 'BASE-006', lat: 11.5, lng: 43.1, name: 'CAMP LEMONNIER', branch: 'joint', category: 'base' },
  { id: 'BASE-007', lat: 14.5, lng: 120.9, name: 'SUBIC BAY', branch: 'navy', category: 'base' },
  { id: 'BASE-008', lat: 24.4, lng: 54.4, name: 'AL DHAFRA AB', branch: 'airforce', category: 'base' },
  { id: 'BASE-009', lat: 36.2, lng: -5.4, name: 'GIBRALTAR', branch: 'navy', category: 'base' },
  { id: 'BASE-010', lat: 21.3, lng: -157.9, name: 'PEARL HARBOR', branch: 'navy', category: 'base' },
];

// ===== ARCS (supply/deployment routes) =====
export const MOCK_ARCS: ArcRoute[] = [
  { startLat: 38.9, startLng: -77.0, endLat: 51.5, endLng: -0.1, type: 'supply' },
  { startLat: 51.5, startLng: -0.1, endLat: 49.0, endLng: 2.1, type: 'comms' },
  { startLat: 38.9, startLng: -77.0, endLat: 25.2, endLng: 55.3, type: 'deployment' },
  { startLat: 35.7, startLng: 139.7, endLat: 37.5, endLng: 127.0, type: 'comms' },
  { startLat: 1.3, startLng: 103.8, endLat: -33.9, endLng: 151.2, type: 'supply' },
  { startLat: 21.3, startLng: -157.9, endLat: 35.4, endLng: 139.5, type: 'deployment' },
  { startLat: 36.8, startLng: -76.3, endLat: 36.2, endLng: -5.4, type: 'supply' },
  { startLat: 26.5, startLng: 50.0, endLat: 11.5, endLng: 43.1, type: 'deployment' },
  { startLat: 14.5, startLng: 120.9, endLat: 14.8, endLng: 120.3, type: 'comms' },
];

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
} as const;

export const LAYER_LABELS = {
  combat: '⚔️ Combat',
  unrest: '📢 Unrest',
  danger: '⚠️ Danger',
  aviation: '✈️ Aviation',
  naval: '⚓ Maritime',
  satellite: '🛰️ Satellite',
  cyber: '📡 Cyber/Signal',
  nuclear: '☢️ Nuclear',
  base: '🛡️ Bases',
} as const;

export type LayerKey = keyof typeof LAYER_COLORS;
