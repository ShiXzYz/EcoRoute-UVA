# EcoRoute API Documentation

**Base URL:** `http://localhost:3000/api` (dev) or `https://ecoroute.vercel.app/api` (production)

---

## Core Endpoints

### `POST /api/score`

Calculate and rank all transportation modes for a trip from origin to destination.

**Request:**
```json
{
  "originLat": 38.0293,
  "originLon": -78.4767,
  "destinationLat": 38.0336,
  "destinationLon": -78.5080,
  "distance_miles": 2.1,
  "polyline": "encoded polyline from Google Directions API"
}
```

**Parameters:**
- `originLat` (number, required) — Latitude of starting point
- `originLon` (number, required) — Longitude of starting point
- `destinationLat` (number, required) — Latitude of destination
- `destinationLon` (number, required) — Longitude of destination
- `distance_miles` (number, required) — Trip distance from Google Directions API (call client-side first)
- `polyline` (string, optional) — Google Maps encoded polyline for non-transit modes

**Response:** Array of modes sorted by gCO₂e (lowest first). First item has `recommended: true`.

```json
{
  "origin_lat": 38.0293,
  "origin_lon": -78.4767,
  "destination_lat": 38.0336,
  "destination_lon": -78.5080,
  "distance_miles": 2.1,
  "modes": [
    {
      "mode": "uts_bus",
      "label": "UTS Bus — Departs in 12 min (10:45)",
      "gCO2e": 89,
      "timeMin": 22,
      "costUSD": 0,
      "color": "green-600",
      "icon": "bus",
      "recommended": true,
      "transitStops": {
        "origin": { "id": "UVA-001", "lat": 38.0293, "lon": -78.4767 },
        "destination": { "id": "UVA-002", "lat": 38.0336, "lon": -78.5080 }
      },
      "nextDepartureTime": "10:45",
      "minutesUntilDeparture": 12
    },
    {
      "mode": "bike",
      "label": "Bike",
      "gCO2e": 190,
      "timeMin": 24,
      "costUSD": 0,
      "color": "amber-500",
      "icon": "bike",
      "recommended": false,
      "polyline": "encoded polyline from Google Directions API"
    },
    {
      "mode": "solo_car",
      "label": "Drive solo",
      "gCO2e": 920,
      "timeMin": 8,
      "costUSD": 1.50,
      "color": "red-500",
      "icon": "car",
      "recommended": false,
      "polyline": "encoded polyline from Google Directions API"
    }
  ]
}
```

**Response Fields** (per mode in `modes` array):
- `mode` (string) — Transportation mode key: solo_car, uts_bus, cat_bus, connect_bus, ebike, escooter, bike, walk
- `label` (string) — Human-readable mode name with optional timing ("UTS Bus — Departs in 5 min")
- `gCO2e` (number) — Carbon emissions in grams for this trip
- `timeMin` (number) — Estimated trip duration in minutes
- `costUSD` (number) — Estimated user cost (0 for transit/bike/walk)
- `color` (string) — Tailwind color class (green-600 <100g, amber-500 100-500g, red-500 >500g)
- `icon` (string) — Icon identifier for UI
- `recommended` (boolean) — True only on lowest-carbon option (behavioral nudge)
- `polyline` (string, optional) — Google Maps encoded polyline (for car, bike, walk modes only)
- `transitStops` (object, optional) — Origin/destination stop markers from GTFS (transit modes only)
  - `origin`: { id, lat, lon }
  - `destination`: { id, lat, lon }
- `nextDepartureTime` (string, optional) — "HH:MM" format of next bus departure
- `minutesUntilDeparture` (number, optional) — Minutes until next departure

**Errors:**
- `400` — Missing or invalid lat/lon/distance parameters
- `500` — Internal server error

**Notes:**
- GTFS data is pre-parsed on server startup (from `/data/gtfs-parsed/*.json`)
- No external API calls from this endpoint (all hardcoded EPA 2023 emission factors)
- Transit stop markers are within 400m radius of origin/destination coordinates
- Multiple transit modes returned if routes serve both locations

---

### `POST /api/directions`

Proxy for Google Maps Directions API. Call this for detailed routing info, alternative routes, or to refresh polylines.

**Request:**
```json
{
  "origin": "38.0293,-78.4767",
  "destination": "38.0336,-78.5080",
  "mode": "DRIVING"
}
```

**Parameters:**
- `origin`, `destination` (string, required) — Lat,lon format
- `mode` (enum, required) — `"DRIVING"` | `"BICYCLING"` | `"WALKING"`

**Response:**
```json
{
  "distance_miles": 2.3,
  "duration_minutes": 8,
  "polyline": "encoded polyline string",
  "legs": []
}
```

**Errors:**
- `400` — Invalid parameters
- `429` — Google Maps quota exceeded (implement exponential backoff)
- `500` — Server error

---

### `POST /api/log-trip`

Log a completed trip to Supabase. Returns updated streak and accumulated stats.

**Request:**
```json
{
  "sessionId": "user-uuid-from-localStorage",
  "mode": "uts_bus",
  "gCO2e": 89,
  "distance_miles": 2.3,
  "time_min": 22
}
```

**Parameters:**
- `sessionId` (string, required) — Unique session identifier (stored in `localStorage`)
- `mode` (string, required) — Transportation mode used
- `gCO2e` (number, required) — Carbon emitted (from `/api/score`)
- `distance_miles` (number, required) — Trip distance
- `time_min` (number, required) — Trip duration

**Response:**
```json
{
  "streak": 7,
  "total_g_saved": 3400,
  "weekly_g_saved": 580,
  "total_trips_green": 22,
  "badgeUnlocked": true
}
```

**Response Fields:**
- `streak` (number) — Current consecutive days of green trips
- `total_g_saved` (number) — Cumulative CO₂ saved vs solo driving baseline
- `weekly_g_saved` (number) — CO₂ saved this calendar week
- `total_trips_green` (number) — Total count of non-car trips
- `badgeUnlocked` (boolean) — True when streak reaches 7 (triggers "Green Hoo" badge)

**Logic:**
- Only increments streak if mode is in `['uts_bus', 'cat_bus', 'connect_bus', 'bike', 'ebike', 'walk', 'escooter']`
- Solo car does not count toward streak
- Streak resets if no green trip logged the next day
- `total_g_saved` = sum of `(distance_miles × 400 - gCO2e)` for all trips (vs solo_car baseline)

**Errors:**
- `400` — Missing required fields
- `500` — Database error (falls back to `localStorage`)

---

## Emission Factors (EPA 2023)

All hardcoded in `lib/carbon.ts`. Do not fetch from external sources.

| Mode | g CO₂e/mile | Notes |
|------|-----------|-------|
| `solo_car` | 400 | Average passenger vehicle |
| `uts_bus` | 44 | Transit bus, 45% avg load |
| `cat_bus` | 44 | Charlottesville Area Transit |
| `connect_bus` | 44 | Regional coach |
| `ebike` | 65 | VEO operations |
| `escooter` | 70 | VEO operations |
| `bike` | 0 | Zero operational emissions |
| `walk` | 0 | Zero operational emissions |

---

## Mode Codes

| Code | Label | Free for UVA? | Notes |
|------|-------|---|---|
| `uts_bus` | UTS Bus | ✅ Yes | On-grounds transit |
| `cat_bus` | CAT Transit | ✅ Yes | Charlottesville public |
| `connect_bus` | CONNECT Bus | ✅ UVA affiliates | Regional: Crozet, Staunton |
| `ebike` | E-Bike (VEO) | ❌ $1 unlock, $0.39/mi | Micromobility |
| `escooter` | E-Scooter (VEO) | ❌ $1 unlock, $0.39/mi | Micromobility |
| `bike` | Bike | ✅ Yes | Weather-dependent |
| `walk` | Walk | ✅ Yes | Only if <1.5 mi |
| `solo_car` | Drive solo | ❌ No | Baseline (always worst) |

---

## Impact Calculation (Stats Page)

### Tree Equivalency
**Formula:** (weekly_kgCO2 × 52 weeks) ÷ 60 kg/tree/year = annual_tree_equivalents

EPA estimate: one urban tree absorbs ~60 kg CO₂/year

**Example:** User saved 0.6 kg CO₂ this week
- Annual projection: 0.6 × 52 = 31.2 kg CO₂/year
- Tree equivalents: 31.2 ÷ 60 = **0.52 trees grown per year**

### Gas Savings
**Formula:** (car_miles_avoided ÷ 28 mpg) × $3.5/gal = USD saved

Baseline: $3.5/gallon, 28 mpg average vehicle

### Progress to 2030 Goal
Based on community aggregation: your trips / UVA's annual Scope 3 target = % toward 2030 carbon neutrality

---

## Environment Variables

```bash
# Required
GOOGLE_MAPS_API_KEY=          # Directions API + Places Autocomplete
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anonymous key

# Optional
OPENWEATHER_API_KEY=          # Weather endpoint (cached 30 min)
```

---

## Rate Limits & Caching

- **Google Maps Directions:** Cache by `origin|destination|mode` (module-level `Map`)
- **Weather:** Cache 30 minutes
- **GTFS data:** Pre-loaded at server startup from JSON files (no runtime fetches)
- **Supabase:** No explicit limit; connection pooling via `@supabase/supabase-js`

---

## Error Handling

All endpoints **always return a valid response**. Fallback behavior:

| Failure | Fallback |
|---------|----------|
| Google Maps unreachable | Return cached result or best-guess distance |
| Supabase unavailable | Fall back to `localStorage` for streak data |
| GTFS feed missing | Don't show transit option; keep car/bike/walk |
| Weather API slow | Show "no warnings" (assume no rain/wind) |

---

## Testing with cURL

### Get emission rankings for a trip
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"origin": "38.0245,-78.5018", "destination": "38.0336,-78.5080"}'
```

### Log a completed trip
```bash
curl -X POST http://localhost:3000/api/log-trip \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user-123",
    "mode": "uts_bus",
    "gCO2e": 89,
    "distance_miles": 2.3,
    "time_min": 22
  }'
```

### Get directions for a specific mode
```bash
curl -X POST http://localhost:3000/api/directions \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "38.0245,-78.5018",
    "destination": "38.0336,-78.5080",
    "mode": "BICYCLING"
  }'
```

---

*Last updated: March 2026 during Hackathon. Reflects GPS page + Stats page architecture. No Claude API. Google Maps Directions + GTFS + tree equivalency focus.*

**Response:**
```json
{
  "mode": "bus",
  "distance": 2,
  "passengers": 1,
  "emissions": 0.178,
  "unit": "kg CO2",
  "label": "Bus",
  "color": "#1B998B",
  "description": "bus: 0.18 kg CO2 (2 miles)"
}
```

---

### Compare Transportation Modes
**Endpoint:** `POST /carbon/compare`

Compare all transportation modes for a given distance

**Request Body:**
```json
{
  "distance": 2,
  "passengers": 1
}
```

**Parameters:**
- `distance` (number, required) - Distance in miles
- `passengers` (number, optional) - Number of passengers (default: 1)

**Response:**
```json
{
  "distance": 2,
  "passengers": 1,
  "comparison": {
    "bicycle": {
      "mode": "bicycle",
      "distance": 2,
      "passengers": 1,
      "emissions": 0,
      "unit": "kg CO2",
      "label": "Bicycle",
      "color": "#2A9D8F"
    },
    "bus": {
      "mode": "bus",
      "distance": 2,
      "passengers": 1,
      "emissions": 0.178,
      "unit": "kg CO2",
      "label": "Bus",
      "color": "#1B998B"
    },
    "car": {
      "mode": "car",
      "distance": 2,
      "passengers": 1,
      "emissions": 0.822,
      "unit": "kg CO2",
      "label": "Car (Solo)",
      "color": "#FF6B35"
    }
  },
  "bestChoice": "bicycle",
  "mostEmissions": "car",
  "savings": {
    "busVsCar": 78,
    "description": "Taking the bus instead of driving alone saves 78% emissions"
  }
}
```

---

## System API

### Health Check
**Endpoint:** `GET /health`

Verify the server is running

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-21T17:48:34.881Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Server Error

### Example Error Response
```json
{
  "error": "Failed to fetch routes"
}
```

---

## Rate Limiting

Currently disabled for development. Production deployment should implement:
- 100 requests/minute per IP
- 1000 requests/hour per API key

---

## Examples

### Example 1: Compare 3-mile trip options
```bash
curl -X POST http://localhost:3000/api/carbon/compare \
  -H "Content-Type: application/json" \
  -d '{"distance": 3, "passengers": 1}'
```

### Example 2: Get all routes
```bash
curl http://localhost:3000/api/transit/routes | jq '.'
```

### Example 3: Get real-time bus positions
```bash
curl http://localhost:3000/api/transit/vehicles | jq '.[] | {id, lat, lng, nextStop}'
```

### Example 4: Check weather
```bash
curl http://localhost:3000/api/weather/current | jq '.temperature, .condition'
```

---

## Data Sources

- **Transit**: TransLoc API (real-time) + GTFS (schedules)
- **Weather**: Open-Meteo API (free, no auth)
- **Emissions**: EPA Transportation Factors
- **Map**: OpenStreetMap (via Leaflet.js)

---

## Implementation Notes

### CORS
CORS is enabled for all origins in development. In production, restrict to specific domains.

### Caching
- Routes: Cached for 5 minutes
- Vehicles: Cached for 5 seconds
- Weather: Cached for 30 minutes

### Real-time Updates
Frontend polls vehicles endpoint every 5 seconds to update bus positions.

---

## Future Endpoints (v2)

- `GET /routing/optimal` - Get greenest route between two points
- `POST /user/preferences` - Save user sustainability preferences
- `GET /analytics/impact` - Campus-wide emissions analytics
- `POST /gamification/score` - Track carbon savings points

---

**For more information, see [README.md](README.md)**
