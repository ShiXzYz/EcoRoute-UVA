/**
 * GTFS Lookup Library
 * Server-side utilities for transit stop proximity and departure time queries
 * GTFS feeds are loaded once at server startup, mapped in memory for O(1) lookups
 */

import fs from 'fs';
import path from 'path';

/**
 * Represents a transit stop from GTFS data
 */
export interface GTFSStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  desc?: string;
}

/**
 * Represents a transit route (bus line) from GTFS data
 */
export interface GTFSRoute {
  id: string;
  short_name: string;
  long_name: string;
  type: number; // 0=streetcar/tram, 3=bus, 4=ferry, etc
  color?: string;
}

/**
 * Complete parsed GTFS feed data structure
 */
export interface GTFSFeed {
  agency: string;
  stops: GTFSStop[];
  routes: GTFSRoute[];
  // Lookup: stop_id -> day_of_week -> [departure_times in "HH:MM" format]
  departures: Record<string, Record<string, string[]>>;
  // Lookup: stop_id -> [route_ids that serve this stop]
  stop_routes: Record<string, string[]>;
}

/**
 * In-memory cache of parsed GTFS feeds
 * Loaded once at module initialization (on server startup)
 */
const FEEDS = new Map<string, GTFSFeed>();

/**
 * Load all GTFS feeds from data/gtfs-parsed/ directory
 * Called automatically when the module is first imported in a server context
 */
function loadFeeds(): void {
  if (typeof window !== 'undefined') {
    // Browser context - don't try to load files
    return;
  }

  const feedNames = ['uva-gtfs', 'cat-gtfs', 'jaunt-gtfs'];
  const baseDir = path.join(process.cwd(), 'data/gtfs-parsed');

  for (const feedName of feedNames) {
    try {
      const filePath = path.join(baseDir, `${feedName}.json`);
      if (!fs.existsSync(filePath)) {
        console.warn(`[GTFS] Feed not found: ${feedName}.json - have you run 'npm run parse-gtfs'?`);
        continue;
      }

      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData) as GTFSFeed;
      FEEDS.set(feedName, data);
      console.log(`[GTFS] Loaded ${feedName} with ${data.stops.length} stops and ${data.routes.length} routes`);
    } catch (err) {
      console.warn(`[GTFS] Failed to load ${feedName}.json:`, err);
    }
  }

  if (FEEDS.size === 0) {
    console.warn('[GTFS] ⚠️  No GTFS feeds loaded! Bus stop markers will not be available.');
  }
}

// Initialize on module load (in server context only)
loadFeeds();

/**
 * Calculate straight-line distance between two geographic points using Haversine formula
 * Formula: https://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param lat1 Origin latitude (degrees)
 * @param lon1 Origin longitude (degrees)
 * @param lat2 Destination latitude (degrees)
 * @param lon2 Destination longitude (degrees)
 * @returns Distance in meters
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's mean radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // Convert to radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest transit stops within a specified radius of a point
 * Searches across all loaded GTFS feeds
 *
 * Use case: Given user's origin location, find nearby bus stops
 *
 * @param lat Latitude of search center
 * @param lon Longitude of search center
 * @param radiusMeters Maximum search radius (default: 400m = reasonable walking distance)
 * @returns Array of stops sorted by distance, nearest first
 */
export function getNearestStops(
  lat: number,
  lon: number,
  radiusMeters: number = 400,
): Array<{ stop: GTFSStop; distanceMeters: number; feed: string }> {
  const candidates: Array<{ stop: GTFSStop; distanceMeters: number; feed: string }> = [];

  for (const [feedName, feed] of FEEDS.entries()) {
    for (const stop of feed.stops) {
      const distance = haversine(lat, lon, stop.lat, stop.lon);
      if (distance <= radiusMeters) {
        candidates.push({ stop, distanceMeters: distance, feed: feedName });
      }
    }
  }

  // Sort by distance, closest first
  return candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Get the next departure time for a specific transit stop
 * Filters by current day of week and current time
 *
 * Use case: Show user "Next bus at 2:45 PM" or "Departs in 15 minutes"
 *
 * @param stopId GTFS stop ID
 * @param feed Feed name (e.g., 'uva-gtfs')
 * @returns Object with next departure time and minutes until departure, or null if no service
 */
export function getNextDeparture(
  stopId: string,
  feed: string,
): {
  nextTime: string | null;
  minutesUntilDeparture: number | null;
} {
  const feedData = FEEDS.get(feed);
  if (!feedData) {
    console.warn(`[GTFS] Feed not found: ${feed}`);
    return { nextTime: null, minutesUntilDeparture: null };
  }

  const now = new Date();
  
  // Map day of week to GTFS calendar day name
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[now.getDay()];

  // Format current time as "HH:MM"
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;

  // Get departures for this stop on this day
  const departures = feedData.departures[stopId]?.[dayName];
  if (!departures || departures.length === 0) {
    // No service at this stop on this day
    return { nextTime: null, minutesUntilDeparture: null };
  }

  // Find the next departure time that hasn't passed yet
  for (const time of departures) {
    if (time >= currentTimeStr) {
      // Calculate minutes until this departure
      const [depHour, depMin] = time.split(':').map(Number);
      const [curHour, curMin] = currentTimeStr.split(':').map(Number);
      const depMinutes = depHour * 60 + depMin;
      const curMinutes = curHour * 60 + curMin;
      const minutesUntilDeparture = Math.max(0, depMinutes - curMinutes);

      return { nextTime: time, minutesUntilDeparture };
    }
  }

  // No more departures today
  return { nextTime: null, minutesUntilDeparture: null };
}

/**
 * Find transit routes that serve both an origin and destination stop
 * Useful for determining which bus lines connect two points
 *
 * Use case: Build list of available routes for transit mode
 *
 * @param originStops Array of stops near the origin
 * @param destStops Array of stops near the destination  
 * @param feed Feed name
 * @returns Array of connections each showing which routes serve both stops
 */
export function findConnectingStops(
  originStops: GTFSStop[],
  destStops: GTFSStop[],
  feed: string,
): Array<{
  originStop: GTFSStop;
  destStop: GTFSStop;
  routes: GTFSRoute[];
}> {
  const feedData = FEEDS.get(feed);
  if (!feedData) {
    return [];
  }

  const connections: Array<{
    originStop: GTFSStop;
    destStop: GTFSStop;
    routes: GTFSRoute[];
  }> = [];

  for (const originStop of originStops) {
    for (const destStop of destStops) {
      // Get route IDs that serve the origin stop
      const originRouteIds = feedData.stop_routes[originStop.id] || [];
      
      // Get route IDs that serve the destination stop
      const destRouteIds = feedData.stop_routes[destStop.id] || [];

      // Find routes that serve both stops (direct routes only, no transfers)
      const sharedRouteIds = originRouteIds.filter(id => destRouteIds.includes(id));

      if (sharedRouteIds.length > 0) {
        // Convert route IDs to full route objects
        const routes = sharedRouteIds
          .map(id => feedData.routes.find(r => r.id === id))
          .filter((r): r is GTFSRoute => r !== undefined);

        connections.push({ originStop, destStop, routes });
      }
    }
  }

  return connections;
}

/**
 * Get all loaded GTFS feeds
 * @returns Array of all loaded feeds
 */
export function getAllFeeds(): GTFSFeed[] {
  return Array.from(FEEDS.values());
}

/**
 * Get a specific feed by name
 * @param feedName Feed name (e.g., 'uva-gtfs')
 * @returns Feed data or undefined if not loaded
 */
export function getFeed(feedName: string): GTFSFeed | undefined {
  return FEEDS.get(feedName);
}

/**
 * Get the names of all loaded feeds
 * @returns Array of feed names
 */
export function getFeedNames(): string[] {
  return Array.from(FEEDS.keys());
}
