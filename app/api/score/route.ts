/**
 * /api/score — Rank transportation modes by emissions
 * 
 * This endpoint combines:
 * 1. Google Directions API (via client) for distance + polyline
 * 2. GTFS data (server-side) for transit stops + departure times
 * 3. EPA 2023 emission factors (hardcoded) for calculations
 * 
 * Returns array of modes sorted by gCO₂e (ascending), with recommended flag
 * on lowest-emissions option to nudge behavioral default.
 */

import { getNearestStops, getNextDeparture, findConnectingStops } from '@/lib/gtfs';

/**
 * EPA Emission Factors (g CO₂e per mile) — Hardcoded 2023 baseline
 * Source: EPA 2023 data
 * 
 * Key modes:
 * - solo_car: 400 — average passenger vehicle (baseline)
 * - uts_bus, cat_bus, connect_bus: 44 — transit bus at 45% load factor (UVA free)
 * - ebike: 65 — VEO operations + manufacturing
 * - escooter: 70 — VEO operations + manufacturing
 * - bike, walk: 0 — zero operational emissions
 * 
 * Do NOT fetch from external sources. These are fixed for MVP.
 */
const EMISSION_FACTORS = {
  solo_car: 400,
  uts_bus: 44,
  cat_bus: 44,
  connect_bus: 44,
  ebike: 65,
  escooter: 70,
  bike: 0,
  walk: 0,
};

/**
 * Score request structure — minimal GPS data from client
 * Google Directions (DRIVING, WALKING, BICYCLING) is called client-side
 * and result (distance, polyline) is passed here for scoring
 */
interface ScoreRequest {
  originLat: number;
  originLon: number;
  destinationLat: number;
  destinationLon: number;
  distance_miles: number; // From Google Directions API (client)
  polyline?: string;      // Google Maps encoded polyline (for client map)
}

/**
 * ModeResult — Single transportation mode result
 * 
 * Fields:
 * - mode: Key used in emissions calculations
 * - label: Human-readable text with timing (e.g., "UTS Bus — in 5 min (14:30)")
 * - gCO2e: Total emissions in grams CO₂ equivalent
 * - timeMin: Estimated trip duration
 * - costUSD: User-facing cost
 * - recommended: True only on lowest-emissions option (behavioral nudge)
 * - color: Tailwind utility class for UI
 * - icon: Icon name for UI
 * - polyline: Google Maps encoded path (car, bike, walk only)
 * - transitStops: Origin/dest stop markers from GTFS (transit only)
 * - nextDepartureTime: "HH:MM" format of next bus
 * - minutesUntilDeparture: Minutes from now until departure
 */
interface ModeResult {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  color: string;
  icon: string;
  polyline?: string;
  transitStops?: {
    origin: { id: string; lat: number; lon: number };
    destination: { id: string; lat: number; lon: number };
  };
  nextDepartureTime?: string;
  minutesUntilDeparture?: number;
}

/**
 * Helper: Calculate emissions for a single mode
 * Pure calculation: distance × emission_factor
 */
function scoreMode(mode: string, distance: number): Omit<ModeResult, 'label' | 'recommended'> | null {
  const factor = EMISSION_FACTORS[mode as keyof typeof EMISSION_FACTORS];
  if (factor === undefined) return null;

  // Time estimations (Charlottesville context)
  const timeEstimates: Record<string, number> = {
    solo_car: Math.round((distance / 25) * 60),        // 25 mph avg
    uts_bus: Math.round((distance / 12) * 60) + 8,     // 12 mph + 8 min wait
    cat_bus: Math.round((distance / 12) * 60) + 8,
    connect_bus: Math.round((distance / 15) * 60) + 5,
    ebike: Math.round((distance / 12) * 60),
    escooter: Math.round((distance / 10) * 60),
    bike: Math.round((distance / 10) * 60),
    walk: Math.round((distance / 3) * 60),
  };

  // Cost estimations
  const costEstimates: Record<string, number> = {
    solo_car: Math.round((distance / 28) * 3.5), // $3.5/gal, 28 mpg
    uts_bus: 0,
    cat_bus: 0,
    connect_bus: 0,
    ebike: distance < 1 ? 1 : Math.round(1 + distance * 0.39),
    escooter: distance < 1 ? 1 : Math.round(1 + distance * 0.39),
    bike: 0,
    walk: 0,
  };

  const gCO2e = Math.round(distance * factor);

  return {
    mode,
    gCO2e,
    timeMin: timeEstimates[mode] || 0,
    costUSD: costEstimates[mode] || 0,
    color: getModeColor(gCO2e),
    icon: getModeIcon(mode),
  };
}

/**
 * Get friendly label for mode (optionally with transit timing)
 */
function getModeLabel(
  mode: string,
  departure?: { minutesUntil: number; time: string }
): string {
  const baseLabels: Record<string, string> = {
    solo_car: 'Drive solo',
    uts_bus: 'UTS Bus',
    cat_bus: 'CAT Transit',
    connect_bus: 'CONNECT Bus',
    ebike: 'E-Bike (VEO)',
    escooter: 'E-Scooter (VEO)',
    bike: 'Bike',
    walk: 'Walk',
  };

  const base = baseLabels[mode] || mode;

  if (departure && ['uts_bus', 'cat_bus', 'connect_bus'].includes(mode)) {
    return `${base} — Departs in ${departure.minutesUntil} min (${departure.time})`;
  }

  return base;
}

/**
 * Tailwind color class based on emissions intensity
 */
function getModeColor(gCO2e: number): string {
  if (gCO2e < 100) return 'green-600';
  if (gCO2e < 500) return 'amber-500';
  return 'red-500';
}

/**
 * Icon name for mode (used by frontend)
 */
function getModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    solo_car: 'car',
    uts_bus: 'bus',
    cat_bus: 'bus',
    connect_bus: 'bus',
    ebike: 'bike',
    escooter: 'scooter',
    bike: 'bike',
    walk: 'walk',
  };
  return icons[mode] || 'help';
}

/**
 * Main /api/score endpoint
 * 
 * Query parameters:
 * - originLat, originLon: Starting point (from user or Places Autocomplete)
 * - destinationLat, destinationLon: Ending point
 * - distance_miles: Trip distance (from Google Directions—client calls this first)
 * - polyline: Google Maps encoded polyline for non-transit modes
 * 
 * Response: Array of ModeResult objects sorted by gCO₂e (ascending)
 * Each transit mode includes GTFS data: stop locations and next departure times
 */
export async function POST(req: Request) {
  try {
    const body: ScoreRequest = await req.json();
    const { originLat, originLon, destinationLat, destinationLon, distance_miles, polyline } = body;

    // Validate required fields
    if (!originLat || !originLon || !destinationLat || !destinationLon) {
      return Response.json(
        { error: 'Missing coordinates: originLat, originLon, destinationLat, destinationLon' },
        { status: 400 }
      );
    }

    if (!distance_miles || distance_miles <= 0) {
      return Response.json({ error: 'Invalid distance_miles' }, { status: 400 });
    }

    const modes: ModeResult[] = [];

    // 1. Non-transit modes: car, bike, walk, ebike, escooter
    // These use Google Directions polyline directly
    const nonTransitModes = ['solo_car', 'bike', 'walk', 'ebike', 'escooter'];
    for (const mode of nonTransitModes) {
      const score = scoreMode(mode, distance_miles);
      if (score) {
        modes.push({
          ...score,
          label: getModeLabel(mode),
          recommended: false,
          polyline, // Client will render this on map
        });
      }
    }

    // 2. Transit modes: Query GTFS for nearby stops and departures
    const originStops = getNearestStops(originLat, originLon, 400); // 400m radius
    const destStops = getNearestStops(destinationLat, destinationLon, 400);

    if (originStops.length > 0 && destStops.length > 0) {
      // Build set of feeds that have service at both origin and destination
      const feedsWithOrigin = new Set(originStops.map(s => s.feed));
      const feedsWithDest = new Set(destStops.map(s => s.feed));
      const commonFeeds = Array.from(feedsWithOrigin).filter(f => feedsWithDest.has(f));

      // For each feed with service at both locations, create transit modes
      for (const feed of commonFeeds) {
        const originStopsInFeed = originStops.filter(s => s.feed === feed);
        const destStopsInFeed = destStops.filter(s => s.feed === feed);

        const connections = findConnectingStops(
          originStopsInFeed.map(s => s.stop),
          destStopsInFeed.map(s => s.stop),
          feed
        );

        // For each connection, create a transit mode result
        for (const conn of connections) {
          const { nextTime, minutesUntilDeparture } = getNextDeparture(conn.originStop.id, feed);

          // Determine mode key based on feed name
          let modeKey = 'uts_bus';
          if (feed === 'cat-gtfs') modeKey = 'cat_bus';
          if (feed === 'jaunt-gtfs') modeKey = 'connect_bus';

          const score = scoreMode(modeKey, distance_miles);
          if (score) {
            modes.push({
              ...score,
              label: getModeLabel(modeKey, nextTime ? { minutesUntil: minutesUntilDeparture || 0, time: nextTime } : undefined),
              recommended: false,
              transitStops: {
                origin: {
                  id: conn.originStop.id,
                  lat: conn.originStop.lat,
                  lon: conn.originStop.lon,
                },
                destination: {
                  id: conn.destStop.id,
                  lat: conn.destStop.lat,
                  lon: conn.destStop.lon,
                },
              },
              nextDepartureTime: nextTime || undefined,
              minutesUntilDeparture: minutesUntilDeparture || undefined,
            });
          }
        }
      }
    }

    // 3. Sort by emiss ions (ascending) and mark lowest as recommended
    modes.sort((a, b) => a.gCO2e - b.gCO2e);

    if (modes.length > 0) {
      modes[0].recommended = true;
    }

    // Find baseline (solo_car) emissions for comparison
    const baselineMode = modes.find(m => m.mode === 'solo_car');
    const baseline = {
      solo_car_gco2e: baselineMode?.gCO2e || 0,
    };

    return Response.json({
      origin_lat: originLat,
      origin_lon: originLon,
      destination_lat: destinationLat,
      destination_lon: destinationLon,
      distance_miles,
      scores: modes,
      baseline,
    });
  } catch (error) {
    console.error('[/api/score] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
