# EcoRoute API Documentation

Base URL: `http://localhost:3000/api`

## Transit Routes API

### Get All Routes
**Endpoint:** `GET /transit/routes`

Returns all available transportation routes (UVA Transit, CAT, etc.)

**Response:**
```json
[
  {
    "id": "uva_1",
    "name": "Loop 1 - Stadium Drive",
    "agency": "UVA Transit",
    "color": "#FF6B35",
    "stops": [
      {
        "id": "stop_1",
        "name": "Alderman Library",
        "lat": 38.0345,
        "lng": -78.5047
      }
    ]
  }
]
```

---

### Get Real-time Vehicles
**Endpoint:** `GET /transit/vehicles`

Returns current positions of all buses in real-time

**Response:**
```json
[
  {
    "id": "bus_1",
    "routeId": "uva_1",
    "lat": 38.0345,
    "lng": -78.5047,
    "heading": 45,
    "speed": 15,
    "capacity": 40,
    "passengers": 22,
    "nextStop": "Emmet St",
    "minutesUntilNext": 3
  }
]
```

---

### Get Route Details
**Endpoint:** `GET /transit/route/:routeId`

Get specific route information

**Parameters:**
- `routeId` (string, required) - Route ID (e.g., "uva_1")

**Response:** Single route object with all stops

---

### Get Route Stops
**Endpoint:** `GET /transit/stops/:routeId`

Get all stops for a specific route

**Parameters:**
- `routeId` (string, required) - Route ID

**Response:**
```json
[
  {
    "id": "stop_1",
    "name": "Alderman Library",
    "lat": 38.0345,
    "lng": -78.5047
  }
]
```

---

## Weather API

### Get Current Weather
**Endpoint:** `GET /weather/current`

Returns current weather conditions at UVA

**Response:**
```json
{
  "temperature": 72,
  "condition": "Partly Cloudy",
  "windSpeed": 8.5,
  "precipitation": 0,
  "timestamp": "2026-03-21T17:48:34.881Z"
}
```

**Weather Conditions:**
- Clear, Mainly Clear, Partly Cloudy, Overcast
- Foggy, Fog with Rime
- Light/Moderate/Heavy Drizzle
- Slight/Moderate/Heavy Rain
- Snow, Rain Showers
- Thunderstorm (with or without hail)

---

### Get Weather Forecast
**Endpoint:** `GET /weather/forecast`

Returns 24-hour hourly weather forecast

**Response:**
```json
{
  "hourly": [
    {
      "time": "2026-03-21T18:00",
      "temperature": 71,
      "precipitationProbability": 10,
      "precipitation": 0
    }
  ],
  "timestamp": "2026-03-21T17:48:34.881Z"
}
```

---

## Carbon & Emissions API

### Get Emission Factors
**Endpoint:** `GET /carbon/factors`

Returns emission factors for all transportation modes

**Response:**
```json
{
  "bus": {
    "factor": 0.089,
    "color": "#1B998B",
    "label": "Bus"
  },
  "car": {
    "factor": 0.411,
    "color": "#FF6B35",
    "label": "Car (Solo)"
  },
  "bicycle": {
    "factor": 0,
    "color": "#2A9D8F",
    "label": "Bicycle"
  }
}
```

**Factors (kg CO₂/passenger-mile):**
| Mode | Factor | Notes |
|------|--------|-------|
| Bus | 0.089 | Average occupancy |
| Car (Solo) | 0.411 | Single occupant |
| Carpool | 0.205 | 2 passengers |
| E-scooter | 0.025 | Manufacturing included |
| Bicycle | 0.00 | Zero emissions |
| Walking | 0.00 | Zero emissions |

---

### Calculate Emissions
**Endpoint:** `POST /carbon/emissions`

Calculate CO₂ emissions for a transportation mode

**Request Body:**
```json
{
  "mode": "bus",
  "distance": 2,
  "passengers": 1
}
```

**Parameters:**
- `mode` (string, required) - Transportation mode (bus, car, carpool, bicycle, scooter, walking)
- `distance` (number, required) - Distance in miles
- `passengers` (number, optional) - Number of passengers (default: 1)

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
