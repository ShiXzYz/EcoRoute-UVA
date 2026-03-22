# EcoRoute-UVA — AI Coding Context Document

> Paste this file into Cursor's Project Rules, GitHub Copilot instructions, or any AI tool's system/context prompt. It gives the model full awareness of the product, stack, data sources, and constraints without re-explanation.

---

## What this product is

**EcoRoute-UVA** is a mobile-first web app for UVA students, health workers, and faculty that makes the greenest commute option the default choice. Users enter an origin and destination on the GPS page; the app displays a map with all available transport mode options ranked by gCO₂e, with the lowest-carbon option pre-selected (behavioral default nudge). A streak system rewards consecutive days of green choices. The stats page surfaces impact metrics: CO₂ saved from worst-case (driving) converted to tree equivalents, gas cost savings, transit/micromobility usage counts, and progress toward UVA's 2030 Scope 3 carbon-neutrality goal.

**Status:** Active development.  
**Architecture approach:** GTFS-based transit routing with no runtime API calls for buses.

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Team's strongest stack, Vercel deploy in 3 min |
| Styling | Tailwind CSS | Fast, no design system to build |
| Backend | Next.js API routes (`/app/api/`) | No separate server |
| Database | Supabase (hosted Postgres) | No local setup, free tier, `supabase-js` client |
| Transit data | UVA + CAT GTFS static feeds (pre-downloaded) | No auth, no rate limit, always works |
| Map & Routing | Google Maps API | Directions API (driving, biking, walking miles/times/polylines), Places Autocomplete (origin/destination search) |
| Weather | OpenWeatherMap current conditions | Simple, free tier sufficient |
| Deployment | Vercel | Auto-deploys from GitHub push |

**Do not suggest:** Express as a separate server, MongoDB, Prisma (too slow to set up), Docker, Redis, OAuth/auth system, or Claude/AI text generation for nudge mechanics. Anonymous sessions via `localStorage` UUID only. Focus on Google Maps for routing and direct impact visualization.

---

## Repository structure & Page Architecture

### Navigation: GPS & Stats pages with tab-based switching

EcoRoute-UVA uses a **two-page structure** with a bottom tab bar:
- **GPS Page (primary):** Map with origin/destination search, transport options, mode selection
- **Stats Page (secondary):** Impact metrics, progress tracking, no scrolling required
- **Tab indicator:** GPS page has a map marker icon on the tab to distinguish it from stats

```
EcoRoute/
├── app/
│   ├── page.tsx                  # Main GPS page (map + search + mode cards)
│   ├── stats/
│   │   └── page.tsx              # Stats page (metrics + impact display)
│   ├── api/
│   │   ├── score/route.ts        # Main scoring endpoint
│   │   ├── log-trip/route.ts     # Supabase trip logger
│   │   └── directions/route.ts   # Google Maps Directions API proxy
│   └── layout.tsx                # Root layout, PWA metadata, bottom nav
├── components/
│   ├── MapSelector.tsx           # Leaflet map or Google Maps base layer
│   ├── SearchBar.tsx             # Google Places Autocomplete (FROM/TO inputs)
│   ├── ModeCard.tsx              # Single transport option card
│   ├── ModeCards.tsx             # Container for mode card list
│   ├── SlideUpPanel.tsx          # Pullable panel showing mode options at bottom
│   ├── StreakDisplay.tsx         # Streak counter + Green Hoo badge
│   ├── UVAProgress.tsx           # 2030 goal progress bar
│   ├── BottomNav.tsx             # Tab switching between GPS and Stats pages
│   └── StatCard.tsx              # Individual metric + icon card (Stats page)
├── lib/
│   ├── carbon.ts                 # Emission factor table + scoreMode() function
│   ├── gtfs.ts                   # GTFS JSON loader + nearest-stop finder
│   ├── supabase.ts               # Supabase client singleton
│   ├── weather.ts                # OpenWeatherMap wrapper + bike penalty logic
│   ├── google-maps.ts            # Google Maps API client & routing utilities
│   └── impact-calculator.ts      # Tree equivalency, gas savings, stats math
├── data/
│   ├── uva-gtfs.json             # Pre-parsed UVA GTFS (stops, routes, stop_times)
│   └── cat-gtfs.json             # Pre-parsed CAT GTFS
├── types/
│   └── index.ts                  # Shared TypeScript interfaces
├── public/
│   ├── manifest.json             # PWA manifest (theme: #232D4B UVA navy)
│   └── icons/                    # 192px + 512px app icons
└── .env.local                    # GOOGLE_MAPS_KEY, OPENWEATHER_KEY, SUPABASE_URL, etc.
```

---

## Carbon math & impact calculations — exact implementation

All hardcoded values live in `lib/carbon.ts` and `lib/impact-calculator.ts`.

### Emission factors (g CO₂e per mile)

```typescript
// lib/carbon.ts

export const EMISSION_FACTORS: Record<string, number> = {
  solo_car:      400,   // g CO2e per mile — EPA 2023 avg passenger vehicle
  uts_bus:        44,   // EPA transit bus / avg 45% load factor
  cat_bus:        44,   // Same — both diesel fleets
  connect_bus:    44,   // Regional coach, same baseline
  ebike:          65,   // most comes from VEO operation (charging, collection logistics)
  escooter:       70,   // most comes from VEO operation (charging, collection logistics)
  bike:            0,
  walk:            0,
}

export interface ModeResult {
  mode: string
  label: string          // Human-readable: "UTS Bus (free)"
  gCO2e: number
  timeMin: number
  costUSD: number
  recommended: boolean   // true only on lowest gCO2e result
  color: string          // Color code for visualization
  icon: string           // Icon name for UI
  bikeWarning?: boolean  // true if rain > 40% or wind > 15 mph
  polyline?: string      // Google Maps polyline for route visualization (from Directions API)
}
```

### Impact calculation constants & tree equivalency

```typescript
// lib/impact-calculator.ts

export const IMPACT_CONSTANTS = {
  KG_CO2_PER_TREE_PER_YEAR: 60,  // EPA estimate for urban tree CO₂ absorption
  WEEKS_PER_YEAR: 52,
  GAS_PRICE_PER_GALLON: 3.5,      // USD; used for cost savings
  AVG_CAR_MPG: 28,                 // EPA typical passeng vehicle
  BASELINE_MODE: 'solo_car',       // Reference mode for "saved vs worst case"
};

/**
 * Convert weekly CO2 savings to annual tree equivalents
 * Trees/year = (weekly_kgCO2 * 52 weeks) / 60 kg/tree/year
 */
export function weeklyToAnnualTrees(weeklyKgCO2: number): number {
  const annualKgCO2 = weeklyKgCO2 * IMPACT_CONSTANTS.WEEKS_PER_YEAR;
  return annualKgCO2 / IMPACT_CONSTANTS.KG_CO2_PER_TREE_PER_YEAR;
}

/**
 * Calculate gas savings in USD based on avoided solo_car trips
 * Assumes EPA avg 28 mpg and $3.5/gallon
 */
export function gasSavingsUSD(carMilesSaved: number): number {
  const gallonsAvoided = carMilesSaved / IMPACT_CONSTANTS.AVG_CAR_MPG;
  return gallonsAvoided * IMPACT_CONSTANTS.GAS_PRICE_PER_GALLON;
}

/**
 * Calculate CO2 savings vs worst-case (driving solo everywhere)
 * Used for stats page top metric
 */
export function co2SavedVsBaseline(tripsModeStats: TripModeStats[]): number {
  // Sum: (solo_car gCO2e - chosen_mode gCO2e) for each trip
  return tripsModeStats.reduce((total, trip) => {
    const baselineEmissions = trip.distance_miles * EMISSION_FACTORS.solo_car;
    const actualEmissions = trip.g_co2e;
    return total + (baselineEmissions - actualEmissions);
  }, 0);
}
```

### Scoring function

```typescript
export function scoreMode(
  mode: keyof typeof EMISSION_FACTORS,
  distanceMiles: number,
  timeMin: number,
  costUSD: number,
  polyline?: string,
  weather?: { rainProb: number; windMph: number }
): Omit<ModeResult, 'recommended' | 'label' | 'color' | 'icon'> {
  const gCO2e = Math.round(distanceMiles * EMISSION_FACTORS[mode])
  const bikeWarning =
    (mode === 'bike' || mode === 'ebike' || mode === 'escooter') &&
    weather != null &&
    (weather.rainProb > 40 || weather.windMph > 15)
  return { mode, gCO2e, timeMin, costUSD, bikeWarning, polyline }
}

---

## API route specifications

### `POST /api/score`

**Request body:**
```json
{
  "origin": "38.0293,-78.4767",
  "destination": "Alderman Library, UVA"
}
```

**Response** (array sorted by gCO2e ascending, first item has `recommended: true`):
```json
[
  {
    "mode": "uts_bus",
    "label": "UTS Bus (free)",
    "gCO2e": 89,
    "timeMin": 22,
    "costUSD": 0,
    "color": "green-600",
    "icon": "bus",
    "recommended": true,
    "polyline": "encoded polyline from Google Directions API"
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
    "bikeWarning": false,
    "polyline": "encoded polyline from Google Directions API"
  }
]
```

**Internal logic:**
1. Call Google Maps Directions API **three times** for transport modes:
   - `mode=DRIVING` → solo_car distance/duration, polyline
   - `mode=BICYCLING` → bike distance/duration, polyline
   - `mode=WALKING` → walk distance/duration, polyline (only if < 1.5 miles)
2. Cache direction calls in module-level `Map<string, {miles, mins, polyline}>` keyed by `"origin|destination|mode"`.
3. Call `lib/weather.ts` for current Charlottesville conditions (cached 30 min).
4. Call `lib/gtfs.ts` to find nearest UTS and CAT stops within 400m of origin, estimate walk time to stop.
5. For transit modes: calculate time as walk_time + average_wait_time + bus_travel_time; no dedicated polyline (use stop markers from GTFS).
6. Call `scoreMode()` for each applicable mode.
7. Sort by `gCO2e`, set `recommended: true` on index 0.
8. Return array with color and icon codes assigned.

---

### `POST /api/directions`

Proxy for Google Maps Directions API. Called by frontend to get polylines & alternate routes if needed.

**Request:**
```json
{
  "origin": "38.0293,-78.4767",
  "destination": "Alderman Library, UVA",
  "mode": "DRIVING" // "DRIVING" | "BICYCLING" | "WALKING"
}
```

**Response:**
```json
{
  "distance_miles": 2.3,
  "duration_minutes": 8,
  "polyline": "encoded polyline string",
  "legs": []  // Full Google Directions response if needed for advanced features
}
```

---

### `POST /api/log-trip`

Upsert a completed trip into Supabase and return streak/stats.

```typescript
body: { 
  sessionId: string, 
  mode: string, 
  gCO2e: number, 
  distance_miles: number,
  time_min: number
}

// Returns:
{ 
  streak: number, 
  total_g_saved: number,
  weekly_g_saved: number,
  total_trips_green: number,
  badgeUnlocked: boolean  // true when streak hits 7
}
```

---

## Supabase schema

```sql
-- Trips table: every completed trip
create table trips (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  mode text not null,
  g_co2e integer not null,
  distance_miles numeric(5,2) not null,
  time_min integer,
  logged_at timestamptz default now(),
  index idx_session_logged (session_id, logged_at)
);

-- Streaks table: persistent tracking per session
create table streaks (
  session_id text primary key,
  current_streak integer default 0,
  last_green_date date,
  total_g_saved integer default 0,
  total_trips_green integer default 0,
  updated_at timestamptz default now()
);
```

**Green modes for streak counting:** `uts_bus`, `cat_bus`, `connect_bus`, `bike`, `ebike`, `walk`, `escooter`.

---

## GTFS integration

**GTFS feeds loaded from local JSON files** (parsed from ZIPs, no runtime API calls):

- UVA GTFS: 217 stops, 16 routes
- CAT GTFS: 366 stops, 12 routes
- JAUNT/CONNECT: 39 stops, 9 routes

**Parse script (`scripts/parse-gtfs.js`) produces** `data/gtfs-parsed/*.json` with shape:
```json
{
  "stops": [{ "id": "TL-57", "name": "Alderman & Rue", "lat": 38.035, "lon": -78.508 }],
  "routes": [{ "id": "TL-57", "short_name": "Gold Line", "long_name": "Gold Line" }],
  "departures": { "TL-57": { "monday": ["07:15", "07:45", "08:15"] } },
  "shapes": { "shape_1": [{ "lat": 38.035, "lng": -78.508, "seq": 1 }] },
  "route_shape_ids": { "TL-57": "shape_1" }
}
```

**`lib/gtfs.ts` key functions:**
```typescript
getNearestStops(lat, lon, radiusMeters) // Find stops within radius
getNextDeparture(stopId, feed) // Get next departure time
findConnectingStops(originStops, destStops, feed) // Find routes serving both
getShapePoints(feed, shapeId) // Get polyline points for route
getRouteName(feed, routeId) // Get friendly route name from routes.json
```

**Route names** defined in `data/routes.json`:
- UVA: Gold Line, Green Line, Orange Loop, Purple Line, Silver Line
- CAT: Route numbers with full destination names
- CONNECT: Crozet, Buckingham, Lovingston, Route 29 North

**Fallback:** If GTFS lookup fails, return `nextDeparture: null` with "Check Schedule" badge. Never crash — always return a result.

---

## UI Flow & Page Design

### GPS Page (Primary)

The main interaction surface for trip planning. Users search for origin and destination, see transport options on a map, select a mode, and log their trip.

**Layout (top to bottom):**
1. **Search bars** (Google Places Autocomplete)
   - FROM input: autofill suggestions for recent origins
   - TO input: autofill suggestions, university location quick-search
   - Both use Google Maps Places API for address validation & lat/lon lookup

2. **Map display** (center of screen)
   - Base layer: Google Maps or Leaflet with street view
   - Origin marker: point A
   - Destination marker: point B
   - Route visualization:
     - For car, bike, walk: Google Maps polyline overlay (from Directions API response)
     - For transit (bus): stop markers from GTFS data at origin stop and destination stop (no polyline, just markers)
   - User can pan/zoom to explore alternative routes

3. **Pullable bottom panel** (SlideUpPanel)
   - Shows ranked transport options as cards (sorted by gCO2e)
   - Each card displays:
     - Mode name & icon
     - kg CO₂e (color-coded: green < 100g, amber 100–500g, red > 500g)
     - Travel time in minutes
     - Cost in USD (0 for transit, bike, walk; $1–$3 for micromobility)
     - "Recommended" badge on lowest-carbon option
   - **No impact messaging on cards** (impact reserved for stats page)
   - Tap a card → map updates with that mode's polyline/markers, button to "Log this trip" appears
   - Sliding the panel up reveals more cards; down collapses to minimal view

4. **Log trip button**
   - After selecting a mode: "I took this route today →"
   - Triggers POST /api/log-trip
   - Returns to map view; shows brief "✓ Trip logged" toast
   - Streak counter updates in real-time

5. **Bottom navigation bar**
   - Two tabs: "GPS" (map marker icon) | "Stats"
   - GPS tab is active by default
   - Tap Stats tab to navigate to `/stats` page

---

### Stats Page (Secondary)

No scrolling. Simple sectioned stat display with key metric + icon/graphic to the right.

**Layout (top to bottom):**

1. **Section: CO₂ Impact**
   - Metric: "X kg CO₂ saved this week" (vs worst-case solo driving for each trip distance)
   - Graphic: Tree icon with count "≈ X trees grown this year at this rate"
   - Formula: `(weekly_kgCO2 × 52) ÷ 60 = annual_tree_equivalents`
   - Example: "2.4 kg saved this week ≈ 2.1 trees grown per year"

2. **Section: Gas Cost Savings**
   - Metric: "$X saved on gas costs"
   - Graphic: Gas pump icon with dollar amount
   - Formula: `car_miles_avoided ÷ 28 mpg × $3.5/gal`

3. **Section: Transit Usage**
   - Metric: "12 bus rides | 3 ebike trips | 1 escooter"
   - Graphic: Mode icons with counts (this week)

4. **Section: 2030 Progress**
   - Metric: Progress bar toward UVA's 2030 Scope 3 carbon goal
   - Show: "Your trips are equivalent to **0.8%** of UVA's annual Scope 3 target" (based on community tracker)
   - Graphic: Filled progress bar + percentage label

5. **Bottom navigation bar**
   - Same as GPS page: "GPS | Stats" tabs with Stats active

---

## Behavioral design mechanics — implementation notes

### 1. Default nudge
- The API always returns results sorted by `gCO2e` ascending.
- The first result has `recommended: true`.
- On the GPS page, the recommended mode displays a green border + "recommended" badge.
- **Visual feedback is primary.** The map updates immediately when a mode is selected; the user sees the route before committing.

### 2. Real-time route visualization
- Selecting a mode updates the map instantly with the polyline (or stop markers for transit).
- For car/bike/walk: Google Directions API polyline displayed directly.
- For bus/transit: GTFS stop markers shown (origin stop → destination stop).
- This provides **direct impact visibility** — users see the path they'll take, not abstract CO₂ numbers.

### 3. Streak habit tracking
- Streak counter displayed in GPS page (top or bottom, settable per design)
- Day 7 triggers `badgeUnlocked: true` → render "Green Hoo" badge in UVA navy (#232D4B)
- Log trip button text: "I took this route today →" (first person, present tense — stronger behavioral commitment than "Log trip")

### 4. Impact metrics on separate page
- GPS page focuses on choice (route visualization + CO₂ comparison)
- Stats page surfaces impact accumulation (trees saved, cost savings, progress to 2030 goal)
- This separation prevents decision paralysis on the main page

---

## Persona routing logic (optional refinement for future)

If persona selection is added later:

```typescript
if (persona === 'student') {
  // Surface UTS OnDemand note on bus card for trips after 9pm
  // Default destination hint: "Shannon Library, Charlottesville, VA"
}

if (persona === 'health') {
  // Prioritize CAT Route 7 and UVA Health shuttle if "Health" or "Hospital" in destination
  // Default destination hint: "UVA Health Main, Charlottesville, VA"
}

if (persona === 'faculty') {
  // Add annualSavings string to solo_car result
  // Default destination hint: "McCormick Road Parking, UVA"
}
```

Currently, **persona is not required** for MVP. Focus on core route selection & impact tracking.

---

## UVA 2030 framing — use these exact facts in UI copy

- UVA's goal: carbon neutrality by 2030, including Scope 3 commuting emissions
- Current state: no behavior-change tool exists for commuter carbon decisions
- UVA transit: UTS is fare-free for students, faculty, and staff
- CONNECT and Afton Express: free for UVA affiliates, serves Crozet, Staunton, Waynesboro
- CAT: Charlottesville Area Transit, public bus, integrates with UVA routes

**UI copy guidelines:**
- Say "Scope 3 emissions" not "indirect emissions" — judges know the term
- Say "UVA 2030 Climate Action Plan" not "UVA's environmental goals"
- Say "gCO₂e" not "carbon" in data displays (correct unit)
- Avoid: "eco-friendly," "green living," "save the planet" — institutional judges respond to precision, not slogans

---

## Transport modes reference table

| Mode key | Label | Free for UVA? | Notes |
|---|---|---|---|
| `uts_bus` | UVA Transit | Yes | Gold Line, Green Line, etc. (friendly names from routes.json) |
| `cat_bus` | CAT Transit | Yes | Charlottesville public bus, route numbers |
| `connect_bus` | CONNECT | Yes (UVA affiliates) | Regional: Crozet, Rte 29 N, Lovingston |
| `bike` | Bike | Yes | Zero emissions |
| `walk` | Walk | Yes | Zero emissions |
| `ebike` | E-Bike (VEO) | $1 unlock, $0.39/mile | VEO service |
| `escooter` | E-Scooter (VEO) | $1 unlock, $0.39/mile | VEO service |
| `solo_car` | Drive solo | No | Always worst CO₂ — baseline for savings |

---

## Environment variables

```bash
# .env.local
GOOGLE_MAPS_API_KEY=            # Directions API + Places Autocomplete enabled
OPENWEATHER_API_KEY=            # Current weather by lat/lon
NEXT_PUBLIC_SUPABASE_URL=       # From Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # From Supabase project settings
```

---

## PWA manifest

```json
{
  "name": "EcoRoute",
  "short_name": "EcoRoute",
  "description": "The greener commute, made obvious",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#232D4B",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Critical constraints — always respect these

1. **No separate backend server.** Everything in Next.js API routes. One repo, one Vercel deploy.
2. **No auth/login.** Anonymous sessions via `localStorage` UUID. No OAuth, no NextAuth.
3. **No database fallback delays.** Supabase only. If Supabase is unreachable, fall back to `localStorage` for streak data — never crash.
4. **Cache Google Maps calls.** Module-level `Map<string, result>` keyed by `"origin|destination|mode"`. Never call Directions API twice for the same origin/destination/mode in a session.
5. **Always return a result.** Every API route must return a valid response even if external APIs fail. Use fallback values: `polyline: null`, `bikeWarning: false`, etc.
6. **GTFS data is pre-downloaded.** Never fetch GTFS ZIPs at runtime. They live in `/data/` and are loaded synchronously at startup.
7. **CO₂ numbers always visible.** GPS page modes always show their gCO2e count — even the worst option. Stats page shows accumulated impact, never partial or hidden metrics.
8. **Streak green modes only:** `uts_bus`, `cat_bus`, `connect_bus`, `bike`, `walk`, `ebike`, `escooter`. Solo car does not count.
9. **Map is always functional.** Don't depend on Google Maps API being instant; show a skeleton loader while polylines load. Revert to generic map view with markers if API is slow.
10. **No Claude API or AI text generation.** Impact is communicated through direct visualization (routes on map, numbers in stats). No streaming equivalence copy.

---

## Known risk mitigations

| Risk | Mitigation |
|---|---|
| Google Maps Directions API quota | Module-level cache keyed by origin\|destination\|mode; prime with 3 demo trips before judging |
| Supabase connectivity | Fall back to `localStorage` for streak; streak still works, just not cross-device |
| GTFS no match for address | Return empty transit array; still show bike, walk, car options |
| Google Places Autocomplete latency | Debounce input (300ms); show skeleton suggestions while loading |
| Polyline rendering delay | Show map marker pins immediately; polyline appears when ready; no lag on selection |
| Browser cache stale data | Load fresh polylines on each origin/destination change; don't rely on old cached routes |
| Transit stop markers out of date | GTFS data refreshes weekly; document date in code comments |

---

## Demo script — Testing transit modes

**Transit routes appear when origin/destination are within ~1 mile of bus stops.**

- **Test UVA Transit:** Search near campus bus stops
- **Test CAT Transit:** Search near Emmet Street corridor
- **Test CONNECT:** Search toward Crozet or Route 29 North area

Expected: Mode cards show friendly route names (Gold Line, Green Line, etc.) with departure times. Map shows colored polyline clipped to the relevant bus route segment.

---

## Pitch structure (90 seconds)

1. **Problem (15s):** "UVA has a 2030 Scope 3 carbon neutrality goal and no tool to change commuter behavior at the decision moment."
2. **Solution (15s):** "EcoRoute puts the route on a map. Users see the exact path they'll take for each transport mode, ranked by carbon cost. The greenest is recommended by default."
3. **Demo (45s):** Run the 3 scripted trips. Show GPS → Stats flow. Let a judge enter their own address.
4. **Impact (15s):** "This bridges the gap between UVA's institutional goal and individual behavior. Every trip is logged, impact accumulates visually, and the map makes sustainability feel concrete—not abstract."

---

*Updated during UVA Sustainable IT Hackathon. Stack: Next.js 14 · TypeScript · Tailwind · Supabase · Google Maps Directions API + Places Autocomplete · OpenWeatherMap · Vercel. Backend/frontend integration in progress; all core APIs in design/setup phase.*
