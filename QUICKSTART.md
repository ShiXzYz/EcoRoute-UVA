# 🚀 EcoRoute-UVA Development Guide

## Starting the App

```bash
# From project root
npm install          # Install dependencies (first time only)
npm run parse-gtfs   # Parse GTFS feeds to JSON (first time only)
npm run dev          # Start dev server on http://localhost:3000
```

The app will open at **[http://localhost:3000](http://localhost:3000)** with hot reload enabled.

---

## 🗺️ Exploring the App

### GPS Page (Default)
1. **Search:** Enter origin and destination using Google Places Autocomplete
   - Example: "Old Dorms" → "Shannon Library"
2. **Map:** Watch blue pin (origin) and green pin (destination) appear
3. **Mode Cards:** Scroll through ranked transport options by CO₂
   - Green card = lowest carbon (pre-selected)
   - Each card shows: CO₂, time, cost, "Departs in X min" for transit
4. **Marker Selection:** Tap a mode card → map updates with polyline or transit stops
5. **Log Trip:** Click "I took this route today" → streak updates

### Stats Page
- Tap **Stats** tab at bottom
- See impact metrics: tree equivalents, gas savings, mode breakdown, 2030 progress
- Tap **GPS** tab to return to map

---

## 🧪 Testing Endpoints with cURL

### Get emission rankings for a trip
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"origin": "38.0245,-78.5018", "destination": "38.0336,-78.5080"}'
```

**Expected response:**
```json
[
  {
    "mode": "bike",
    "label": "Bike",
    "gCO2e": 0,
    "timeMin": 24,
    "costUSD": 0,
    "color": "green-600",
    "icon": "bike",
    "recommended": true,
    "polyline": "encoded_polyline_string"
  },
  { "mode": "solo_car", ... }
]
```

### Log a completed trip
```bash
curl -X POST http://localhost:3000/api/log-trip \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-user-123",
    "mode": "bike",
    "gCO2e": 0,
    "distance_miles": 1.3,
    "time_min": 24
  }'
```

**Expected response:**
```json
{
  "streak": 1,
  "total_g_saved": 520,
  "weekly_g_saved": 520,
  "total_trips_green": 1,
  "badgeUnlocked": false
}
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

## 📁 Project Structure

```
EcoRoute-UVA/
├── app/
│   ├── page.tsx                 # GPS page (main)
│   ├── stats/
│   │   └── page.tsx             # Stats page
│   ├── layout.tsx               # Root layout + tabs
│   └── api/
│       ├── score/route.ts       # Score modes endpoint
│       ├── log-trip/route.ts    # Log trip endpoint
│       └── directions/route.ts  # Google Maps proxy
├── components/
│   ├── SearchBar.tsx            # Google Places input
│   ├── MapSelector.tsx          # Google Maps display
│   ├── ModeCard.tsx             # Single mode card
│   ├── ModeCards.tsx            # Mode list container
│   ├── SlideUpPanel.tsx         # Pullable panel
│   ├── StreakDisplay.tsx        # Streak counter
│   ├── StatCard.tsx             # Stat display (Stats page)
│   └── BottomNav.tsx            # GPS | Stats tabs
├── lib/
│   ├── carbon.ts                # Emission factors
│   ├── gtfs.ts                  # GTFS lookup (haversine, departures)
│   ├── google-maps.ts           # Google Maps utilities
│   ├── impact-calculator.ts     # Tree math + stats
│   └── supabase.ts              # Supabase client
├── data/
│   ├── gtfs-raw/                # ZIP files (ignored by git)
│   └── gtfs-parsed/             # JSON output (committed)
│       ├── uva-gtfs.json
│       ├── cat-gtfs.json
│       └── jaunt-gtfs.json
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/
│       ├── pin-blue.png
│       ├── pin-green.png
│       └── pin-orange.png
└── scripts/
    └── parse-gtfs.js            # GTFS parser
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# REQUIRED
GOOGLE_MAPS_API_KEY=your_key          # Get from Google Cloud
NEXT_PUBLIC_SUPABASE_URL=your_url     # From Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# OPTIONAL
OPENWEATHER_API_KEY=your_key          # For weather warnings
```

**Google Maps Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs: Directions API, Places API
4. Create an API key (Restrict to web + add localhost)
5. Copy to `.env.local`

---

## 📊 Demo Trip Coordinates

Use these for testing without leaving your desk:

**Trip 1: Old Dorms → Shannon Library (short, multimodal)**
```
Origin: 38.0245, -78.5018
Destination: 38.0336, -78.5080
Distance: ~1.3 km
Modes: Bike, walk, car all viable
Expected: Bike or walk recommended
```

**Trip 2: Pantops → UVA Health (transit-heavy)**
```
Origin: 38.0350, -78.4580
Destination: 38.0418, -78.4983
Distance: ~2.8 km
Modes: Car, bus (UTS or CAT)
Expected: UTS Bus recommended, show stop markers
Next departure: Check GTFS departures for current day
```

**Trip 3: Crozet → Scott Stadium (long, regional)**
```
Origin: 38.0686, -78.7075
Destination: 38.0383, -78.5043
Distance: ~15 km
Modes: Car, CONNECT bus
Expected: CONNECT Bus recommended (lowest CO₂)
Next departure: High regional commute time
```

---

## 🔧 Development Tips

### Enable React DevTools
```bash
npm install -D @next/eslint-config-next
npm run dev
# Open browser DevTools (F12) → Components tab
```

### Check GTFS Data
```bash
# Inspect parsed JSON
cat data/gtfs-parsed/uva-gtfs.json | jq '.stops[0:3]'

# Count stops in each feed
jq '.stops | length' data/gtfs-parsed/*.json
```

### Test Haversine Math
```typescript
// In node or browser console
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Test: distance from Old Dorms to Shannon Library
haversine(38.0245, -78.5018, 38.0336, -78.5080); // ≈ 1280 meters
```

### Rebuild After Git Pull
```bash
npm install
npm run parse-gtfs
npm run dev
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Module not found: data/gtfs-parsed" | Run `npm run parse-gtfs` |
| "Google Maps API key not valid" | Check `.env.local` and Google Cloud Console settings |
| "No transit options showing" | Verify GTFS JSON exists; check browser console for errors |
| Map doesn't render | Ensure Google Maps API enabled in Cloud Console |
| "Cannot find module '@/components/...'" | Check path alias in `tsconfig.json` |
| Inconsistent styling | Clear `.next/` folder: `rm -rf .next && npm run dev` |

---

## 📋 First-Time Checklist

- [ ] Clone repo
- [ ] `npm install`
- [ ] Copy `.env.example` → `.env.local`
- [ ] Add Google Maps API key
- [ ] `npm run parse-gtfs` (creates GTFS JSON)
- [ ] `npm run dev` (start dev server)
- [ ] Open [http://localhost:3000](http://localhost:3000)
- [ ] Search "Old Dorms" → "Shannon Library"
- [ ] Verify modes appear on map
- [ ] Click a mode → see polyline/stops update
- [ ] Hit "I took this route" → streak updates
- [ ] Navigate to Stats → see tree equivalency math

---

## 🚀 Next Steps

- See [GTFS_README.md](GTFS_README.md) for GTFS transit feature details
- See [API_DOCS.md](API_DOCS.md) for endpoint specs
- See [CONTEXT.md](CONTEXT.md) for full project context

---

## 💬 Questions?

**During hackathon:** Chase down your teammate or ask GitHub Copilot ("How do I parse GTFS?" / "Why isn't my map rendering?")

**After hackathon:** Check context docs, API_DOCS, and code comments for implementer notes.

---

*Last updated: March 2026 — Next.js 14 + Google Maps + GTFS implementation phase*

### Ready to go live?
1. **Replace mock transit data** with real TransLoc/GTFS APIs
2. **Add authentication** for user accounts
3. **Deploy to cloud** (Heroku, AWS, Azure, Render)
4. **Connect to UVA database** for personalization

### Deployment with Docker
```bash
docker-compose up -d
# Access at http://localhost:3000
```

### Add Real Transit APIs
Edit `backend/services/transitService.js`:
- Replace mock data with real API calls
- Add error handling and caching
- Implement GTFS parsing for CAT

## 🐛 Troubleshooting

### Server won't start?
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process if needed
kill -9 <PID>
# Start again
npm start
```

### Page won't load?
- Check browser console (F12 → Console tab)
- Verify API calls in Network tab
- Ensure backend is running: `curl http://localhost:3000/api/health`

### Mock data not showing?
- Refresh the page (Cmd+R on Mac)
- Check browser's IndexedDB/localStorage
- Verify map is centered on UVA (38.0336, -78.5080)

## 📞 Support

For issues:
1. Check the [README.md](README.md) for detailed docs
2. Review server logs for errors
3. Test individual API endpoints with curl
4. Check browser developer console (F12)

## 🎓 Educational Value

This project demonstrates:
- ✅ Full-stack JavaScript development
- ✅ REST API design and implementation
- ✅ Real-time data aggregation
- ✅ Interactive web mapping
- ✅ Environmental data science
- ✅ Sustainable technology solutions

---

**🌍 You're ready to change transportation at UVA! Good luck with your hackathon! 🚀**

Need help? Check the API documentation by visiting `/api` endpoints or the full README.
