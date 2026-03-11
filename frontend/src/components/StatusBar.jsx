import { useState, useEffect } from "react";
export default function StatusBar({ layerCounts, isLive }) {
  const [time, setTime] = useState(/* @__PURE__ */ new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(/* @__PURE__ */ new Date()), 1e3);
    return () => clearInterval(interval);
  }, []);
  const utc = time.toISOString().replace("T", " ").slice(0, 19) + "Z";
  const mobileAssets = (layerCounts.aviation || 0) + (layerCounts.naval || 0);
  const eventCount = (layerCounts.combat || 0) + (layerCounts.unrest || 0) + (layerCounts.satellite || 0) + (layerCounts.cyber || 0);
  const siteCount = (layerCounts.nuclear || 0) + (layerCounts.base || 0);
  return <div className="h-8 border-t border-border bg-card/80 flex items-center justify-between px-4 text-[9px] text-muted-foreground"><div className="flex items-center gap-4"><span>SYS: <span className="text-tactical-glow">NOMINAL</span></span><span>ENCR: <span className="text-tactical-glow">AES-256</span></span><span>NET: <span className="text-tactical-glow">SECURE</span></span><span>FEED: <span className={isLive ? "text-tactical-glow" : "text-tactical-amber"}>{isLive ? "LIVE" : "MOCK"}</span></span><span>DEFCON: <span className="text-tactical-amber">3</span></span></div><div className="flex items-center gap-4"><span>MOBILE: <span className="text-foreground">{mobileAssets}</span></span><span>EVENTS: <span className="text-foreground">{eventCount}</span></span><span>SITES: <span className="text-foreground">{siteCount}</span></span><span className="text-foreground font-medium">{utc}</span></div></div>;
}
