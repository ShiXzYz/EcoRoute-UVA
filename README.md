# 🌱 EcoRoute — UVA Sustainable Transportation  

**Real-time behavioral nudges for low-carbon commuting.** Pick the green option before you even know you need to.

---

## 🎯 The Problem

UVA's 2030 Climate Action Plan targets **net-zero Scope 3 (commuting) emissions**, but students, health workers, and faculty have **no real-time tool** that shows them the carbon cost of their transportation choices at the moment of decision.

## ✨ The Solution

**EcoRoute** embeds three proven behavioral mechanics into a single app:

1. **Default Nudge** — The lowest-carbon option is pre-selected (green border). User must actively choose a worse option. ([Thaler & Sunstein, *Nudge*](https://en.wikipedia.org/wiki/Nudge_(book)))

2. **Real-time CO₂ Feedback** — Every mode card displays grams of CO₂ and a visceral real-world equivalent ("like skipping 82 phone charges"). Powered by Claude API.

3. **Streak Reinforcement** — Log a green trip → streak counter increments → day 7 unlocks "Green Hoo" badge. Identity-based motivation tied to UVA's institutional goals.

Result: Bus gets pre-selected. Carbon cost of driving solo is **always visible**. Habits compound over weeks.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+, npm 9+
- Anthropic API key (Claude)
- Optional: Google Maps API key, Supabase project

### Installation

```bash
# 1. Clone the repo
cd /Users/brian/Desktop/Projects/EcoRoute-UVA

# 2. Copy environment config
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key

# 3. Install dependencies
npm install

# 4. Run development server
npm run dev
```

Then open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📐 Architecture

```
Frontend (Next.js 14)
├── /app/page.tsx          → Main trip input + results UI
├── /components
│   ├── TripForm.tsx       → Persona selector + origin/destination
│   ├── ModeCards.tsx      → Results ranked by CO2
│   ├── ModeCard.tsx       → Individual transportation card
│   ├── StreakDisplay.tsx  → Streak counter with milestones
│   └── UVAProgress.tsx    → Institutional framing
└── /styles
    └── globals.css        → Tailwind + UVA theme colors

API Routes (Next.js TSX)
├── /api/score            → Calculate CO2 for all modes (EPA factors)
└── /api/explain          → Stream Claude explanation of choice

Data Pipeline
├── GTFS feeds (pre-parsed to JSON)
│   ├── UVA: 23 routes, 108 stops
│   └── CAT: X routes, Y stops
└── Emission factors (hardcoded EPA 2023)

Optional: Supabase Postgres
└── trips + streaks tables (for persistence; localStorage fallback available)
```

---

## 🧮 Emission Factors (EPA 2023)

| Mode | g CO₂/mile | Notes |
|------|-----------|-------|
| Solo car | 400 | Average passenger vehicle |
| Carpool (2) | 200 | 400 ÷ 2 |
| Carpool (3+) | 133 | 400 ÷ 3 |
| UTS bus | 44 | Transit bus÷ 45% load factor |
| CAT bus | 44 | Same baseline |
| CONNECT | 44 | Regional coach |
| E-bike | 8 | Manufacturing amortized |
| Bike | 0 | Zero operational |
| Walking | 0 | Zero operational |
| EV (VA grid) | 120 | Virginia grid mix |

---

## 🎬 Demo Flow

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