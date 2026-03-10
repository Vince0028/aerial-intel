import { useState } from 'react';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ICONS, type LayerKey } from '@/data/tacticalData';

interface LayerLegendProps {
  activeLayers: Set<LayerKey>;
  selectedLayer?: LayerKey | null;
  onToggle: (layer: LayerKey) => void;
  onSelect: (layer: LayerKey) => void;
}

export default function LayerLegend({ activeLayers, selectedLayer, onToggle, onSelect }: LayerLegendProps) {
  const layers = Object.keys(LAYER_COLORS) as LayerKey[];
  const [open, setOpen] = useState(true);

  return (
    <div className="tactical-border bg-background/70 backdrop-blur-sm">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[9px] text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors"
      >
        <span>Layers</span>
        <span className="ml-2 text-[10px]">{open ? '▼' : '▲'}</span>
      </button>

      {/* Collapsible grid */}
      {open && <div className="grid grid-cols-3 gap-1 px-2 pb-2">
        {layers.map(layer => {
          const active = activeLayers.has(layer);
          const focused = selectedLayer === layer;
          const Icon = LAYER_ICONS[layer];
          return (
            <button
              key={layer}
              onClick={() => {
                onToggle(layer);
                onSelect(layer);
              }}
              className={`flex items-center gap-1.5 px-1.5 py-1 text-[8px] rounded-sm transition-all ${
                focused
                  ? 'ring-1 ring-inset bg-secondary/70'
                  : active ? 'bg-secondary/50' : 'opacity-30 hover:opacity-60'
              }`}
              style={focused ? { ringColor: LAYER_COLORS[layer] } : undefined}
            >
              <Icon
                size={10}
                className="shrink-0"
                style={{ color: active ? LAYER_COLORS[layer] : undefined }}
              />
              <span className="truncate" style={{ color: active ? LAYER_COLORS[layer] : undefined }}>
                {LAYER_LABELS[layer]}
              </span>
            </button>
          );
        })}
      </div>}
    </div>
  );
}
