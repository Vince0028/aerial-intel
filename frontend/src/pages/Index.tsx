import { useState, useCallback } from 'react';
import TacticalGlobe from '@/components/TacticalGlobe';
import IntelFeed from '@/components/IntelFeed';
import AssetTracker from '@/components/AssetTracker';
import StatusBar from '@/components/StatusBar';
import HudOverlay from '@/components/HudOverlay';
import LayerLegend from '@/components/LayerLegend';
import { type LayerKey } from '@/data/tacticalData';

const ALL_LAYERS: LayerKey[] = ['combat', 'unrest', 'danger', 'aviation', 'naval', 'satellite', 'cyber', 'nuclear', 'base'];

const Index = () => {
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(ALL_LAYERS));
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const toggleLayer = useCallback((layer: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <div className="scanline-overlay" />

      {/* Header */}
      <header className="h-10 border-b border-border bg-card/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary tactical-pulse" />
          <h1 className="text-[11px] font-bold tracking-[0.3em] uppercase text-foreground">
            GLOBAL COMMAND CENTER
          </h1>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
          <span>{activeLayers.size} LAYERS ACTIVE</span>
          <span className="text-tactical-glow">■ ONLINE</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel */}
        <aside className="w-72 border-r border-border bg-card/50 p-3 overflow-hidden flex flex-col shrink-0">
          <IntelFeed />
        </aside>

        {/* Center - Globe */}
        <section className="flex-1 relative bg-background overflow-hidden">
          <HudOverlay />
          {/* Legend overlay bottom-left */}
          <div className="absolute bottom-3 left-3 z-10">
            <LayerLegend activeLayers={activeLayers} onToggle={toggleLayer} />
          </div>
          <TacticalGlobe
            activeLayers={activeLayers}
            onAssetSelect={setSelectedAsset}
          />
        </section>

        {/* Right Panel */}
        <aside className="w-64 border-l border-border bg-card/50 p-3 overflow-hidden flex flex-col shrink-0">
          <AssetTracker selectedAsset={selectedAsset} activeLayers={activeLayers} />
        </aside>
      </div>

      <StatusBar />
    </div>
  );
};

export default Index;
