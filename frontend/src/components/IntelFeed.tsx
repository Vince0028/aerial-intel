import { useState, useEffect } from 'react';

const MOCK_INTEL = [
  { id: 1, time: '14:32:07Z', priority: 'HIGH', domain: '⚔️', msg: 'SIGINT intercept — encrypted burst detected near ZONE-ALPHA sector 7G' },
  { id: 2, time: '14:28:45Z', priority: 'MED', domain: '📡', msg: 'ELINT anomaly — radar emission pattern change at coords 50.42N 30.51E' },
  { id: 3, time: '14:25:12Z', priority: 'LOW', domain: '⚓', msg: 'CSG RONALD REAGAN departed Subic Bay heading NE — 3 escorts confirmed' },
  { id: 4, time: '14:21:33Z', priority: 'CRITICAL', domain: '✈️', msg: 'SATCOM relay — asset VIPER12 deviation from planned route detected' },
  { id: 5, time: '14:18:09Z', priority: 'HIGH', domain: '🛰️', msg: 'GEOINT update — thermal anomaly at YONGBYON consistent with reactor restart' },
  { id: 6, time: '14:15:41Z', priority: 'MED', domain: '🛰️', msg: 'FIRMS hotspot — large thermal signature near grid ref 33.3N 44.4E, possible strike' },
  { id: 7, time: '14:12:22Z', priority: 'HIGH', domain: '📡', msg: 'GPS jamming detected Bosphorus strait — ADS-B vertical error spike on 14 aircraft' },
  { id: 8, time: '14:09:55Z', priority: 'HIGH', domain: '📡', msg: 'Internet outage — Kyiv region, 80% drop in Cloudflare traffic within 3 minutes' },
  { id: 9, time: '14:06:30Z', priority: 'MED', domain: '⚓', msg: 'SSN ARCTIC PATROL — sonar contact reported bearing 090, classified UNKNOWN' },
  { id: 10, time: '14:03:12Z', priority: 'LOW', domain: '☢️', msg: 'NATANZ centrifuge vibration anomaly — IAEA monitoring sensor offline' },
  { id: 11, time: '14:00:45Z', priority: 'CRITICAL', domain: '⚔️', msg: 'ACLED flash — artillery exchange ZONE-GOLF, 12 events in 30 minutes' },
  { id: 12, time: '13:57:20Z', priority: 'MED', domain: '🛡️', msg: 'Force posture change — AL DHAFRA AB aircraft generation count elevated' },
];

export default function IntelFeed() {
  const [visibleItems, setVisibleItems] = useState<number>(0);

  useEffect(() => {
    if (visibleItems < MOCK_INTEL.length) {
      const timer = setTimeout(() => setVisibleItems(v => v + 1), 500);
      return () => clearTimeout(timer);
    }
  }, [visibleItems]);

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-tactical-red';
      case 'HIGH': return 'text-tactical-amber';
      case 'MED': return 'text-foreground';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Multi-Domain Intel</h2>
        <span className="text-[9px] text-tactical-glow tactical-pulse">● LIVE</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {MOCK_INTEL.slice(0, visibleItems).map((item) => (
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

        {visibleItems < MOCK_INTEL.length && (
          <div className="text-[10px] text-muted-foreground cursor-blink">
            RECEIVING SIGNAL...
          </div>
        )}
      </div>
    </div>
  );
}
