import { LAYER_COLORS, LAYER_LABELS, LAYER_ICONS, type LayerKey } from '@/data/tacticalData';

interface AssetTrackerProps {
  selectedAsset?: any;
  activeLayers: Set<LayerKey>;
  layerCounts: Record<string, number>;
}

export default function AssetTracker({ selectedAsset, activeLayers, layerCounts }: AssetTrackerProps) {
  const layers = Object.keys(LAYER_COLORS) as LayerKey[];
  const activeEntries = layers
    .filter(l => activeLayers.has(l))
    .map(l => ({
      layer: l,
      label: LAYER_LABELS[l],
      count: layerCounts[l] || 0,
      color: LAYER_COLORS[l],
      Icon: LAYER_ICONS[l],
    }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Asset Overview</h2>
      </div>

      {/* Summary grid */}
      <div className="space-y-1 mb-3">
        {activeEntries.map(c => (
          <div key={c.layer} className="flex items-center justify-between text-[9px] px-1">
            <span className="flex items-center gap-1.5" style={{ color: c.color }}>
              <c.Icon size={10} />
              {c.label}
            </span>
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
              if (key === 'category' || key === 'raw' || key === 'meta') return null;
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

      {/* Total active count */}
      <div className="mt-auto pt-2 border-t border-border text-[9px] text-muted-foreground">
        <div className="flex justify-between">
          <span>TOTAL TRACKED</span>
          <span className="text-foreground font-medium">
            {activeEntries.reduce((sum, c) => sum + c.count, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
