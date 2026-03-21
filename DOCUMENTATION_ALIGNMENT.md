# Documentation Alignment Summary

## Overview
All project documentation and code comments have been updated to reflect the new EcoRoute-UVA design from `ecoroute-context.md`. This document tracks what was aligned.

---

## Files Updated

### 📄 Core Documentation Files

#### ✅ `API_DOCS.md` (MAJOR UPDATE)
**Status:** Completely rewritten for new API design

**Changes:**
- ❌ Removed: Old transit API endpoints (`/transit/routes`, `/transit/vehicles`, `/transit/stops`)
- ❌ Removed: `/api/explain` endpoint (No Claude API)
- ❌ Removed: Emission factors in kg CO₂/passenger-mile format
- ✅ Added: `/api/score` endpoint with GPS page response format
- ✅ Added: `/api/log-trip` endpoint with streak tracking
- ✅ Added: `/api/directions` endpoint (Google Maps proxy)
- ✅ Added: Tree equivalency calculation math
- ✅ Added: Gas savings formula ($3.5/gal, 28 mpg)
- ✅ Updated: Emission factors to g CO₂/mile (EPA 2023)
- ✅ Updated: Mode codes and labels to match new design
- ✅ Added: cURL examples for new endpoints
- ✅ Added: Error handling documentation (fallbacks)
- **Key fields documented:** polyline, transitStops, nextDepartureTime, minutesUntilDeparture

---

#### ✅ `README.md` (MAJOR UPDATE)
**Status:** Completely rewritten for GPS + Stats page architecture

**Changes:**
- ❌ Removed: Claude API references
- ❌ Removed: "Real-time CO₂ equivalence" copy
- ❌ Removed: Old Express backend structure
- ✅ Added: "Map-based behavioral nudge" positioning
- ✅ Added: GPS page feature list (map markers, polylines, bus stops)
- ✅ Added: Stats page feature list (tree equivalency, gas savings, streak)
- ✅ Added: Full architecture diagram with new file structure
- ✅ Added: `/app/stats/page.tsx` and Stats components
- ✅ Added: GTFS file organization (gtfs-raw, gtfs-parsed)
- ✅ Added: Impact math section (tree equivalency & gas savings)
- ✅ Added: "How It Works: Per-Trip Flow" walkthrough
- ✅ Added: GTFS setup instructions (`npm run parse-gtfs`)
- ✅ Added: Links to new documentation files
- ✅ Updated: Emission factors table to g CO₂/mile
- ✅ Updated: Demo script coordinates for map-based testing
- **Key sections:** Feature list, Architecture, Impact Math, Demo Script

---

#### ✅ `QUICKSTART.md` (MAJOR UPDATE)
**Status:** Completely rewritten for Next.js + Map-based development

**Changes:**
- ❌ Removed: Express backend setup instructions
- ❌ Removed: Old API endpoints (transit/routes, weather/forecast, etc.)
- ❌ Removed: Demo mode data references
- ✅ Added: `npm run parse-gtfs` setup step
- ✅ Added: GPS page and Stats page navigation
- ✅ Added: New cURL testing examples for `/api/score`, `/api/log-trip`, `/api/directions`
- ✅ Added: Updated project folder structure
- ✅ Added: Environment variables section (Google Maps key)
- ✅ Added: Demo trip coordinate pairs (3 example trips)
- ✅ Added: Haversine math test code snippet
- ✅ Added: GTFS data inspection commands
- ✅ Added: Troubleshooting table
- ✅ Added: First-time checklist
- ✅ Updated: File structure to show new architecture
- **Key sections:** Quick start, endpoint testing, demo trips, troubleshooting

---

### 💻 Code Comments

#### ✅ `app/api/score/route.ts`
**Status:** Updated with detailed implementation comments

**Changes:**
- ✅ Added: Comprehensive `EMISSION_FACTORS` comment (EPA 2023, no fetch)
- ✅ Updated: `EMISSION_FACTORS` object:
  - Changed `ebike: 8` → `ebike: 65` (VEO ops + manufacturing)
  - Added `escooter: 70`
  - Removed: carpool modes (not in new design)
  - Removed: `ev` mode
- ✅ Extended: `ModeScore` interface comment with transit fields:
  - `polyline`: Google Maps encoded polyline
  - `transitStops`: GTFS origin/destination stops
  - `nextDepartureTime`: Bus departure time "HH:MM"
  - `minutesUntilDeparture`: Computed time
- ✅ Updated: `scoreMode()` function comment with new logic
- ✅ Added: Helper function comments:
  - `getModeLabel()` — Friendly names + transit timing
  - `getModeColor()` — Tailwind classes based on emissions (green <100g, amber 100-500g, red >500g)
  - `getModeIcon()` — Icon names for UI
- ✅ Updated: Time estimation logic (transit wait times, traffic)
- ✅ Updated: Cost estimation (VEO pricing, bus free for UVA)
- ✅ Removed: Persona-based adjustments (not in new design MVP)
- ✅ Removed: Weather label strings ("Rain expected")

---

#### ✅ `app/page.tsx`
**Status:** Updated with GPS page architecture comments

**Changes:**
- ✅ Added: Comprehensive file header comment explaining:
  - GPS page as primary surface
  - 5-step user flow (search → map → select → route → log)
  - Architecture (SearchBar, MapSelector, SlideUpPanel)
  - Links to API_DOCS
- ✅ Extended: `ModeScore` interface with transit fields (polyline, transitStops, etc.)
- ✅ Added: Haversine function comment explaining client-side estimate vs. server truth
- ✅ Renamed: `Home` → `GPSPage` (more descriptive)
- ✅ Added: Detailed state comments for each `useState` hook
- ✅ Added: Multi-line comments for key handler functions:
  - `handleLocationSelect()` — Places Autocomplete flow
  - `fetchScores()` — /api/score call and response handling
  - `handleModeSelect()` — Map update logic
  - `handleLogTrip()` — /api/log-trip and streak update
- ✅ Added: Inline comments for localStorage sessionId logic
- ✅ Updated: Error handling to show user-friendly alert
- ✅ Added: Tab bar at bottom (GPS | Stats navigation)
- ✅ Removed: References to old "persona" system
- ✅ Removed: References to "baseline" calculation (moved to Stats page)

---

### 📚 Reference Documentation Files

#### ✅ Existing Docs (verified alignment)
- `ecoroute-context.md` — **Reference baseline** (updated in previous session)
- `AGENTS.md` — No changes needed (independent from design)
- `GTFS_IMPLEMENTATION_PLAN.md` — Created, aligns with new design ✅
- `GTFS_HACKATHON_CHECKLIST.md` — Created, aligns with new design ✅
- `data/GTFS_SETUP_GUIDE.md` — Created, aligns with new design ✅
- `.gitignore` — Updated to exclude GTFS raw files ✅

---

## Cross-References Verified

### ✅ Consistent Terminology
| Term | Usage |
|------|-------|
| `gCO2e` | Grams CO₂ equivalent (never kg, never per-mile fraction) |
| GPS page | Primary map-based interface |
| Stats page | Secondary impact tracking |
| "Departs in X min" | Transit time display format |
| Tree equivalency | 60 kg CO₂/tree/year (EPA) |
| Gas savings | $3.50/gal, 28 mpg baseline |
| Emission factors | g CO₂e per mile (hardcoded, EPA 2023) |

### ✅ Consistent Modes & Labels
| Mode | Label | Cost | Color |
|------|-------|------|-------|
| `solo_car` | Drive solo | $X.XX | red |
| `uts_bus` | UTS Bus | FREE | green |
| `cat_bus` | CAT Transit | FREE | green |
| `connect_bus` | CONNECT Bus | FREE | green |
| `bike` | Bike | FREE | green |
| `walk` | Walk | FREE | green |
| `ebike` | E-Bike (VEO) | $1 + $0.39/mi | amber |
| `escooter` | E-Scooter (VEO) | $1 + $0.39/mi | amber |

### ✅ Consistent API Endpoints
- `/api/score` — Rank modes (POST, no streaming)
- `/api/log-trip` — Log trip and update streak (POST)
- `/api/directions` — Google Maps proxy (POST)
- ❌ Removed: `/api/explain` (no Claude API)
- ❌ Removed: `/transit/*`, `/weather/*`, `/carbon/*` (old design)

### ✅ Consistent Data Flow
```
User enters origin/destination (Places Autocomplete)
    ↓
/api/score called (Google Directions + GTFS + weather)
    ↓
Response: array sorted by gCO2e, first item recommended: true
    ↓
Map displays polylines (car/bike/walk) or stop markers (transit)
    ↓
User selects mode → map updates
    ↓
"I took this route today" button
    ↓
/api/log-trip (streak updates, localStorage + Supabase)
    ↓
Stats page reflects changes
```

---

## What's NOT in Documentation Yet

These are implementation details not documented yet (for next phase):
- [ ] `lib/gtfs.ts` — GTFS haversine + departure lookup logic (code comments ready)
- [ ] `components/MapSelector.tsx` — Google Maps integration details
- [ ] `components/StatCard.tsx` — Stats page card templates
- [ ] `lib/impact-calculator.ts` — Tree equivalency math implementation
- [ ] Service calendar handling (Friday vs Sunday departures)
- [ ] Post-midnight time format ("25:15" → "01:15")
- [ ] Supabase schema migrations (already in ecoroute-context.md)

---

## Alignment Checklist

### 🎯 Core Design Requirements
- ✅ No Claude API references anywhere
- ✅ GPS page with map-based interaction
- ✅ Stats page with tree equivalency
- ✅ Two-tab navigation (GPS | Stats)
- ✅ Google Maps Directions + Places Autocomplete
- ✅ GTFS stop markers for transit (no polylines)
- ✅ Streak tracking → Green Hoo badge at day 7
- ✅ Emission factors: g CO₂/mile (EPA 2023)
- ✅ Transit modes free for UVA students
- ✅ Bike/walk only if reasonable distance
- ✅ Behavioral default nudge (recommended: true on lowest CO₂e)

### 📖 Documentation Quality
- ✅ All markdown files reviewed
- ✅ Code comments updated
- ✅ API endpoints documented
- ✅ Demo trip coordinates provided
- ✅ Environment variables documented
- ✅ Troubleshooting sections added
- ✅ Cross-references consistent
- ✅ No stale/contradictory information

### 🔗 File Structure Consistency
- ✅ `/app/page.tsx` → GPS page (not results page)
- ✅ `/app/stats/page.tsx` → Stats page (new)
- ✅ `/app/layout.tsx` → Root layout + bottom nav
- ✅ `/app/api/score/route.ts` → Score endpoint
- ✅ `/app/api/log-trip/route.ts` → Trip logging
- ✅ `/data/gtfs-raw/` → Source ZIPs (git-ignored)
- ✅ `/data/gtfs-parsed/` → Generated JSON (git-tracked)
- ✅ All paths match documentation

---

## Next Actions for Implementation

1. **Backend:** Implement `/api/score` with Google Directions + GTFS logic (see GTFS_IMPLEMENTATION_PLAN.md)
2. **Frontend:** MapSelector component with Google Maps + marker rendering
3. **Stats Page:** Create `/app/stats/page.tsx` with impact math
4. **GTFS:** Run `npm run parse-gtfs` to generate JSON files
5. **Testing:** Use demo trip coordinates from QUICKSTART.md
6. **Deployment:** Ensure all env vars set in Vercel dashboard

---

*Updated: March 2026 — All documentation now aligned with GPS + Stats page design from ecoroute-context.md*
