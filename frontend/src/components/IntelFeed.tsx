import { useState, useEffect, useMemo } from 'react';
import { useAllIntelData, useCategorySummary, type BriefingEvent } from '@/hooks/useIntelData';
import {
  Crosshair, Flame, Plane, Satellite, Zap, Radiation, Anchor, Shield, MapPin,
  Activity, Bug, CloudLightning, Rocket, WifiOff, EyeOff, ShieldAlert,
  type LucideIcon,
} from 'lucide-react';

const DOMAIN_ICON: Record<string, LucideIcon> = {
  COMBAT: Crosshair, UNREST: Flame, AVIATION: Plane, SATELLITE: Satellite,
  CYBER: Zap, NUCLEAR: Radiation, NAVAL: Anchor, BASE: Shield,
  SEISMIC: Activity, CVE: Bug, WEATHER: CloudLightning, LAUNCH: Rocket,
  IODA: WifiOff, OONI: EyeOff, THREAT: ShieldAlert,
};

const CATEGORY_LABEL: Record<string, string> = {
  ALL: 'ALL', COMBAT: 'COMBAT', UNREST: 'UNREST', AVIATION: 'AIR',
  SATELLITE: 'SAT', CYBER: 'CYBER', NUCLEAR: 'NUKE', NAVAL: 'NAVAL',
  SEISMIC: 'QUAKE', CVE: 'CVE', WEATHER: 'WX', LAUNCH: 'SPACE',
  IODA: 'OUTAGE', OONI: 'CENSOR', THREAT: 'THREAT',
};

const CATEGORIES = ['ALL', 'COMBAT', 'UNREST', 'AVIATION', 'SATELLITE', 'CYBER', 'NUCLEAR', 'NAVAL', 'SEISMIC', 'CVE', 'WEATHER', 'LAUNCH', 'IODA', 'OONI', 'THREAT'] as const;
type Category = typeof CATEGORIES[number];

function toPriority(intensity: number) {
  if (intensity >= 8) return 'CRITICAL';
  if (intensity >= 5) return 'HIGH';
  if (intensity >= 3) return 'MED';
  return 'LOW';
}

function getPriorityClass(priority: string) {
  if (priority === 'CRITICAL') return 'text-tactical-red';
  if (priority === 'HIGH') return 'text-tactical-amber';
  if (priority === 'MED') return 'text-foreground';
  return 'text-muted-foreground';
}

function getTabClass(active: boolean) {
  return active
    ? 'text-tactical-glow border-b border-tactical-glow font-bold'
    : 'text-muted-foreground hover:text-foreground';
}

interface FeedItem {
  id: string; time: string; priority: string;
  DomainIcon: LucideIcon; msg: string; intensity: number; type: string;
}

/** AI Briefing panel — loads on demand, cached 30 min in Supabase */
function AiBriefing({ category, events }: { category: string; events: BriefingEvent[] }) {
  const [open, setOpen] = useState(false);
  const [triggered, setTriggered] = useState(false);

  // Reset when category changes
  useEffect(() => { setOpen(false); setTriggered(false); }, [category]);

  const { data, isFetching, isError } = useCategorySummary(category, events, triggered);

  function handleToggle() {
    if (!open && !triggered) setTriggered(true);
    setOpen(o => !o);
  }

  if (category === 'ALL' || events.length === 0) return null;

  return (
    <div className="mb-2 tactical-border overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[9px] uppercase tracking-widest text-tactical-amber hover:bg-secondary/40 transition-colors"
      >
        <span>⚡ AI SITREP — {category}</span>
        <span className="flex items-center gap-1.5">
          {isFetching && <span className="tactical-pulse">generating...</span>}
          {data?.source && !isFetching && (
            <span className="text-muted-foreground normal-case tracking-normal">
              via {data.model?.split('-').slice(0, 2).join('-')} · {data.source}
            </span>
          )}
          <span>{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <div className="px-2 pb-2 pt-1 text-[10px] leading-relaxed">
          {isFetching && !data && (
            <p className="text-muted-foreground tactical-pulse">Querying Groq AI...</p>
          )}
          {isError && (
            <p className="text-tactical-red">Failed to generate briefing.</p>
          )}
          {data?.summary && (
            <p className="text-foreground/85">{data.summary}</p>
          )}
          {!isFetching && !data?.summary && !isError && triggered && (
            <p className="text-muted-foreground">No briefing available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntelFeed() {
  const intel = useAllIntelData();
  const [activeTab, setActiveTab] = useState<Category>('ALL');
  const [visibleItems, setVisibleItems] = useState(0);

  // Build all feed items from every source
  const allItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    const sources = [
      intel.conflicts, intel.unrest, intel.aviation,
      intel.satellite, intel.cyber, intel.nuclear,
      intel.naval, intel.bases, intel.seismic,
      intel.weather, intel.launches, intel.cves,
      intel.ioda, intel.ooni, intel.threats,
    ];
    for (const src of sources) {
      if (!src?.events) continue;
      for (const evt of src.events) {
        const intensity = evt.intensity ?? 5;
        items.push({
          id: evt.id || `${evt.type}-${evt.lat}-${evt.lng}`,
          time: evt.timestamp
            ? new Date(evt.timestamp).toISOString().slice(11, 19) + 'Z'
            : '--:--:--Z',
          priority: toPriority(intensity),
          DomainIcon: DOMAIN_ICON[evt.type] || MapPin,
          msg: evt.label || `${evt.type} event`,
          intensity,
          type: evt.type || 'UNKNOWN',
        });
      }
    }
    const ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MED: 2, LOW: 3 };
    items.sort((a, b) => (ORDER[a.priority] ?? 4) - (ORDER[b.priority] ?? 4));
    return items.slice(0, 60);
  }, [intel]);

  // Filtered by active tab
  const filteredItems = useMemo(
    () => activeTab === 'ALL' ? allItems : allItems.filter(i => i.type === activeTab),
    [allItems, activeTab]
  );

  // Events to pass to AI briefing for the current category
  const briefingEvents = useMemo<BriefingEvent[]>(
    () => filteredItems.map(i => ({ label: i.msg, type: i.type, intensity: i.intensity })),
    [filteredItems]
  );

  // Animate items in one by one
  useEffect(() => {
    if (filteredItems.length === 0) return;
    if (visibleItems < filteredItems.length) {
      const t = setTimeout(() => setVisibleItems(v => v + 1), 120);
      return () => clearTimeout(t);
    }
  }, [visibleItems, filteredItems.length]);

  useEffect(() => { setVisibleItems(0); }, [activeTab, filteredItems.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Multi-Domain Intel</h2>
        {allItems.length > 0
          ? <span className="text-[9px] text-tactical-glow tactical-pulse">● LIVE</span>
          : <span className="text-[9px] text-muted-foreground">● AWAITING</span>
        }
      </div>

      {/* Category tabs */}
      <div className="flex gap-0 overflow-x-auto mb-2 scrollbar-none border-b border-border/50 pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`shrink-0 px-2 py-0.5 text-[8px] uppercase tracking-widest transition-colors ${getTabClass(activeTab === cat)}`}
          >
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* AI SITREP panel (hidden for ALL tab) */}
      <AiBriefing category={activeTab} events={briefingEvents} />

      {/* Event list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredItems.slice(0, visibleItems).map(item => (
          <div
            key={item.id}
            className="tactical-border p-2 text-[10px] leading-relaxed hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <item.DomainIcon size={12} className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{item.time}</span>
              <span className={`font-bold ${getPriorityClass(item.priority)}`}>
                [{item.priority}]
              </span>
            </div>
            <p className="text-foreground/80">{item.msg}</p>
          </div>
        ))}

        {filteredItems.length === 0 && !intel.isLoading && (
          <div className="text-[10px] text-muted-foreground py-2">
            NO {activeTab === 'ALL' ? 'SIGNALS' : activeTab + ' EVENTS'} — awaiting data
          </div>
        )}

        {visibleItems < filteredItems.length && (
          <div className="text-[10px] text-muted-foreground cursor-blink">RECEIVING SIGNAL...</div>
        )}
      </div>
    </div>
  );
}
