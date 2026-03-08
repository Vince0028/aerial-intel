export default function HudOverlay() {
  return (
    <>
      {/* Top-left system status */}
      <div className="absolute top-3 left-3 z-10 tactical-border bg-background/70 backdrop-blur-sm p-2 text-[9px] leading-relaxed">
        <div className="text-muted-foreground">GLOBAL C2 TACTICAL DISPLAY</div>
        <div className="text-foreground">MODE: <span className="text-tactical-glow">SURVEILLANCE</span></div>
        <div className="text-foreground">CLASSIFICATION: <span className="text-tactical-amber">UNCLASSIFIED</span></div>
      </div>

      {/* Top-right coordinates */}
      <div className="absolute top-3 right-3 z-10 tactical-border bg-background/70 backdrop-blur-sm p-2 text-[9px]">
        <div className="text-muted-foreground">VIEWPORT</div>
        <div className="text-foreground">ALT: 2200km</div>
        <div className="text-foreground">FOV: GLOBAL</div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/40 z-10" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/40 z-10" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/40 z-10" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/40 z-10" />
    </>
  );
}
