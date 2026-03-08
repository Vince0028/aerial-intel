// Tactical data types and display configuration for the globe

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
