import {
  MOCK_FLIGHTS, MOCK_NAVAL, MOCK_SATELLITE, MOCK_CYBER,
  MOCK_NUCLEAR, MOCK_BASES, MOCK_EVENTS,
  LAYER_COLORS, type LayerKey,
} from '@/data/tacticalData';

interface AssetTrackerProps {
  selectedAsset?: any;
  activeLayers: Set<LayerKey>;
}

export default function AssetTracker({ selectedAsset, activeLayers }: AssetTrackerProps) {
  // Count totals
  const counts: { label: string; count: number; color: string; layer: LayerKey }[] = [
    { label: '✈ Aircraft', count: MOCK_FLIGHTS.length, color: LAYER_COLORS.aviation, layer: 'aviation' },
    { label: '⚓ Naval', count: MOCK_NAVAL.length, color: LAYER_COLORS.naval, layer: 'naval' },
    { label: '⚔ Conflicts', count: MOCK_EVENTS.length, color: LAYER_COLORS.combat, layer: 'combat' },
    { label: '🛰 Sat Hits', count: MOCK_SATELLITE.length, color: LAYER_COLORS.satellite, layer: 'satellite' },
    { label: '📡 Cyber', count: MOCK_CYBER.length, color: LAYER_COLORS.cyber, layer: 'cyber' },
    { label: '☢ Nuclear', count: MOCK_NUCLEAR.length, color: LAYER_COLORS.nuclear, layer: 'nuclear' },
    { label: '🛡 Bases', count: MOCK_BASES.length, color: LAYER_COLORS.base, layer: 'base' },
  ];

  const activeAssets = counts.filter(c => activeLayers.has(c.layer));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Asset Overview</h2>
      </div>

      {/* Summary grid */}
      <div className="space-y-1 mb-3">
        {activeAssets.map(c => (
          <div key={c.label} className="flex items-center justify-between text-[9px] px-1">
            <span style={{ color: c.color }}>{c.label}</span>
            <span className="text-foreground font-medium">{c.count}</span>
          </div>
        ))}
      </div>

      {/* Selected asset detail */}
      {selectedAsset && (
        <div className="tactical-border p-2 mb-3 bg-secondary/30">
          <div className="text-[9px] text-tactical-glow font-bold mb-1.5">▸ SELECTED</div>
          <div className="text-[9px] space-y-0.5">
            {Object.entries(selectedAsset).map(([key, val]) => {
              if (key === 'category' || key === 'raw') return null;
              return (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground uppercase">{key}</span>
                  <span className="text-foreground truncate">{String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aircraft list */}
      {activeLayers.has('aviation') && (
        <>
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 mt-1">Aircraft</div>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {MOCK_FLIGHTS.map(f => (
              <div key={f.id} className="flex items-center justify-between px-1 py-0.5 text-[9px] hover:bg-secondary/50 cursor-pointer rounded-sm">
                <span style={{ color: LAYER_COLORS.aviation }}>✈ {f.callsign}</span>
                <span className="text-muted-foreground">{f.alt.toLocaleString()}'</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Naval list */}
      {activeLayers.has('naval') && (
        <>
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 mt-2">Naval Assets</div>
          <div className="overflow-y-auto space-y-0.5 max-h-32">
            {MOCK_NAVAL.map(n => (
              <div key={n.id} className="flex items-center justify-between px-1 py-0.5 text-[9px] hover:bg-secondary/50 cursor-pointer rounded-sm">
                <span style={{ color: LAYER_COLORS.naval }}>⚓ {n.name}</span>
                <span className="text-muted-foreground text-[8px]">{n.type}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
