export interface OverpassServer {
  name: string;
  interpreterUrl: string;
  healthUrl?: string;
  referer?: string;
  timeoutSeconds: number;
}

export interface OverpassResponse {
  elements?: Array<{
    type?: string;
    id?: number;
    tags?: Record<string, string>;
    [key: string]: unknown;
  }>;
  remark?: string;
  osm3s?: {
    timestamp_osm_base?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface OverpassHealth {
  status?: string;
  in_flight?: number;
  lag_seconds?: number;
  timestamp_osm_base?: string;
  elevation?: string;
  geocoding?: string;
  maps?: string;
  [key: string]: unknown;
}

export interface OverpassQueryResult {
  data: OverpassResponse;
  server: string;
  durationMs: number;
  timestampOsmBase?: string;
}

export interface OverpassHealthResult {
  server: string;
  available: boolean;
  health?: OverpassHealth;
  error?: string;
}
