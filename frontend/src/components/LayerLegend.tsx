import { LAYER_COLORS, LAYER_LABELS, LAYER_ICONS, type LayerKey } from '@/data/tacticalData';

interface LayerLegendProps {
  activeLayers: Set<LayerKey>;
  onToggle: (layer: LayerKey) => void;
}

export default function LayerLegend({ activeLayers, onToggle }: LayerLegendProps) {
  const layers = Object.keys(LAYER_COLORS) as LayerKey[];

  return (
    <div className="tactical-border bg-background/70 backdrop-blur-sm p-2">
      <div className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] mb-2">Layers</div>
      <div className="grid grid-cols-3 gap-1">
        {layers.map(layer => {
          const active = activeLayers.has(layer);
          const Icon = LAYER_ICONS[layer];
          return (
            <button
              key={layer}
              onClick={() => onToggle(layer)}
              className={`flex items-center gap-1.5 px-1.5 py-1 text-[8px] rounded-sm transition-all ${
                active ? 'bg-secondary/50' : 'opacity-30 hover:opacity-60'
              }`}
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
      </div>
    </div>
  );
}
