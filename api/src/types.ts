// Unified intel event type — all API routes normalize to this shape

export type EventType =
    | "COMBAT"
    | "UNREST"
    | "DANGER"
    | "AVIATION"
    | "NAVAL"
    | "SATELLITE"
    | "CYBER"
    | "NUCLEAR"
    | "BASE";

export interface IntelEvent {
    id: string;
    type: EventType;
    lat: number;
    lng: number;
    intensity: number;       // 1–10 scale
    label: string;
    color: string;
    timestamp: string;       // ISO 8601
    meta?: Record<string, any>;
}

// Layer color mapping — matches frontend
export const LAYER_COLORS: Record<EventType, string> = {
    COMBAT: "#FF3131",
    UNREST: "#FFBD59",
    DANGER: "#FF6B35",
    AVIATION: "#00D2FF",
    NAVAL: "#7D5FFF",
    SATELLITE: "#FF00FF",
    CYBER: "#FF1493",
    NUCLEAR: "#39FF14",
    BASE: "#FFFFFF",
};
