export default function HudOverlay() {
  return (
    <div className="hidden md:contents">
      {/* Mode / Classification */}
      <div className="absolute top-3 left-3 z-10 tactical-border bg-card/80 px-3 py-2">
        <div className="text-[9px] text-muted-foreground tracking-[0.2em] mb-1">GLOBAL C2 TACTICAL DISPLAY</div>
        <div className="text-[10px]">
          <span className="text-muted-foreground">MODE: </span>
          <span className="text-tactical-glow">SURVEILLANCE</span>
        </div>
        <div className="text-[10px]">
          <span className="text-muted-foreground">CLASSIFICATION: </span>
          <span className="text-tactical-amber font-bold">UNCLASSIFIED</span>
        </div>
      </div>

      {/* Viewport */}
      <div className="absolute top-3 right-72 z-10 tactical-border bg-card/80 px-3 py-2 text-[9px]">
        <div className="text-muted-foreground tracking-[0.15em]">VIEWPORT</div>
        <div className="text-foreground">ALT: 2200km</div>
        <div className="text-foreground">FOV: GLOBAL</div>
      </div>

      {/* Arc Legend */}
      <div className="absolute top-24 left-3 z-10 tactical-border bg-card/80 px-3 py-2 text-[9px]">
        <div className="text-muted-foreground tracking-[0.15em] mb-1.5">ARC ROUTES</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5" style={{ background: '#FF3131' }} />
          <span className="text-[#FF3131]">Military Deployment</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5" style={{ background: '#39FF14' }} />
          <span className="text-[#39FF14]">Supply / Logistics</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5" style={{ background: '#00D2FF' }} />
          <span className="text-[#00D2FF]">Intel / Comms Link</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ background: '#F59E0B' }} />
          <span className="text-[#F59E0B]">Pipeline</span>
        </div>
      </div>
    </div>
  );
}
