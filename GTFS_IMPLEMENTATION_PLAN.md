# EcoRoute GTFS & Bus Stop Marker Feature Plan

## Part 1: GTFS File Organization

### Directory Structure
```
data/
├── gtfs-raw/                      # Original ZIP files (never committed to git)
│   ├── University_Transit_Service_GTFS.zip
│   ├── Charlottesvilleareatransit_GTFS.zip
│   └── jaunt_connect_charlottesville.zip
└── gtfs-parsed/                   # Output JSON files (committed to git)
    ├── uva-gtfs.json              # Parsed UVA Transit Service
    ├── cat-gtfs.json              # Parsed CAT (Charlottesville Area Transit)
    └── jaunt-gtfs.json            # Parsed JAUNT/CONNECT
```

### Action Items
- [ ] Move GTFS ZIP files from root to `data/gtfs-raw/`
- [ ] Update `.gitignore` to exclude `data/gtfs-raw/*.zip` and `data/gtfs-parsed/*.json` initially (or commit parsed JSON if small)
- [ ] Update `scripts/parse-gtfs.js` paths to read from `data/gtfs-raw/` and write to `data/gtfs-parsed/`

### .gitignore Entry
```
# GTFS raw feeds (large, regenerated via parse-gtfs.js)
data/gtfs-raw/*.zip
data/gtfs-raw/*.txt

# Optionally commit parsed JSON if under 5MB
# data/gtfs-parsed/*.json
```

---

## Part 2: Bus Stop Marker Feature — Detailed Implementation Plan

### Feature Overview
When a user searches for a trip, the GPS page displays:
- **Origin marker** (blue) at user's starting point
- **Destination marker** (green) at user's destination
- **Bus stop markers** (orange) for nearest transit stops
- **Time on card** showing "Next bus in X min" or "Departs 10:45 AM"

---

## Part 3: Step-by-Step Implementation

### Step 1: Parse GTFS into Usable JSON (Backend Setup)

**File:** `scripts/parse-gtfs.js` (improve from template)

**Parse these GTFS tables:**
- `stops.txt` → Array of stops with `{ id, name, lat, lon, desc }`
- `routes.txt` → Array of routes with `{ id, short_name, long_name, type }`
- `stop_times.txt` → For each stop: array of departure times  
- `calendar.txt` → Service calendar rules (day of week, date ranges)
- `trips.txt` → Link trips to routes (crucial for service filtering)

**Output structure per feed (e.g., `uva-gtfs.json`):**

```json
{
  "agency": "UVA Transit Service",
  "stops": [
    {
      "id": "UVA-001",
      "name": "Alderman Library",
      "lat": 38.0336,
      "lon": -78.5080,
      "desc": "Main library grounds"
    }
  ],
  "routes": [
    {
      "id": "UVA-Route-1",
      "short_name": "1",
      "long_name": "Main Campus Loop",
      "type": 3,
      "color": "FF6B35"
    }
  ],
  "departures": {
    "UVA-001": {
      "monday": ["07:15", "07:45", "08:15"],
      "tuesday": ["07:15", "07:45", "08:15"],
      "saturday": ["09:00", "10:00"],
      "sunday": []
    }
  },
  "stop_routes": {
    "UVA-001": ["UVA-Route-1", "UVA-Route-2"]
  }
}
```

**Critical handling:**
- **Service calendars:** Filter departures by day of week using `calendar.txt` + `trips.txt` service_id matching
- **Post-midnight times:** GTFS encodes 1:15 AM as "25:15". Convert to minutes past midnight for comparison
- **Date exceptions:** Handle service date exceptions (e.g., holidays when no service runs)

---

### Step 2: Create GTFS Lookup Library

**File:** `lib/gtfs.ts`

```typescript
import fs from 'fs';
import path from 'path';

export interface GTFSStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  desc?: string;
}

export interface GTFSRoute {
  id: string;
  short_name: string;
  long_name: string;
  type: number; // 0=street rail, 3=bus, etc
  color?: string;
}

export interface GTFSFeed {
  agency: string;
  stops: GTFSStop[];
  routes: GTFSRoute[];
  departures: Record<string, Record<string, string[]>>; // stop_id -> day -> times
  stop_routes: Record<string, string[]>; // stop_id -> route_ids
}

// Load feeds at module initialization (once per server)
const FEEDS = new Map<string, GTFSFeed>();

function loadFeeds() {
  const feeds = ['uva-gtfs', 'cat-gtfs', 'jaunt-gtfs'];
  for (const feed of feeds) {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), `data/gtfs-parsed/${feed}.json`), 'utf-8')
      );
      FEEDS.set(feed, data);
    } catch (err) {
      console.warn(`Failed to load ${feed}.json:`, err);
    }
  }
}

// Call once on server startup
if (typeof window === 'undefined') {
  loadFeeds();
}

/**
 * Haversine distance between two points (in meters)
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest transit stops within 400m of a point
 */
export function getNearestStops(
  lat: number,
  lon: number,
  radiusMeters: number = 400
): Array<{ stop: GTFSStop; distanceMeters: number; feed: string }> {
  const candidates: Array<{ stop: GTFSStop; distanceMeters: number; feed: string }> = [];

  for (const [feedName, feed] of FEEDS) {
    for (const stop of feed.stops) {
      const distance = haversine(lat, lon, stop.lat, stop.lon);
      if (distance <= radiusMeters) {
        candidates.push({ stop, distanceMeters: distance, feed: feedName });
      }
    }
  }

  return candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Get next departure time for a specific stop
 * @param stopId GTFS stop ID
 * @param feed Feed name (e.g., 'uva-gtfs')
 * @returns { nextTime: "HH:MM" | null, minutesUntilDeparture: number | null }
 */
export function getNextDeparture(stopId: string, feed: string): {
  nextTime: string | null;
  minutesUntilDeparture: number | null;
} {
  const feedData = FEEDS.get(feed);
  if (!feedData) return { nextTime: null, minutesUntilDeparture: null };

  const now = new Date();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const departures = feedData.departures[stopId]?.[dayName];
  if (!departures || departures.length === 0) {
    return { nextTime: null, minutesUntilDeparture: null };
  }

  // Find next departure time
  for (const time of departures) {
    if (time >= currentTimeStr) {
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
 * Find connecting stops: origin stops -> destination stops via shared routes
 */
export function findConnectingStops(
  originStops: GTFSStop[],
  destStops: GTFSStop[],
  feed: string
): Array<{ originStop: GTFSStop; destStop: GTFSStop; routes: GTFSRoute[] }> {
  const feedData = FEEDS.get(feed);
  if (!feedData) return [];

  const connections: Array<{ originStop: GTFSStop; destStop: GTFSStop; routes: GTFSRoute[] }> = [];

  for (const originStop of originStops) {
    for (const destStop of destStops) {
      // Find routes that serve both stops
      const originRouteIds = feedData.stop_routes[originStop.id] || [];
      const destRouteIds = feedData.stop_routes[destStop.id] || [];
      const sharedRouteIds = originRouteIds.filter(id => destRouteIds.includes(id));

      if (sharedRouteIds.length > 0) {
        const routes = sharedRouteIds
          .map(id => feedData.routes.find(r => r.id === id))
          .filter((r): r is GTFSRoute => !!r);

        connections.push({ originStop, destStop, routes });
      }
    }
  }

  return connections;
}

export function getAllFeeds(): GTFSFeed[] {
  return Array.from(FEEDS.values());
}
```

---

### Step 3: Update `/api/score` Route to Include Transit Stop Data

**File:** `app/api/score/route.ts`

Add transit stop computation to the scoring response:

```typescript
import { getNearestStops, getNextDeparture, findConnectingStops, getAllFeeds } from '@/lib/gtfs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination } = body; // lat,lon format

    // ... existing Google Directions logic ...

    // 1. Find nearest stops at origin
    const originStops = getNearestStops(originLat, originLon);
    if (!originStops.length) {
      // No transit options available
      return Response.json({ modes: [...] });
    }

    // 2. Find nearest stops at destination
    const destStops = getNearestStops(destLat, destLon);

    // 3. Find connecting routes across all feeds
    const allFeeds = getAllFeeds();
    const connections = [];
    for (const feed of allFeeds) {
      const feedConnections = findConnectingStops(
        originStops.map(s => s.stop),
        destStops.map(s => s.stop),
        feed
      );
      connections.push(...feedConnections);
    }

    // 4. Build transit mode results
    for (const connection of connections) {
      const { originStop, destStop, routes } = connection;
      const { nextTime, minutesUntilDeparture } = getNextDeparture(originStop.id, feedName);

      const transitMode: ModeResult = {
        mode: 'uts_bus', // or 'cat_bus' based on feed
        label: `${routes[0].short_name} (${minutesUntilDeparture ? `in ${minutesUntilDeparture} min` : 'Check schedule'})`,
        gCO2e: distanceMiles * EMISSION_FACTORS.uts_bus,
        timeMin: estimateTransitTime(originStop, destStop, nextTime),
        costUSD: 0,
        color: 'blue-600',
        icon: 'bus',
        recommended: false,
        transitStops: {
          origin: { id: originStop.id, lat: originStop.lat, lon: originStop.lon },
          destination: { id: destStop.id, lat: destStop.lat, lon: destStop.lon },
        },
        nextDepartureTime: nextTime,
        minutesUntilDeparture: minutesUntilDeparture,
      };

      modes.push(transitMode);
    }

    // Sort by gCO2e, set recommended flag
    modes.sort((a, b) => a.gCO2e - b.gCO2e);
    modes[0].recommended = true;

    return Response.json(modes);
  } catch (err) {
    console.error('Score API error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### Step 4: Update ModeResult Interface

**File:** `types/index.ts`

```typescript
export interface TransitStopMarker {
  id: string;
  lat: number;
  lon: number;
}

export interface ModeResult {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  color: string;
  icon: string;
  recommended: boolean;
  polyline?: string; // For car, bike, walk
  bikeWarning?: boolean;
  
  // NEW: Transit-specific fields
  transitStops?: {
    origin: TransitStopMarker;
    destination: TransitStopMarker;
  };
  nextDepartureTime?: string; // "HH:MM"
  minutesUntilDeparture?: number;
}
```

---

### Step 5: Update GPS Page Map Component

**File:** `components/MapSelector.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

interface MapProps {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  selectedMode: ModeResult;
}

export default function MapSelector({ origin, destination, selectedMode }: MapProps) {
  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '400px' }}
      center={origin}
      zoom={14}
    >
      {/* Origin marker (blue pin) */}
      <Marker position={origin} title="Start" icon={{ url: '/icons/pin-blue.png' }} />

      {/* Destination marker (green pin) */}
      <Marker position={destination} title="End" icon={{ url: '/icons/pin-green.png' }} />

      {/* Transit: Show stop markers (orange pins) */}
      {selectedMode.transitStops && (
        <>
          <Marker
            position={selectedMode.transitStops.origin}
            title="Transit Stop"
            icon={{ url: '/icons/pin-orange.png' }}
          />
          <Marker
            position={selectedMode.transitStops.destination}
            title="Transit Stop"
            icon={{ url: '/icons/pin-orange.png' }}
          />
        </>
      )}

      {/* Car/Bike/Walk: Show polyline */}
      {selectedMode.polyline && (
        <Polyline
          path={decodedPolyline(selectedMode.polyline)}
          options={{
            strokeColor: selectedMode.color,
            strokeOpacity: 0.8,
            strokeWeight: 4,
          }}
        />
      )}
    </GoogleMap>
  );
}
```

---

### Step 6: Update ModeCard Component to Show Time

**File:** `components/ModeCard.tsx`

```typescript
export default function ModeCard({ mode, isSelected, onSelect }: ModeCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-slate-200'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold">{mode.label}</p>
          <p className="text-sm text-slate-600">{mode.timeMin} min</p>
          {/* NEW: Show next departure for transit */}
          {mode.minutesUntilDeparture !== undefined && (
            <p className="text-xs text-amber-600 font-semibold">
              Departs in {mode.minutesUntilDeparture} min {mode.nextDepartureTime && `at ${mode.nextDepartureTime}`}
            </p>
          )}
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${getModeColor(mode.gCO2e)}`}>
            {mode.gCO2e}g
          </p>
          <p className="text-sm text-slate-600">${mode.costUSD}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Part 4: Workflow Summary (Per Trip Search)

```
User enters origin + destination
    ↓
Places Autocomplete resolves to lat/lon
    ↓
/api/score called
    ├─ Google Directions (DRIVING) → distanceMiles, driveMinutes (cache this)
    ├─ getNearestStops(originLat, originLon) → 2–4 closest transit stops
    ├─ getNearestStops(destLat, destLon) → 2–4 closest transit stops
    ├─ findConnectingStops() → which routes connect origin → dest
    ├─ getNextDeparture() → for each origin stop, next bus time
    └─ Build ModeResult array (car, bike, walk, bus1, bus2, ...)
    ↓
Client receives modes sorted by gCO2e
    ↓
User selects a mode
    ↓
GPS Map updates:
    ├─ If car/bike/walk: Google polyline overlay
    └─ If bus: Orange stop markers at origin + dest from GTFS data
    ↓
Card shows: "UTS Bus 3 - Departs in 12 min at 10:45 AM"
    ↓
User taps "Log this trip" → POST /api/log-trip → streak updates
```

---

## Part 5: Implementation Checklist

- [ ] **GTFS Files**
  - [ ] Move `.zip` files from root to `data/gtfs-raw/`
  - [ ] Update `.gitignore`
  - [ ] Update `scripts/parse-gtfs.js` to unzip and parse all three feeds
  - [ ] Run `npm run parse-gtfs` to generate `data/gtfs-parsed/*.json`

- [ ] **Backend (API)**
  - [ ] Create `lib/gtfs.ts` with haversine, nearest-stops, next-departure logic
  - [ ] Update `types/index.ts` with `transitStops` and `minutesUntilDeparture` fields
  - [ ] Update `app/api/score/route.ts` to compute transit options
  - [ ] Add `getNextDeparture()` calls to score endpoint

- [ ] **Frontend (Map + Cards)**
  - [ ] Update `components/MapSelector.tsx` to render transit stop markers
  - [ ] Update `components/ModeCard.tsx` to display departure time
  - [ ] Add marker icons to `public/icons/` (pin-blue.png, pin-green.png, pin-orange.png)

- [ ] **Testing**
  - [ ] Test with 3 demo trips (same as pilot)
  - [ ] Verify: card shows "Departs in X min at HH:MM"
  - [ ] Verify: map renders orange stop markers correctly
  - [ ] Verify: no departures on weekends/off-service days

---

## Notes on Edge Cases

1. **No transit available**: If no connecting routes found, don't show a bus card, just car/bike/walk.
2. **Time past midnight**: Handle "25:15" format from GTFS (1:15 AM next day).
3. **Service calendar**: Filter departures by day of week; skip days with no service.
4. **Cached distances**: Cache Google Directions calls keyed by `"lat1,lon1|lat2,lon2|mode"` to avoid quota overflow.
5. **Fallback text**: If GTFS data is stale, show "Check schedule" instead of crash.
