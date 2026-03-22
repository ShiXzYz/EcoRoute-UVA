/**
 * Shared TypeScript type definitions for EcoRoute
 * Used by GPS page, Stats page, API routes, and components
 */

/**
 * GTFS Transit Stop Marker
 * Represents a single point on the map (origin or destination at a transit stop)
 */
export interface TransitStopMarker {
  id: string;
  lat: number;
  lon: number;
  name?: string;
}

export interface TransitStopPair {
  origin: TransitStopMarker;
  destination: TransitStopMarker;
}

/**
 * Single transportation mode result from /api/score
 * Includes emissions, timing, cost, and map visualization data
 */
export interface ModeResult {
  /** Mode key: solo_car, uts_bus, cat_bus, connect_bus, ebike, escooter, bike, walk */
  mode: string;
  
  /** Human-readable label with optional timing ("UTS Bus — Departs in 5 min (14:30)") */
  label: string;
  
  /** Total emissions in grams CO₂ equivalent */
  gCO2e: number;
  
  /** CO₂ saved compared to driving solo (baseline - emissions), 0 if solo_car */
  co2Saved: number;
  
  /** Estimated trip duration in minutes */
  timeMin: number;
  
  /** User cost in USD (0 for transit/bike/walk) */
  costUSD: number;
  
  /** True only on lowest-emissions option (behavioral nudge default) */
  recommended: boolean;
  
  /** Tailwind color class: green-600 (<100g), amber-500 (100-500g), red-500 (>500g) */
  color: string;
  
  /** Icon name for UI rendering: car, bus, bike, walk, etc */
  icon: string;
  
  /** Google Maps encoded polyline for car/bike/walk (client renders on map) */
  polyline?: string;
  
  /** GTFS transit stop markers (origin and destination) — transit modes only */
  transitStops?: {
    origin: TransitStopMarker;
    destination: TransitStopMarker;
  };
  
  /** Next departure time in "HH:MM" format — transit modes only */
  nextDepartureTime?: string;
  
  /** Minutes until next departure — transit modes only */
  minutesUntilDeparture?: number;
}

/**
 * API score endpoint response
 * Array of modes sorted by gCO₂e (lowest first)
 */
export interface ScoreResponse {
  origin_lat: number;
  origin_lon: number;
  destination_lat: number;
  destination_lon: number;
  distance_miles: number;
  modes: ModeResult[];
}

/**
 * Trip log entry (stored in Supabase or localStorage)
 * Records a completed trip for impact tracking and streaks
 */
export interface TripLog {
  id: string;
  user_id: string;
  timestamp: string; // ISO 8601
  origin_lat: number;
  origin_lon: number;
  destination_lat: number;
  destination_lon: number;
  mode: string; // solo_car, bike, uts_bus, etc.
  distance_miles: number;
  emissions_gco2e: number;
  duration_min: number;
  cost_usd: number;
}

/**
 * User streak and impact tracking
 * Stored in Supabase for persistence across sessions
 */
export interface UserStreak {
  user_id: string;
  current_streak: number; // Days in current streak
  best_streak: number;
  total_trips: number;
  total_emissions_avoided_kg: number; // vs solo_car baseline
  last_trip_date: string; // ISO 8601
  created_at: string;
  updated_at: string;
}

/**
 * Weekly stats for the Stats page
 * Aggregated from trips in the last 7 days
 */
export interface WeeklyStats {
  trips: TripLog[];
  totalEmissionsGco2e: number;
  totalEmissionsKg: number;
  totalTripDistance: number;
  treesEquivalent: number; // (totalEmissionsKg × 52 / 60)
  gasSavedGallons: number;
  gasSavedDollars: number;
  modeBreakdown: Record<string, { trips: number; distance: number }>;
}

/**
 * 2030 climate goal progress
 * UVA target: reduce transportation emissions by X% by 2030
 */
export interface ClimateProgress {
  userContribution: number; // kg CO₂ avoided by this user
  uvaTarget: number; // Total UVA target (kg CO₂ reduction)
  progressPercent: number; // 0-100
}

/**
 * Session state for GPS page component
 */
export interface GPSSession {
  sessionId: string;
  originLat?: number;
  originLon?: number;
  originName?: string;
  destinationLat?: number;
  destinationLon?: number;
  destinationName?: string;
  distanceMiles?: number;
  modes: ModeResult[];
  selectedModeIndex: number; // Index into modes array
  polylineVisible: boolean;
  transitStopsVisible: boolean;
  createdAt: string;
}
