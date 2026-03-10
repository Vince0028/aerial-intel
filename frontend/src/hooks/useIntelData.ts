/**
 * useIntelData — fetches live data from all API proxy endpoints.
 * Data flows: External APIs → API server → Supabase cache → Frontend.
 * No mock/hardcoded data — everything comes from the API + Supabase.
 * Auto-refreshes every 60 seconds.
 */
import { useQuery } from '@tanstack/react-query';

const API_BASE = '/api/intel';
const REFETCH_INTERVAL = 60_000; // 60 seconds

interface ApiResponse {
    events: any[];
    source: string;
    count: number;
}

const EMPTY_RESPONSE: ApiResponse = { events: [], source: 'No data', count: 0 };

async function fetchIntel(endpoint: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/${endpoint}`);
    if (!res.ok) throw new Error(`API ${endpoint} returned ${res.status}`);
    return res.json();
}

// ——— Individual data hooks ———

export function useConflicts() {
    return useQuery({
        queryKey: ['intel', 'conflicts'],
        queryFn: () => fetchIntel('conflicts'),
        refetchInterval: REFETCH_INTERVAL,
        retry: 2,
    });
}

export function useUnrest() {
    return useQuery({
        queryKey: ['intel', 'unrest'],
        queryFn: () => fetchIntel('unrest'),
        refetchInterval: REFETCH_INTERVAL,
        retry: 2,
    });
}

export function useAviation() {
    return useQuery({
        queryKey: ['intel', 'aviation'],
        queryFn: () => fetchIntel('aviation'),
        refetchInterval: REFETCH_INTERVAL,
        retry: 2,
    });
}

export function useSatellite() {
    return useQuery({
        queryKey: ['intel', 'satellite'],
        queryFn: () => fetchIntel('satellite'),
        refetchInterval: REFETCH_INTERVAL,
        retry: 2,
    });
}

export function useCyber() {
    return useQuery({
        queryKey: ['intel', 'cyber'],
        queryFn: () => fetchIntel('cyber'),
        refetchInterval: REFETCH_INTERVAL,
        retry: 2,
    });
}

export function useNuclear() {
    return useQuery({
        queryKey: ['intel', 'nuclear'],
        queryFn: () => fetchIntel('nuclear'),
        refetchInterval: REFETCH_INTERVAL * 10,
        retry: 2,
    });
}

export function useNaval() {
    return useQuery({
        queryKey: ['intel', 'naval'],
        queryFn: () => fetchIntel('naval'),
        refetchInterval: REFETCH_INTERVAL * 5,
        retry: 2,
    });
}

export function useBases() {
    return useQuery({
        queryKey: ['intel', 'bases'],
        queryFn: () => fetchIntel('bases'),
        refetchInterval: REFETCH_INTERVAL * 10,
        retry: 2,
    });
}

export interface CablePath {
    coords: [number, number][];
    name: string;
    color: string;
    length?: string;
    rfs?: string;
    owners?: string;
    url?: string;
}

export interface InfrastructureResponse extends ApiResponse {
    routes?: {
        id: string;
        name: string;
        startLat: number;
        startLng: number;
        endLat: number;
        endLng: number;
        type: 'pipeline';
        status: string;
    }[];
    cablePaths?: CablePath[];
    cableCount?: number;
}

const EMPTY_INFRA_RESPONSE: InfrastructureResponse = { events: [], source: 'No data', count: 0, routes: [], cablePaths: [] };

export function useInfrastructure() {
    return useQuery({
        queryKey: ['intel', 'infrastructure'],
        queryFn: async (): Promise<InfrastructureResponse> => {
            const res = await fetch(`${API_BASE}/infrastructure`);
            if (!res.ok) throw new Error(`API infrastructure returned ${res.status}`);
            return res.json();
        },
        refetchInterval: REFETCH_INTERVAL * 30, // cables/pipes don't move
        retry: 2,
    });
}



export function useDatacenters() {
    return useQuery({
        queryKey: ['intel', 'datacenters'],
        queryFn: () => fetchIntel('datacenters'),
        refetchInterval: REFETCH_INTERVAL * 30, // data centers don't move
        retry: 2,
    });
}

export function useOilsites() {
    return useQuery({
        queryKey: ['intel', 'oilsites'],
        queryFn: () => fetchIntel('oilsites'),
        refetchInterval: REFETCH_INTERVAL * 30, // oil sites don't move
        retry: 2,
    });
}

export function useSeismic() {
    return useQuery({
        queryKey: ['intel', 'seismic'],
        queryFn: () => fetchIntel('seismic'),
        refetchInterval: REFETCH_INTERVAL * 5, // every 5 min
        retry: 2,
    });
}

export function useWeather() {
    return useQuery({
        queryKey: ['intel', 'weather'],
        queryFn: () => fetchIntel('weather'),
        refetchInterval: REFETCH_INTERVAL * 10,
        retry: 2,
    });
}

export function useLaunches() {
    return useQuery({
        queryKey: ['intel', 'launches'],
        queryFn: () => fetchIntel('launches'),
        refetchInterval: REFETCH_INTERVAL * 10,
        retry: 2,
    });
}

export function useCves() {
    return useQuery({
        queryKey: ['intel', 'cves'],
        queryFn: () => fetchIntel('cves'),
        refetchInterval: REFETCH_INTERVAL * 15,
        retry: 2,
    });
}

export function useIoda() {
    return useQuery({
        queryKey: ['intel', 'ioda'],
        queryFn: () => fetchIntel('ioda'),
        refetchInterval: REFETCH_INTERVAL * 5,
        retry: 2,
    });
}

export function useOoni() {
    return useQuery({
        queryKey: ['intel', 'ooni'],
        queryFn: () => fetchIntel('ooni'),
        refetchInterval: REFETCH_INTERVAL * 15,
        retry: 2,
    });
}

export function useThreats() {
    return useQuery({
        queryKey: ['intel', 'threats'],
        queryFn: () => fetchIntel('threats'),
        refetchInterval: REFETCH_INTERVAL * 30,
        retry: 2,
    });
}

// ——— Combined hook that returns all data ———

export interface AllIntelData {
    conflicts: ApiResponse;
    unrest: ApiResponse;
    aviation: ApiResponse;
    satellite: ApiResponse;
    cyber: ApiResponse;
    nuclear: ApiResponse;
    naval: ApiResponse;
    bases: ApiResponse;
    infrastructure: InfrastructureResponse;
    datacenters: ApiResponse;
    oilsites: ApiResponse;
    seismic: ApiResponse;
    weather: ApiResponse;
    launches: ApiResponse;
    cves: ApiResponse;
    ioda: ApiResponse;
    ooni: ApiResponse;
    threats: ApiResponse;
    isLoading: boolean;
    isLive: boolean;
}

export function useAllIntelData(): AllIntelData {
    const conflicts = useConflicts();
    const unrest = useUnrest();
    const aviation = useAviation();
    const satellite = useSatellite();
    const cyber = useCyber();
    const nuclear = useNuclear();
    const naval = useNaval();
    const bases = useBases();
    const infrastructure = useInfrastructure();
    const datacenters = useDatacenters();
    const oilsites = useOilsites();
    const seismic = useSeismic();
    const weather = useWeather();
    const launches = useLaunches();
    const cves = useCves();
    const ioda = useIoda();
    const ooni = useOoni();
    const threats = useThreats();

    const queries = [conflicts, unrest, aviation, satellite, cyber, nuclear, naval, bases, infrastructure, datacenters, oilsites, seismic, weather, launches, cves, ioda, ooni, threats];
    const isLoading = queries.some(q => q.isLoading);
    const isLive = queries.some(q => q.isSuccess && (q.data?.events?.length ?? 0) > 0);

    return {
        conflicts: conflicts.data ?? EMPTY_RESPONSE,
        unrest: unrest.data ?? EMPTY_RESPONSE,
        aviation: aviation.data ?? EMPTY_RESPONSE,
        satellite: satellite.data ?? EMPTY_RESPONSE,
        cyber: cyber.data ?? EMPTY_RESPONSE,
        nuclear: nuclear.data ?? EMPTY_RESPONSE,
        naval: naval.data ?? EMPTY_RESPONSE,
        bases: bases.data ?? EMPTY_RESPONSE,
        infrastructure: (infrastructure.data ?? EMPTY_INFRA_RESPONSE) as InfrastructureResponse,
        datacenters: datacenters.data ?? EMPTY_RESPONSE,
        oilsites: oilsites.data ?? EMPTY_RESPONSE,
        seismic: seismic.data ?? EMPTY_RESPONSE,
        weather: weather.data ?? EMPTY_RESPONSE,
        launches: launches.data ?? EMPTY_RESPONSE,
        cves: cves.data ?? EMPTY_RESPONSE,
        ioda: ioda.data ?? EMPTY_RESPONSE,
        ooni: ooni.data ?? EMPTY_RESPONSE,
        threats: threats.data ?? EMPTY_RESPONSE,
        isLoading,
        isLive,
    };
}

// ——— Groq AI Prediction ———
export async function predictFlight(aircraft: {
    callsign?: string;
    lat: number;
    lng: number;
    altitude?: number;
    heading?: number;
    speed?: number;
    originCountry?: string;
}) {
    const res = await fetch('/api/intel/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aircraft),
    });
    if (!res.ok) throw new Error(`Predict returned ${res.status}`);
    return res.json();
}

// ——— Groq AI Conflict Zone overlay (country polygons) ———
export interface ConflictZone {
    country: string;
    iso: string;
    severity: number;
    reason: string;
    startedAt?: string;  // "YYYY", "YYYY-MM", or "YYYY-MM-DD"
}

export function useConflictZones() {
    return useQuery({
        queryKey: ['intel', 'conflict-zones'],
        queryFn: async (): Promise<{ zones: ConflictZone[]; source: string; count: number }> => {
            const res = await fetch('/api/intel/conflict-zones');
            if (!res.ok) throw new Error(`conflict-zones returned ${res.status}`);
            return res.json();
        },
        refetchInterval: REFETCH_INTERVAL * 10, // every 10 min — AI analysis doesn't change fast
        retry: 1,
    });
}

// ——— Groq AI Category Briefing (multi-model, Supabase cached) ———
export interface BriefingEvent {
    label: string;
    type: string;
    intensity: number;
}

export interface CategoryBriefing {
    summary: string;
    model: string;
    category: string;
    source: string;
}

export function useCategorySummary(category: string, events: BriefingEvent[], enabled: boolean) {
    return useQuery({
        queryKey: ['intel', 'summary', category],
        queryFn: async (): Promise<CategoryBriefing> => {
            const res = await fetch('/api/intel/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, events }),
            });
            if (!res.ok) throw new Error(`summarize returned ${res.status}`);
            return res.json();
        },
        enabled: enabled && events.length > 0,
        staleTime: 30 * 60 * 1000, // 30 min — matches server Supabase cache TTL
        retry: 1,
    });
}
