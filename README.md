# EcoRoute @ UVA

Map-based routing app, designed specifically for the UVA community, that calculates carbon emissions for transportation modes and encourages low-carbon choices through behavioral design.

Access EcoRoute @ UVA here: https://eco-route-uva.vercel.app/

## Quick Start

### Prerequisites
- Node.js 18+, npm 9+
- Google Maps API key (Directions + Places)

### Dev Testing

```bash
git clone <repo>
cd EcoRoute-UVA
cp .env.example .env.local

# Add your Google Maps API key to .env.local
GOOGLE_MAPS_API_KEY=your_key_here
# (Optional) Add Supabase credentials for data persistence
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Address Search** — Find origin and destination with Google Places Autocomplete
- **Multi-Modal Routing** — Compare car, bike, bus, walk, and e-alternatives on an interactive map
- **Carbon Scoring** — All modes ranked by emissions (lowest pre-selected)
- **Transit Integration** — GTFS data for bus stops, routes, and departure times
- **Trip Logging** — Track completed trips and view cumulative impact
- **Stats Dashboard** — View carbon saved, estimated tree equivalents, and streak progress



## Architecture

**Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS

**Key Directories:**
- `/app` — Pages and API routes
- `/components` — React components
- `/lib` — Utilities (carbon scoring, GTFS, database)
- `/data/gtfs-parsed` — Pre-parsed transit feed specification JSON

**Main API Routes:**
- `POST /api/score` — Rank modes by emissions
- `POST /api/log-trip` — Log trip and update streak
- `POST /api/directions` — Google Maps proxy

## Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linter
npm run parse-gtfs       # Parse GTFS feeds to JSON
```

## Tech Stack

- **Framework:** Next.js 14 + TypeScript
- **Styling:** Tailwind CSS
- **Maps:** Google Maps API
- **Transit:** GTFS (pre-parsed JSON)
- **Database:** Supabase (optional; localStorage fallback)

## Documentation

- [API_DOCS.md](API_DOCS.md) — API reference
- [GTFS_README.md](GTFS_README.md) — Transit data
- [CONTEXT.md](CONTEXT.md) — Architecture details
- [sources.txt](sources.txt) — Dependencies and attribution


---
Built for HooHacks 2026 to address UVA's 2030 Climate Action Plan

**🌎 Make the greener choice obvious.**