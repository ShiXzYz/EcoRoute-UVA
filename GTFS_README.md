# GTFS Integration - EcoRoute-UVA

## Overview

GTFS (General Transit Feed Specification) data provides real-time transit information including:
- Bus stop locations
- Route polylines (shapes)
- Departure schedules
- Friendly route names (Gold Line, Green Line, etc.)

## Data Sources

| Agency | Stops | Routes | ZIP Location |
|--------|-------|--------|--------------|
| UVA Transit Service | 217 | 16 | `data/gtfs-raw/University_Transit_Service_GTFS.zip` |
| Charlottesville Area Transit (CAT) | 366 | 12 | `data/gtfs-raw/Charlottesville_Area_Transit_GTFS.zip` |
| JAUNT/CONNECT | 39 | 9 | `data/gtfs-raw/Jaunt_Connect_Charlottesville_GTFS.zip` |

## Files

| File | Purpose |
|------|---------|
| `data/routes.json` | Friendly route name mappings (Gold Line, Green Line, etc.) |
| `data/gtfs-parsed/*.json` | Parsed GTFS data (stops, routes, shapes, departures) |
| `scripts/parse-gtfs.js` | Parser script to extract GTFS ZIP → JSON |
| `lib/gtfs.ts` | Server-side GTFS lookup library |

## Route Names

### UVA Transit (Navy #232D4B)
| Route ID | Friendly Name | Color |
|----------|--------------|-------|
| TL-57, TL-67 | Gold Line | #B45309 |
| TL-68, TL-71 | Green Line / Green Loop | #15803D |
| TL-55, TL-70 | Orange Loop / Orange Line | #C2410C |
| TL-72, TL-73, TL-74 | Purple Line | #6B21A8 |
| TL-58 | Silver Line | #475569 |
| TL-59 | Night Pilot | #1E3A5F |

### CAT Transit (#007A53)
Route numbers with full destination names (Emmet St, Pantops, UVA Health, etc.)

### CONNECT (#D97706)
Crozet, Buckingham, Lovingston, Route 29 North

## Updating Route Names

Edit `data/routes.json` to change friendly names or colors:

```json
{
  "uva-gtfs": {
    "TL-57": { "name": "Gold Line", "color": "#B45309" }
  }
}
```

## Reparsing GTFS Data

If raw GTFS feeds are updated, run:

```bash
npm run parse-gtfs
```

This extracts:
- `stops.txt` → stop locations and names
- `routes.txt` → route definitions
- `trips.txt` → trip-to-route mappings
- `stop_times.txt` → departure times
- `calendar.txt` → service day rules
- `shapes.txt` → route polylines

## API Response

Transit modes include:
```json
{
  "mode": "uts_bus",
  "label": "UVA Transit (Gold Line) — Departs 12 min (10:45)",
  "transitStops": {
    "origin": { "id": "TL-57", "lat": 38.0293, "lon": -78.4767, "name": "Alderman & Rue" },
    "destination": { "id": "TL-57", "lat": 38.0336, "lon": -78.5080, "name": "Darden School" }
  },
  "shapePoints": [
    { "lat": 38.0293, "lng": -78.4767 },
    { "lat": 38.0305, "lng": -78.4850 }
  ],
  "nextDepartureTime": "10:45",
  "minutesUntilDeparture": 12
}
```

## Implementation Status

- [x] Parse GTFS ZIP files
- [x] Load GTFS on server startup
- [x] Find nearest stops within ~1 mile radius
- [x] Query next departure times
- [x] Draw polylines on map from shapes.txt
- [x] Friendly route names via routes.json
- [x] One optimal route per agency
