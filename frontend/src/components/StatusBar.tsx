import { useState, useEffect } from 'react';
import { MOCK_FLIGHTS, MOCK_NAVAL, MOCK_EVENTS, MOCK_SATELLITE, MOCK_CYBER, MOCK_NUCLEAR, MOCK_BASES } from '@/data/tacticalData';

export default function StatusBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utc = time.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  const totalAssets = MOCK_FLIGHTS.length + MOCK_NAVAL.length;
  const totalEvents = MOCK_EVENTS.length + MOCK_SATELLITE.length + MOCK_CYBER.length;

  return (
    <div className="h-8 border-t border-border bg-card/80 flex items-center justify-between px-4 text-[9px] text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>SYS: <span className="text-tactical-glow">NOMINAL</span></span>
        <span>ENCR: <span className="text-tactical-glow">AES-256</span></span>
        <span>NET: <span className="text-tactical-glow">SECURE</span></span>
        <span>DEFCON: <span className="text-tactical-amber">3</span></span>
      </div>
      <div className="flex items-center gap-4">
        <span>MOBILE: <span className="text-foreground">{totalAssets}</span></span>
        <span>EVENTS: <span className="text-foreground">{totalEvents}</span></span>
        <span>SITES: <span className="text-foreground">{MOCK_NUCLEAR.length + MOCK_BASES.length}</span></span>
        <span className="text-foreground font-medium">{utc}</span>
      </div>
    </div>
  );
}
