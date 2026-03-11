const ICONS = {
  // ⚔️ Crosshair
  combat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="8"/>
    <line x1="12" y1="2" x2="12" y2="6"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="6" y2="12"/>
    <line x1="18" y1="12" x2="22" y2="12"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>`,
  // 📢 Warning triangle
  unrest: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  // ⚠️ Danger zone
  danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <path d="M12 9v4M12 17h.01"/>
  </svg>`,
  // ✈️ Plane silhouette
  aviation: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>`,
  // ⚓ Anchor
  naval: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="5" r="3"/>
    <line x1="12" y1="8" x2="12" y2="21"/>
    <path d="M5 19a7 7 0 0114 0"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke-width="2.5"/>
  </svg>`,
  // 🛰️ Satellite
  satellite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M13 7L9 3 5 7l4 4"/>
    <path d="M17 11l4-4-4-4-4 4"/>
    <path d="M8 12l4 4 4-4"/>
    <circle cx="12" cy="18" r="3"/>
    <line x1="12" y1="15" x2="12" y2="12"/>
  </svg>`,
  // 📡 Signal wave
  cyber: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 20a8 8 0 008-8h-4a4 4 0 01-4 4V20z" fill="currentColor" opacity="0.3"/>
    <path d="M8.5 8.5a5 5 0 017 7"/>
    <path d="M6 6a9 9 0 0112.7 12.7"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>`,
  // ☢️ Radiation trefoil
  nuclear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M12 2a10 10 0 00-8.66 5l5 2.87A4 4 0 0112 8V2z" fill="currentColor" opacity="0.7"/>
    <path d="M20.66 7a10 10 0 010 10l-5-2.87A4 4 0 0016 12 4 4 0 0015.66 9.87L20.66 7z" fill="currentColor" opacity="0.7"/>
    <path d="M3.34 17a10 10 0 008.66 5v-5.74A4 4 0 018.34 14.13L3.34 17z" fill="currentColor" opacity="0.7"/>
  </svg>`,
  // 🛡️ Shield
  base: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4" stroke-width="2.5"/>
  </svg>`
};
export function createMarkerElement(category, label, onClick) {
  const wrapper = document.createElement("div");
  wrapper.className = `globe-marker marker-${category}`;
  wrapper.innerHTML = `${ICONS[category]}<div class="marker-tooltip" style="--marker-color: var(--marker-color)">${label}</div>`;
  if (onClick) wrapper.addEventListener("click", onClick);
  return wrapper;
}
export default ICONS;
