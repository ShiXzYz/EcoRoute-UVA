# 🌱 EcoRoute-UVA — Sustainable Transportation @ UVA

**Map-based behavioral nudge for low-carbon commuting.** See your route. See the carbon cost. Choose green.

---

## 🎯 The Problem

UVA's 2030 Climate Action Plan targets **net-zero Scope 3 (commuting) emissions**, but students, health workers, and faculty have **no real-time tool** that shows them the carbon cost of their transportation choices at the moment of decision.

## ✨ The Solution

**EcoRoute-UVA** embeds three proven behavioral mechanics into a map-native app:

1. **Route Visualization** — Every transport mode (car, bike, bus, walk) is displayed on a live Google Map. Users see the exact path they'll take before committing.

2. **Default Nudge** — The lowest-carbon option is pre-selected (green border). User must actively choose a worse option. ([Thaler & Sunstein, *Nudge*](https://en.wikipedia.org/wiki/Nudge_(book)))

3. **Impact Tracking** — Log a green trip → streak counter increments → day 7 unlocks "Green Hoo" badge. **Stats page** shows cumulative impact: tree equivalents, gas savings, 2030 progress.

Result: Bus gets pre-selected AND user sees the route. Carbon cost and trip time comparison are **always visible**. Habits compound weekly, measured in trees.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+, npm 9+
- Google Maps API key (Directions + Places Autocomplete)
- Optional: Supabase project for persistence

### Installation

```bash
# 1. Clone and navigate
cd EcoRoute-UVA

# 2. Copy environment template
cp .env.example .env.local

# 3. Add your API keys to .env.local
GOOGLE_MAPS_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 4. Install dependencies
npm install

# 5. Parse GTFS feeds (one-time setup)
npm run parse-gtfs

# 6. Run dev server
npm run dev
```

Then open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📱 Features

### GPS Page (Primary)
- 🔍 **Google Places Autocomplete** — Search for origin/destination with smart address suggestions
- 🗺️ **Interactive Map** — Displays origin (blue pin), destination (green pin), bus stops (orange pins)
- 🚗🚴🚌 **Multi-mode Routing** — Google Maps polylines for car, bike, walk; GTFS stop markers for transit
- 📊 **Rankable Mode Cards** — All options sorted by CO₂, lowest pre-selected
- ⏱️ **Next Bus Time** — "Departs in 12 min at 10:45 AM" for transit options
- 📍 **Trip Logger** — "I took this route today" button logs your choice

### Stats Page (Secondary)
- 🌳 **CO₂ to Trees** — "You saved X kg this week ≈ 2.1 trees grown per year"
- 💰 **Gas Cost Savings** — "$12.50 saved on gas this week"
- 🚌🚴 **Mode Breakdown** — "12 bus rides | 3 ebike trips this week"
- 📈 **2030 Progress** — Your trips' % contribution to UVA's carbon neutrality goal
- ✅ **Streak Tracker** — Consecutive days of green choices with "Green Hoo" badge at day 7

---

## 🏗️ Architecture

```
Frontend (Next.js 14 App Router + TypeScript)
├── /app
│   ├── page.tsx              → GPS page (map + search + modes)
│   ├── stats/page.tsx        → Stats page (impact metrics)
│   ├── layout.tsx            → Root layout + bottom tab nav
│   └── api/
│       ├── score/route.ts    → Calculate & rank all modes
│       ├── log-trip/route.ts → Log trip, update streak
│       └── directions/route.ts → Google Maps proxy
├── /components
│   ├── SearchBar.tsx         → Google Places Autocomplete (FROM/TO)
│   ├── MapSelector.tsx       → Google Maps display with markers + polylines
│   ├── ModeCard.tsx          → Individual mode with CO2 + time + cost
│   ├── ModeCards.tsx         → Container for ranked modes
│   ├── SlideUpPanel.tsx      → Pullable bottom panel for mode selection
│   ├── StreakDisplay.tsx     → Streak counter + badge
│   ├── UVAProgress.tsx       → 2030 goal progress bar
│   ├── StatCard.tsx          → Individual stat + icon (Stats page)
│   └── BottomNav.tsx         → GPS | Stats tab switcher
├── /lib
│   ├── carbon.ts             → Emission factors + scoring
│   ├── gtfs.ts               → Haversine + nearest-stops + departures
│   ├── supabase.ts           → DB client
│   ├── google-maps.ts        → Google Maps utilities
│   └── impact-calculator.ts  → Tree math + gas savings + stats
├── /data
│   ├── gtfs-raw/             → Source GIT-IGNORED
│   │   ├── University_Transit_Service_GTFS.zip
│   │   ├── Charlottesvilleareatransit_GTFS.zip
│   │   └── jaunt_connect_charlottesville.zip
│   └── gtfs-parsed/          → Generated JSON (git-tracked)
│       ├── uva-gtfs.json
│       ├── cat-gtfs.json
│       └── jaunt-gtfs.json
└── /public
    ├── manifest.json         → PWA manifest
    └── icons/
        ├── pin-blue.png      → Origin marker
        ├── pin-green.png     → Destination marker
        └── pin-orange.png    → Transit stops
```

---

## 🧮 Emission Factors (EPA 2023)

| Mode | g CO₂e/mile | Notes |
|------|-----------|-------|
| Solo car | 400 | Average passenger vehicle |
| UTS bus | 44 | Transit bus ÷ 45% load factor |
| CAT bus | 44 | Charlottesville Area Transit |
| CONNECT | 44 | Regional coach |
| E-bike | 65 | VEO operations + manufacturing |
| E-scooter | 70 | VEO operations + manufacturing |
| Bike | 0 | Zero operational |
| Walk | 0 | Zero operational |

**All hardcoded in `lib/carbon.ts`.** Do not fetch from external sources.

---

## 💡 Impact Math

### Tree Equivalency (Stats Page)
```
Annual trees = (weekly_kgCO2 × 52 weeks) ÷ 60 kg/tree/year
```
EPA: One urban tree absorbs ~60 kg CO₂/year.

**Example:** User saved 0.6 kg CO₂ this week
- Annual projection: 0.6 × 52 = 31.2 kg
- **Tree equivalents: 0.52 trees grown per year**

### Gas Savings
```
USD saved = (car_miles_avoided ÷ 28 mpg) × $3.5/gallon
```

### Streak Logic
- **Green modes only:** `uts_bus`, `cat_bus`, `connect_bus`, `bike`, `ebike`, `walk`, `escooter`
- Solo car does NOT count
- Resets if no green trip logged the next calendar day
- Day 7 → "Green Hoo" badge unlocked

---

## 📡 API Endpoints

See [API_DOCS.md](API_DOCS.md) for complete reference.

### Main Endpoints
- **`POST /api/score`** — Rank all modes for origin → destination
- **`POST /api/log-trip`** — Log a completed trip, return streak
- **`POST /api/directions`** — Google Maps proxy for polylines

### Key Response
```json
{
  "mode": "uts_bus",
  "label": "UTS Bus (free)",
  "gCO2e": 89,
  "timeMin": 22,
  "costUSD": 0,
  "color": "green-600",
  "icon": "bus",
  "recommended": true,
  "polyline": "encoded_polyline",
  "nextDepartureTime": "10:45",
  "minutesUntilDeparture": 12
}
```

---

## 🚌 How It Works: Per-Trip Flow

```
User: "From Old Dorms to Shannon Library"
    ↓
Places Autocomplete resolves to lat/lon
    ↓
/api/score called:
  1. Google Directions API (DRIVING) → distance, duration, polyline
  2. getNearestStops(origin_lat, origin_lon) → 2-4 UTS/CAT stops within 400m
  3. getNearestStops(dest_lat, dest_lon) → 2-4 stops at destination
  4. findConnectingStops() → which routes link origin → destination?
  5. getNextDeparture() → next bus time for TODAY (service calendar aware)
  6. scoreMode() for each: car, bike, walk, uts_bus, cat_bus, connect_bus
    ↓
Response: Array sorted by gCO2e (lowest first, recommended: true)
    ↓
Client renders:
  - Map: 🔵 origin, 🟢 destination, 🟠 stop markers
  - Cards: "UTS Bus 3 - Departs in 12 min - 89g CO2"
    ↓
User selects mode → Map updates with polyline/stops
    ↓
User taps "I took this route today"
    ↓
POST /api/log-trip:
  - Creates trips table entry
  - Upserts streaks table
  - Returns: streak: 1, total_g_saved: 311, badgeUnlocked: false
    ↓
Stats page updates in real-time (localStorage, then Supabase sync)
```

---

## ⚙️ GTFS Setup (One-time)

UVA Transit, CAT, and JAUNT GTFS feeds are pre-downloaded. To parse them into JSON:

```bash
npm run parse-gtfs
```

This:
1. Reads ZIP files from `data/gtfs-raw/`
2. Extracts `stops.txt`, `routes.txt`, `stop_times.txt`, `calendar.txt`
3. Filters departures by day-of-week using `calendar.txt` (no Sunday service bugs!)
4. Generates `data/gtfs-parsed/{uva,cat,jaunt}-gtfs.json`

**Why this approach?**
- ⚡ No runtime API calls to transit agencies
- 🚀 Instant haversine calculations (find nearest stops in milliseconds)
- 📦 Portable: JSON files checked into git, ~2 MB each
- 🔄 Update weekly: `npm run parse-gtfs && git add data/gtfs-parsed/`

See [data/GTFS_SETUP_GUIDE.md](data/GTFS_SETUP_GUIDE.md) for details.

---

## 🎬 Demo Script (90 seconds)

**Trip 1 — GPS Page:**
- Origin: Old Dorms (~38.0245, -78.5018)
- Destination: Shannon Library (~38.0336, -78.5080)
- Expected: Walking or bike recommended; map shows blue + green pins + route
- **Talking point:** "The exact route you'll take. Every mode visualized. Green pre-selected."

**Trip 2 — Stats Page:**
- After logging 5 demo trips with mixed modes
- Show: "0.45 kg saved this week ≈ 0.39 trees" + gas + mode breakdown + 2030 progress
- **Talking point:** "Impact compounds. Trees make it concrete; nobody plants trees, but seeing trees grown per year? That resonates."

**Trip 3 — Transit Mode:**
- Origin: Pantops (~38.0350, -78.4580)
- Destination: UVA Health Main (~38.0418, -78.4983)
- Expected: UTS Bus or CAT Route 7 with "Departs in 8 min"
- **Talking point:** "Stop markers from GTFS. We don't need live APIs—the schedule is predictable. Safe, cached, always works."

---

## 📋 Checklist for Hackathon

- [ ] `npm run parse-gtfs` generates JSON files successfully
- [ ] `/api/score` returns modes with polylines + transit stops
- [ ] GPS page renders blue/green/orange pins correctly
- [ ] Mode cards show "Departs in X min" for transit
- [ ] "I took this route" logs trip and updates streak
- [ ] Stats page displays tree equivalency math correctly
- [ ] No crashes if APIs fail (fallbacks in place)

---

## 🌍 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Maps | Google Maps API (Directions + Places) |
| Transit | GTFS JSON (pre-parsed) |
| Weather | OpenWeatherMap (optional, 30-min cache) |
| Database | Supabase Postgres (optional; `localStorage` fallback) |
| Deployment | Vercel |

---

## 📖 Documentation

- **[API_DOCS.md](API_DOCS.md)** — Complete API reference
- **[ecoroute-context.md](ecoroute-context.md)** — Full UX/architecture spec
- **[GTFS_IMPLEMENTATION_PLAN.md](GTFS_IMPLEMENTATION_PLAN.md)** — Bus stop marker feature plan
- **[GTFS_HACKATHON_CHECKLIST.md](GTFS_HACKATHON_CHECKLIST.md)** — 3-hour implementation guide
- **[data/GTFS_SETUP_GUIDE.md](data/GTFS_SETUP_GUIDE.md)** — GTFS file organization

---

## 🏆 Project Status

**Status:** UVA Sustainable IT Hackathon (March 2026)  
**Current phase:** Backend/frontend integration. Google Maps and GTFS routing in progress.  
**Team:** 2 developers, 24-hour sprint.

**What's working:**
- ✅ Frontend scaffolding (Next.js 14, Tailwind, TypeScript)
- ✅ GTFS file organization

**What's in progress:**
- 🔨 `/api/score` endpoint (Google Directions + GTFS logic)
- 🔨 GPS page map component with markers
- 🔨 Stats page impact math

**What's next:**
- Mode card time display ("Departs in X min")
- Trip logging endpoint
- Streak tracking UI

---

*EcoRoute-UVA: Map-based nudge for 2030. One route at a time.*

**User enters:**
- Persona: Student / Health Worker / Faculty  
- Origin: "Lambeth Field"
- Destination: "Alderman Library" (pre-filled for student)
- Distance: 2 miles

**App shows:**
- 🚶 Walk: 20 min, **0g CO₂** ← **PRE-SELECTED (green border)**
- 🚴 Bike: 12 min, **0g CO₂**
- 🚌 UTS Bus: 18 min, **88g CO₂**
- 🚗 Drive solo: 8 min, **800g CO₂** (in red)

**Claude nudge appears:**
> "Taking the bus saves 712g CO₂ vs driving solo — like skipping 71 phone charges. Choose well."

**User taps "I took this route"** → Streak increments → Logged to Supabase.

---

## 🔗 API Reference

### POST /api/score
Calculate carbon emissions for all modes.

**Request:**
```json
{
  "origin": "Lambeth Field",
  "destination": "Alderman Library",
  "distance_miles": 2.0,
  "persona": "student",
  "weather": {
    "rain_probability": 10,
    "wind_speed": 8
  }
}
```

**Response:**
```json
{
  "origin": "Lambeth Field",
  "destination": "Alderman Library",
  "distance_miles": 2.0,
  "persona": "student",
  "scores": [
    {
      "mode": "uts_bus",
      "label": "UTS Bus",
      "gCO2e": 88,
      "timeMin": 18,
      "costUSD": 0,
      "recommended": true,
      "icon": "🚌",
      "color": "green"
    },
    {
      "mode": "solo_car",
      "label": "Drive Solo",
      "gCO2e": 800,
      "timeMin": 8,
      "costUSD": 12,
      "recommended": false,
      "icon": "🚗",
      "color": "red"
    }
    // ... more modes
  ],
  "baseline": {
    "solo_car_gco2e": 800
  }
}
```

### POST /api/explain
Stream Claude explanation of CO₂ equivalence.

**Request:**
```json
{
  "mode": "UTS Bus",
  "gCO2e": 88,
  "baseline_gco2e": 800
}
```

**Response** (streaming):
```
Taking the bus saves 712g CO₂ vs driving solo — like skipping 71 phone charges.
```

---

## 🗺️ Persona Routing

Smart defaults based on UVA role:

### Student
- **Default destination:** Alderman Library, UVA
- **Highlighted mode:** UTS Bus (free for UVA students)
- **Note:** "UTS OnDemand available after midnight"

### Health Worker
- **Default destination:** UVA Health Main Hospital
- **Highlighted mode:** CAT Route 7 (direct to Medical Center)
- **Context:** "Medical Center shuttle runs 7am–6pm"

### Faculty / Staff
- **Default destination:** Scott Stadium parking or McCormick Road
- **Highlighted mode:** Carpool option with annual savings projection
- **Message:** "Carpooling 3× per week saves ~$420/yr and 180 kg CO₂/yr"

---

## 📊 Behavioral Mechanics (in code)

### Default Nudge
```tsx
// In ModeCards.tsx
if (index === 0) {
  // First result (lowest CO2) gets pre-selected + green border
  setSelectedMode(scores[0].mode);
}
```

### Real-time Feedback
```tsx
// In ModeCard.tsx
<p className={getEmissionColor(gCO2e, baseline)}>
  {gCO2e.toLocaleString()}g
</p>
<p className="text-xs text-slate-600">
  {getEmissionLabel(gCO2e, baseline)}
</p>
// Color: green (≤20% of solo car), amber (50%), red (>75%)
```

### Claude Nudges
```tsx
// In ModeCards.tsx — POST to /api/explain
const response = await fetch('/api/explain', {
  method: 'POST',
  body: JSON.stringify({
    mode: mode.label,
    gCO2e: mode.gCO2e,
    baseline_gco2e: baseline,
  }),
});

// Stream response word-by-word, update state on each chunk
```

### Streak Tracking
```tsx
// In page.tsx
const handleLogTrip = async (mode, gCO2e) => {
  setStreak(streak + 1);
  // POST to Supabase if DB available; fallback to localStorage
};
```

---

## 🔧 GTFS Integration (Pre-Hackathon Prep)

Before the hackathon starts:

1. **Download GTFS feeds**
   - UVA: Transitland ID `f-university~of~virginia`
   - CAT: https://apps.charlottesville.gov/publicfiles/Charlottesvilleareatransit_gtfs.zip

2. **Parse into JSON**
   ```bash
   node scripts/parse-gtfs.js
   # Outputs: /data/gtfs-combined.json
   ```

3. **Verify structure**
   ```json
   {
     "agencies": [
       {
         "name": "UVA Transit",
         "stops": [...],
         "routes": [...],
         "trips": [...]
       }
     ],
     "stopById": { "stop_id": {...} },
     "routeById": { "route_id": {...} }
   }
   ```

4. **Load in API route**
   ```tsx
   // /app/api/score/route.ts
   const gtfs = require('../../data/gtfs-combined.json');
   // Use for: nearest stops, route name lookup, ETA estimates
   ```

---

## 🗄️ Database Schema (Supabase)

```sql
-- Trips: every time a user takes a green trip
create table trips (
  id uuid primary key,
  session_id text not null,
  mode text not null,
  g_co2e integer,
  logged_at timestamptz default now()
);

-- Streaks: track current streak per session
create table streaks (
  session_id text primary key,
  current_streak integer default 0,
  last_green_date date,
  total_g_saved integer default 0
);
```

No authentication — sessions use anonymous UUIDs in localStorage.

---

## 🚢 Deployment (Vercel)

```bash
# 1. Connect GitHub repo to Vercel
# 2. Set environment variables in Vercel dashboard:
#    - ANTHROPIC_API_KEY
#    - (Optional) NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Deploy
git push origin main
# Vercel auto-deploys; live in ~60 seconds

# 4. Test
curl https://your-ecoroute.vercel.app/api/score
```

---

## 📱 PWA (Progressive Web App)

App is installable on iOS and Android.

```json
// /public/manifest.json
{
  "name": "EcoRoute",
  "display": "standalone",
  "theme_color": "#232D4B",
  "icons": [...]
}

// Auto-included in /app/layout.tsx metadata
```

User can:
- Open homescreen → "Add to Home Screen"
- App runs fullscreen without browser chrome
- Works offline with static assets

---

## 🧪 Testing Locally

### Test API directly
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Lambeth Field",
    "destination": "Alderman Library",
    "distance_miles": 2,
    "persona": "student"
  }' | jq .
```

### Test Claude streaming
```bash
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  -d '{
    "mode": "Bus",
    "gCO2e": 88,
    "baseline_gco2e": 800
  }'
```

---

## ⚠️ Known Limitations & Fallbacks

| Dependency | Fallback |
|-----------|----------|
| Claude API unavailable | Show static equivalence ("~800 phone charges") |
| Google Maps API quota hit | Use hardcoded distance estimates |
| Supabase down | Use localStorage for streak (no cross-device persistence) |
| GTFS parsing incomplete | Show all modes, skip "next departure" ETA |

---

## 📈 Production Checklist

- [ ] Create Supabase project, run schema SQL
- [ ] Get Anthropic API key from console
- [ ] Download & parse both GTFS feeds to JSON
- [ ] Set environment variables in `.env.local`
- [ ] Test `/api/score` and `/api/explain` endpoints
- [ ] Test trip form with 3 demo trips (student, health, faculty)
- [ ] Deploy to Vercel
- [ ] Record 90-second demo video
- [ ] Write Hackathon pitch (see next section)

---

## 🎤 Hackathon Pitch (2 min)

> **Problem:** UVA's 2030 Climate Action Plan commits to net-zero Scope 3 emissions, but there's no tool that makes the carbon cost of commuting visible at the decision moment.
>
> **Solution:**  **EcoRoute** is a real-time behavioral nudge system. When a UVA student, health worker, or faculty member enters their trip, the app:
> 1. Pre-selects the lowest-carbon option (default nudge)
> 2. Shows every mode's exact CO₂ in visceral real-world terms (streaming Claude explanations)
> 3. Tracks multi-day green-trip streaks to build identity-based habits
>
> **Why it works:** It's grounded in academic behavioral science — not guesswork. (Reference: Thaler *Nudge*, Fogg *Behavior Model*, Duhigg *Habit Loop*.)
>
> **Why it ships:** Built on Next.js + public GTFS + Claude API. No proprietary dependencies. UVA Sustainable IT could take the GitHub repo and deploy internally within a week.
>
> **Demo:** [Hand phone to judge] "Enter your address." [Watch bus get pre-selected before they've made a choice. That's the nudge.] "That's not how current transit apps work."

---

## 🙌 Credits

- Built for UVA Hackathon 2026
- Inspired by HooTrans 2021 and UVA's 2030 Climate Action Plan
- Behavioral design grounded in academic research (Thaler, Fogg, Duhigg)
- GTFS data from Transitland + Charlottesville city
- Claude API for real-time CO₂ explanations

---

## 📞 Questions?

See [API_DOCS.md](API_DOCS.md) for full endpoint reference.

---

**🌍 Make the greener choice obvious.**