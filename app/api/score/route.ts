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

import { getNearestStops, getNextDeparture, findConnectingStops, getShapePoints, getRouteName } from '@/lib/gtfs';

/**
 * EPA Emission Factors (g CO₂e per mile, PER PASSENGER)
 * Transit bus factors account for vehicle fuel consumption divided by avg occupancy
 * 
 * TRANSIT BUS CALCULATIONS:
 * Formula: (MPG conversion to gal/mi) × (10,210 g CO₂e/gal gasoline) ÷ avg passengers
 * 
 * - uts_bus: 160 g CO₂e/mi
 *   Vehicle: 3.2 MPG (campus routes, ~10 mph avg) = 0.3125 gal/mi
 *   Emissions: 0.3125 × 10,210 = 3,190 g CO₂e/vehicle-mi
 *   Avg occupancy: 20 passengers → 3,190 ÷ 20 ≈ 160 g per passenger
 * 
 * - cat_bus: 265 g CO₂e/mi
 *   Vehicle: 3.5 MPG (city routes, ~12 mph avg) = 0.286 gal/mi
 *   Emissions: 0.286 × 10,210 = 2,920 g CO₂e/vehicle-mi
 *   Avg occupancy: 11 passengers → 2,920 ÷ 11 ≈ 265 g per passenger
 * 
 * - connect_bus: 95 g CO₂e/mi
 *   Vehicle: 6.0 MPG (commuter/highway, ~30 mph avg, 35-ft coach) = 0.167 gal/mi
 *   Emissions: 0.167 × 10,210 = 1,705 g CO₂e/vehicle-mi
 *   Avg occupancy: 18 passengers → 1,705 ÷ 18 ≈ 95 g per passenger
 * 
 * OTHER MODES:
 * - solo_car: 400 — average passenger vehicle (baseline)
 * - carpool_2: 200 — 2 people sharing
 * - carpool_3: 133 — 3 people sharing
 * - ebike: 8 — electric bike (VEO)
 * - escooter: 8 — electric scooter (VEO)
 * - bike: 0 — zero operational emissions
 * - walk: 0 — zero operational emissions
 * - ev: 120 — electric vehicle
 * 
 * Do NOT fetch from external sources. These are fixed for MVP.
 */
const EMISSION_FACTORS: Record<string, number> = {
  solo_car: 400,
  carpool_2: 200,
  carpool_3: 133,
  uts_bus: 160,
  cat_bus: 265,
  connect_bus: 95,
  ebike: 8,
  escooter: 8,
  bike: 0,
  walk: 0,
  ev: 120,
};

const BASELINE_EMISSIONS = 400; // solo car emissions per mile

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
 * - co2Saved: CO₂ saved compared to driving solo (baseline - emissions), 0 if solo_car
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
  co2Saved: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  color: string;
  icon: string;
  polyline?: string;
  transitStops?: {
    origin: { id: string; lat: number; lon: number; name?: string };
    destination: { id: string; lat: number; lon: number; name?: string };
  };
  shapePoints?: { lat: number; lng: number }[];
  nextDepartureTime?: string;
  minutesUntilDeparture?: number;
}

/**
 * Helper: Calculate emissions for a single mode
 * Pure calculation: distance × emission_factor
 * co2Saved = baseline - emissions (0 if solo_car)
 */
function scoreMode(mode: string, distance: number, walkTimeMin: number = 0): Omit<ModeResult, 'label' | 'recommended'> | null {
  const factor = EMISSION_FACTORS[mode as keyof typeof EMISSION_FACTORS];
  if (factor === undefined) return null;

  const WALK_SPEED_MPH = 3;

  const timeEstimates: Record<string, number> = {
    solo_car: Math.round((distance / 25) * 60),
    carpool_2: Math.round((distance / 25) * 60),
    carpool_3: Math.round((distance / 25) * 60),
    uts_bus: Math.round((distance / 12) * 60) + 8 + walkTimeMin,
    cat_bus: Math.round((distance / 12) * 60) + 8 + walkTimeMin,
    connect_bus: Math.round((distance / 15) * 60) + 5 + walkTimeMin,
    ebike: Math.round((distance / 12) * 60),
    escooter: Math.round((distance / 12) * 60),
    bike: Math.round((distance / 10) * 60),
    walk: Math.round((distance / WALK_SPEED_MPH) * 60),
    ev: Math.round((distance / 25) * 60),
  };

  const costEstimates: Record<string, number> = {
    solo_car: Math.round(distance * 0.39),
    uts_bus: 0,
    cat_bus: 0,
    connect_bus: 0,
    ebike: distance < 1 ? 1 : Math.round(1 + distance * 0.39),
    bike: 0,
    walk: 0,
  };

  const gCO2e = Math.round(distance * factor);
  const baselineEmissions = distance * BASELINE_EMISSIONS;
  // solo_car always saves 0, others save baseline - emissions (clamped to 0)
  const co2Saved = mode === 'solo_car' ? 0 : Math.max(0, Math.round(baselineEmissions - gCO2e));

  return {
    mode,
    gCO2e,
    co2Saved,
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
    ebike: 'E-Bike/Scooter (VEO)',
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
 * Clip shape polyline to only show segment between origin and destination stops
 * Uses linear interpolation to find actual stop positions on the shape
 */
function clipShapeToStops(
  points: {lat: number, lng: number}[],
  originStop: {lat: number, lon: number},
  destStop: {lat: number, lon: number}
): {lat: number, lng: number}[] {
  if (points.length < 2) return [];

  // Find indices of closest shape points to each stop
  const findNearestIndex = (stop: {lat: number, lon: number}) => {
    let minDist = Infinity;
    let minIdx = 0;
    points.forEach((p, i) => {
      const dist = haversineDistance(stop.lat, stop.lon, p.lat, p.lng);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    });
    return { index: minIdx, distance: minDist };
  };

  const originNearest = findNearestIndex(originStop);
  const destNearest = findNearestIndex(destStop);

  // If stops are too far from shape (>600m), skip polyline
  if (originNearest.distance > 600 || destNearest.distance > 600) {
    return [];
  }

  const startIdx = originNearest.index;
  const endIdx = destNearest.index;

  let segment = points.slice(
    Math.min(startIdx, endIdx),
    Math.max(startIdx, endIdx) + 1
  );

  // If origin index > dest index, the shape is going backwards on this route
  // We need to reverse the segment so it visually shows the correct direction
  if (startIdx > endIdx) {
    segment = segment.reverse();
  }

  // If segment is too short (<3 points) or too long (>50% of full shape), return empty
  // to avoid showing nonsensical routes
  if (segment.length < 3 || segment.length > points.length * 0.7) {
    // For very short or very long segments, just use a direct line
    return [{
      lat: originStop.lat,
      lng: originStop.lon
    }, {
      lat: destStop.lat,
      lng: destStop.lon
    }];
  }

  return segment;
}

/**
 * Haversine distance in meters
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

    // 1. Non-transit modes: car, bike, walk, micro-mobility
    // These use Google Directions polyline directly
    const nonTransitModes = ['solo_car', 'bike', 'walk', 'ebike'];
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
    const originStops = getNearestStops(originLat, originLon, 1600); // 1600 m or ~ 1 mile radius
    const destStops = getNearestStops(destinationLat, destinationLon, 1600);

    if (originStops.length > 0 && destStops.length > 0) {
      // Build set of feeds that have service at both origin and destination
      const feedsWithOrigin = new Set(originStops.map(s => s.feed));
      const feedsWithDest = new Set(destStops.map(s => s.feed));
      const commonFeeds = Array.from(feedsWithOrigin).filter(f => feedsWithDest.has(f));

      // For each feed with service at both locations, create ONE optimal transit mode
      for (const feed of commonFeeds) {
        const originStopsInFeed = originStops.filter(s => s.feed === feed);
        const destStopsInFeed = destStops.filter(s => s.feed === feed);

        const connections = findConnectingStops(
          originStopsInFeed.map(s => s.stop),
          destStopsInFeed.map(s => s.stop),
          feed
        );

        if (connections.length === 0) continue;

        // Find the best connection: prefer earliest departure, then shortest walk
        let bestConnection = connections[0];
        let bestScore = Infinity;

        for (const conn of connections) {
          const { minutesUntilDeparture } = getNextDeparture(conn.originStop.id, feed);
          const originStopData = originStopsInFeed.find(s => s.stop.id === conn.originStop.id);
          const originDist = originStopData?.distanceMeters || 9999;
          const destStopData = destStopsInFeed.find(s => s.stop.id === conn.destStop.id);
          const destDist = destStopData?.distanceMeters || 9999;
          
          // Score: lower is better (prioritize departure time, then walk distance)
          const score = (minutesUntilDeparture || 999) * 100 + originDist + destDist;
          if (score < bestScore) {
            bestScore = score;
            bestConnection = conn;
          }
        }

        const conn = bestConnection;
        const { nextTime, minutesUntilDeparture } = getNextDeparture(conn.originStop.id, feed);
        
        // Get actual distances for time calculation
        const originStopData = originStopsInFeed.find(s => s.stop.id === conn.originStop.id);
        const destStopData = destStopsInFeed.find(s => s.stop.id === conn.destStop.id);
        const originWalkMeters = originStopData?.distanceMeters || 0;
        const destWalkMeters = destStopData?.distanceMeters || 0;

        const originDist = originStopsInFeed.find(s => s.stop.id === conn.originStop.id)?.distanceMeters || 0;
        const destDist = destStopsInFeed.find(s => s.stop.id === conn.destStop.id)?.distanceMeters || 0;
        const WALK_SPEED_MPH = 3;
        const METERS_TO_MILES = 0.000621371;
        const walkTimeMin = Math.round((originDist * METERS_TO_MILES / WALK_SPEED_MPH) * 60 + (destDist * METERS_TO_MILES / WALK_SPEED_MPH) * 60);

        let modeKey = 'uts_bus';
        let agencyName = 'UVA Transit';
        if (feed === 'cat-gtfs') {
          modeKey = 'cat_bus';
          agencyName = 'CAT Transit';
        }
        if (feed === 'jaunt-gtfs') {
          modeKey = 'connect_bus';
          agencyName = 'CONNECT';
        }

        const routeNames = conn.routes
          .map(r => {
            const friendly = getRouteName(feed, r.id);
            return friendly?.name || r.long_name || r.short_name;
          })
          .filter((name, idx, arr) => arr.indexOf(name) === idx)
          .join(', ');
        const hasSchedule = nextTime !== null;

        // Calculate actual transit time
        const WALK_SPEED_M_PER_MIN = 80; // ~3 mph walking speed
        const BUS_SPEED_M_PER_MIN = 267; // ~10 mph average bus speed (includes stops)
        
        // Walk time to origin stop (in minutes)
        const walkToStop = Math.ceil(originWalkMeters / WALK_SPEED_M_PER_MIN);
        // Walk time from destination stop (in minutes)
        const walkFromStop = Math.ceil(destWalkMeters / WALK_SPEED_M_PER_MIN);
        // Wait time for bus
        const waitTime = minutesUntilDeparture || 0;
        
        // Calculate bus ride distance using shape points
        const allShapePoints = conn.shapeId ? getShapePoints(feed, conn.shapeId) : [];
        const clippedPoints = clipShapeToStops(allShapePoints, conn.originStop, conn.destStop);
        
        // Calculate bus ride time based on shape distance
        let busRideTime = 0;
        if (clippedPoints.length > 1) {
          // Sum up distances between consecutive shape points
          let totalBusDistMeters = 0;
          for (let i = 1; i < clippedPoints.length; i++) {
            totalBusDistMeters += haversineDistance(
              clippedPoints[i-1].lat, clippedPoints[i-1].lng,
              clippedPoints[i].lat, clippedPoints[i].lng
            );
          }
          busRideTime = Math.ceil(totalBusDistMeters / BUS_SPEED_M_PER_MIN);
        } else {
          // Fallback: estimate bus ride as remaining distance at bus speed
          const busDistMeters = (distance_miles * 1609.34) - originWalkMeters - destWalkMeters;
          busRideTime = Math.ceil(Math.max(0, busDistMeters) / BUS_SPEED_M_PER_MIN);
        }
        
        // Total transit time
        const totalTransitTime = Math.max(1, walkToStop + waitTime + busRideTime + walkFromStop);

        const score = scoreMode(modeKey, distance_miles);
        if (score) {
          modes.push({
            ...score,
            mode: modeKey,
            timeMin: totalTransitTime, // Override with calculated time
            label: `${agencyName}${routeNames ? ` (${routeNames})` : ''}${hasSchedule ? ` — Departs ${minutesUntilDeparture} min (${nextTime})` : ''}`,
            recommended: false,
            transitStops: {
              origin: {
                id: conn.originStop.id,
                lat: conn.originStop.lat,
                lon: conn.originStop.lon,
                name: conn.originStop.name,
              },
              destination: {
                id: conn.destStop.id,
                lat: conn.destStop.lat,
                lon: conn.destStop.lon,
                name: conn.destStop.name,
              },
            },
            shapePoints: clippedPoints.length > 0 ? clippedPoints : undefined,
            nextDepartureTime: nextTime || undefined,
            minutesUntilDeparture: minutesUntilDeparture || undefined,
          });
        }
      }
    }

    // 3. Sort by emissions (ascending) and mark lowest as recommended
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
