# Bus Stop Marker Feature — Hackathon Checklist

## What Users Will See

**GPS Page:**
1. User enters "From" and "To"
2. Map shows three markers:
   - 🔵 **Blue pin** = User's origin
   - 🟢 **Green pin** = User's destination
   - 🟠 **Orange pins** = Nearest bus stops (if transit option available)
3. Mode card shows: `"UTS Bus 3 - Departs in 12 min at 10:45 AM"`
4. When user selects bus mode, map updates with orange stop pins

---

## Implementation Priority (Quickest First)

### Phase 1: File Organization (15 min)
- [ ] Move GTFS ZIP files to `data/gtfs-raw/`
- [ ] Update `.gitignore` ✅ (done)
- [ ] Verify `data/gtfs-raw/` and `data/gtfs-parsed/` directories exist ✅ (done)

### Phase 2: Parse GTFS (30 min)
- [ ] Implement `scripts/parse-gtfs.js` to:
  - Unzip three feeds
  - Extract `stops.txt`, `routes.txt`, `stop_times.txt`, `calendar.txt`
  - Build `departures` lookup table filtered by day of week
  - Output `uva-gtfs.json`, `cat-gtfs.json`, `jaunt-gtfs.json`
- [ ] Run `npm run parse-gtfs` and verify JSON files generated

### Phase 3: Core Backend (`lib/gtfs.ts`) (45 min)
- [ ] Create `lib/gtfs.ts` with:
  - `haversine()` function
  - `getNearestStops(lat, lon)` — returns stops within 400m
  - `getNextDeparture(stopId)` — returns next bus time or null
  - `findConnectingStops()` — finds routes that connect origin → destination
  - Load all feeds at module init

### Phase 4: API Integration (`/api/score`) (30 min)
- [ ] Import GTFS functions in `/api/score/route.ts`
- [ ] After Google Directions call, add:
  ```typescript
  const originStops = getNearestStops(originLat, originLon);
  const destStops = getNearestStops(destLat, destLon);
  const connections = findConnectingStops(originStops, destStops, 'uva-gtfs');
  ```
- [ ] Build transit ModeResult with `transitStops` field
- [ ] Return modes sorted by gCO2e

### Phase 5: Frontend — Update Types (10 min)
- [ ] Add to `types/index.ts`:
  ```typescript
  transitStops?: { origin: {lat, lon}, destination: {lat, lon} }
  nextDepartureTime?: string  // "HH:MM"
  minutesUntilDeparture?: number
  ```

### Phase 6: Frontend — Map Component (30 min)
- [ ] Update `components/MapSelector.tsx`:
  - Render orange markers if `selectedMode.transitStops` exists
  - Render polyline if `selectedMode.polyline` exists
- [ ] Add marker icon files to `public/icons/`:
  - `pin-blue.png` (origin)
  - `pin-green.png` (destination)
  - `pin-orange.png` (transit stops)

### Phase 7: Frontend — Mode Card (15 min)
- [ ] Update `components/ModeCard.tsx`:
  - Show `minutesUntilDeparture` if transit mode
  - Display: `"Departs in 12 min at 10:45 AM"`

### Phase 8: Test (15 min)
- [ ] Test with demo trip (Old Dorms → Shannon Library)
- [ ] Verify: orange markers appear
- [ ] Verify: card shows departure time
- [ ] Verify: no crash if no transit option

---

## Critical Files to Touch

| File | What | Why |
|------|------|-----|
| `scripts/parse-gtfs.js` | Unzip & parse | Foundation for everything |
| `lib/gtfs.ts` | Haversine math | How you find nearest stops |
| `app/api/score/route.ts` | Compute transit | Where transit logic lives |
| `types/index.ts` | Add fields | So frontend knows about transit |
| `components/MapSelector.tsx` | Render markers | Users see the map |
| `components/ModeCard.tsx` | Show time | Users see "Departs in X min" |

---

## Code Snippets (Copy-Paste Ready)

### Quick Test: Haversine Function
```typescript
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Returns distance in meters
}

// Test: haversine(38.0245, -78.5018, 38.0336, -78.5080) ≈ 1200 meters
```

### Quick Test: Parse Departures for Today
```typescript
const now = new Date();
const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

const departures = feedData.departures['stop_123'][dayName];
const nextDep = departures?.find(time => time >= currentTimeStr);
console.log(`Next bus: ${nextDep} (in ${minutesUntil(nextDep, currentTimeStr)} min)`);
```

---

## Demo Trip for Judging

**Trip: Old Dorms → Shannon Library**
- Origin: `38.0245, -78.5018`
- Destination: `38.0336, -78.5080`
- Distance: ~1.3 km (short enough for multiple modes)
- Expected result: Walking + bike + bus options
- Expected map: Blue pin (old dorms), green pin (Shannon), orange pins (nearest UTS stops)

---

## Gotchas to Watch

1. **"25:15" times**: GTFS encodes 1:15 AM tomorrow as "25:15". String comparison works fine.
2. **Sunday = no service**: If `calendar.txt` says Sunday = 0, departures[stopId]['sunday'] should be empty or missing.
3. **Missing stops**: If origin/destination has no stops within 400m, just show car/bike/walk — don't crash.
4. **Module-level cache**: Load feeds once at startup (NOT on every request). Massive speed difference.
5. **Marker icons**: If icons are 404, bus cards still work but UI looks broken. Test in browser dev tools.

---

## Success Criteria

- [x] GTFS files organized in `data/gtfs-raw/` and `data/gtfs-parsed/`
- [ ] `npm run parse-gtfs` generates three JSON files with no errors
- [ ] `lib/gtfs.ts` loads feeds and runs haversine without crash
- [ ] `/api/score` returns transit mode with `transitStops` field
- [ ] GPS map renders 🟠 orange pins at stop locations
- [ ] Mode card shows `"Departs in X min at HH:MM"`
- [ ] Demo trip shows all three modes (car, bike, bus) with correct times

---

## Estimated Time: 3 hours end-to-end

- Parse script: 30 min
- `lib/gtfs.ts`: 45 min
- `/api/score` integration: 30 min
- Frontend updates: 45 min
- Testing: 30 min

If you hit time crunch after 2 hours, cut the "Departs in X min" display—just show orange stop pins on the map, which is 80% of the value.
