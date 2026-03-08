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

    const queries = [conflicts, unrest, aviation, satellite, cyber, nuclear, naval, bases];
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
