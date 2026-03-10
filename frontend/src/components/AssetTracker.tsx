import { LAYER_COLORS, LAYER_LABELS, LAYER_ICONS, type LayerKey } from '@/data/tacticalData';
import type { GlobePoint } from './TacticalGlobe';

interface AssetTrackerProps {
  selectedAsset?: any;
  selectedLayer?: LayerKey | null;
  activeLayers: Set<LayerKey>;
  layerCounts: Record<string, number>;
  points: GlobePoint[];
  onAssetSelect?: (asset: any) => void;
  onClearLayer?: () => void;
}

export default function AssetTracker({ selectedAsset, selectedLayer, activeLayers, layerCounts, points, onAssetSelect, onClearLayer }: AssetTrackerProps) {
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

  // Events for the focused layer
  const layerEvents = selectedLayer
    ? points.filter(p => p.layer === selectedLayer)
    : [];
  const layerColor = selectedLayer ? LAYER_COLORS[selectedLayer] : '#ffffff';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {selectedLayer ? LAYER_LABELS[selectedLayer] : 'Asset Overview'}
        </h2>
        {selectedLayer ? (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-medium" style={{ color: layerColor }}>
              {layerEvents.length} events
            </span>
            <button
              onClick={onClearLayer}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-secondary/60"
              title="Close layer view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : null}
      </div>

      {selectedLayer ? (
        /* Layer detail: scrollable list of all events */
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-0">
          {layerEvents.length === 0 ? (
            <div className="text-[9px] text-muted-foreground italic px-1">No data for this layer.</div>
          ) : layerEvents.map((p, i) => (
            <button
              key={p.raw?.id || i}
              onClick={() => onAssetSelect?.(p.raw)}
              className="w-full text-left tactical-border p-1.5 rounded-sm hover:bg-secondary/40 transition-colors"
              style={{ borderColor: layerColor + '40' }}
            >
              <div className="text-[9px] font-medium break-words" style={{ color: layerColor }}>
                {p.label}
              </div>
              {p.detail && (
                <div className="text-[8px] text-muted-foreground break-words mt-0.5">{p.detail}</div>
              )}
              <div className="text-[8px] text-muted-foreground/60 mt-0.5">
                {p.lat.toFixed(3)}° {p.lng.toFixed(3)}°
                {p.timestamp ? ` · ${new Date(p.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Default summary grid */
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
      )}

      {/* Selected asset detail */}
      {selectedAsset && (
        <div className="tactical-border p-2 mt-2 bg-secondary/30 shrink-0">
          <div className="text-[9px] text-tactical-glow font-bold mb-1.5">▸ SELECTED</div>
          <div className="text-[9px] space-y-1">
            {Object.entries(selectedAsset).map(([key, val]) => {
              if (key === 'category' || key === 'raw') return null;
              if (key === 'meta') {
                const meta = val as Record<string, any>;
                const url: string | undefined = meta?.url;
                if (!url) return null;
                return (
                  <div key="url" className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground uppercase">URL</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 break-all hover:opacity-80 transition-opacity"
                    >
                      {url}
                    </a>
                  </div>
                );
              }
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase">{key}</span>
                  <span className="text-foreground break-words">{String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total active count — only in summary view */}
      {!selectedLayer && (
        <div className="mt-auto pt-2 border-t border-border text-[9px] text-muted-foreground">
          <div className="flex justify-between">
            <span>TOTAL TRACKED</span>
            <span className="text-foreground font-medium">
              {activeEntries.reduce((sum, c) => sum + c.count, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
