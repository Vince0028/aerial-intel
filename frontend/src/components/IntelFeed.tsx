import { useState, useEffect, useMemo } from 'react';
import { useAllIntelData } from '@/hooks/useIntelData';

/** Map event type → emoji domain icon */
const DOMAIN_ICON: Record<string, string> = {
  COMBAT: '⚔️', UNREST: '📢', AVIATION: '✈️', SATELLITE: '🛰️',
  CYBER: '📡', NUCLEAR: '☢️', NAVAL: '⚓', BASE: '🛡️',
};

/** Derive priority from event intensity */
function toPriority(intensity: number): string {
  if (intensity >= 8) return 'CRITICAL';
  if (intensity >= 5) return 'HIGH';
  if (intensity >= 3) return 'MED';
  return 'LOW';
}

function getPriorityClass(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'text-tactical-red';
    case 'HIGH': return 'text-tactical-amber';
    case 'MED': return 'text-foreground';
    default: return 'text-muted-foreground';
  }
}

interface FeedItem {
  id: string;
  time: string;
  priority: string;
  domain: string;
  msg: string;
}

export default function IntelFeed() {
  const intel = useAllIntelData();
  const [visibleItems, setVisibleItems] = useState<number>(0);

  // Build feed from live API events
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    const allSources = [
      intel.conflicts, intel.unrest, intel.aviation,
      intel.satellite, intel.cyber, intel.nuclear,
      intel.naval, intel.bases,
    ];

    for (const source of allSources) {
      if (!source?.events) continue;
      for (const evt of source.events) {
        items.push({
          id: evt.id || `${evt.type}-${evt.lat}-${evt.lng}`,
          time: evt.timestamp
            ? new Date(evt.timestamp).toISOString().slice(11, 19) + 'Z'
            : '--:--:--Z',
          priority: toPriority(evt.intensity ?? 5),
          domain: DOMAIN_ICON[evt.type] || '📍',
          msg: evt.label || `${evt.type} event at ${evt.lat?.toFixed(1)}N ${evt.lng?.toFixed(1)}E`,
        });
      }
    }

    // Sort by priority: CRITICAL first, then by time desc
    const ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MED: 2, LOW: 3 };
    items.sort((a, b) => (ORDER[a.priority] ?? 4) - (ORDER[b.priority] ?? 4));
    return items.slice(0, 30); // cap at 30 items
  }, [intel]);

  // Animate feed items appearing one by one
  useEffect(() => {
    if (feedItems.length === 0) return;
    if (visibleItems < feedItems.length) {
      const timer = setTimeout(() => setVisibleItems(v => v + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [visibleItems, feedItems.length]);

  // Reset visible count when new data arrives
  useEffect(() => {
    setVisibleItems(0);
  }, [feedItems.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Multi-Domain Intel</h2>
        {feedItems.length > 0
          ? <span className="text-[9px] text-tactical-glow tactical-pulse">● LIVE</span>
          : <span className="text-[9px] text-muted-foreground">● AWAITING</span>
        }
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {feedItems.slice(0, visibleItems).map((item) => (
          <div
            key={item.id}
            className="tactical-border p-2 text-[10px] leading-relaxed hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{item.domain}</span>
              <span className="text-muted-foreground">{item.time}</span>
              <span className={`font-bold ${getPriorityClass(item.priority)}`}>
                [{item.priority}]
              </span>
            </div>
            <p className="text-foreground/80">{item.msg}</p>
          </div>
        ))}

        {feedItems.length === 0 && !intel.isLoading && (
          <div className="text-[10px] text-muted-foreground">
            NO SIGNALS — awaiting Supabase data
          </div>
        )}

        {visibleItems < feedItems.length && (
          <div className="text-[10px] text-muted-foreground cursor-blink">
            RECEIVING SIGNAL...
          </div>
        )}
      </div>
    </div>
  );
}
