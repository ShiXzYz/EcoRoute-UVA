import type { NextApiRequest, NextApiResponse } from 'next';

// EPA emission factors (g CO2e per mile)
const EMISSION_FACTORS = {
  solo_car: 400,
  carpool_2: 200,
  carpool_3plus: 133,
  uts_bus: 44,
  cat_bus: 44,
  connect_bus: 44,
  ebike: 8,
  bike: 0,
  walking: 0,
  ev: 120,
};

interface ScoreRequest {
  origin: string;
  destination: string;
  distance_miles: number;
  persona?: string;
  weather?: {
    rain_probability: number;
    wind_speed: number;
  };
}

interface ModeScore {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  icon: string;
  color: string;
  warning?: string;
}

/**
 * Calculate carbon emissions for a single mode
 */
function scoreMode(
  mode: string,
  distance: number,
  persona?: string,
  weather?: any
): ModeScore | null {
  const base: Record<string, Partial<ModeScore>> = {
    solo_car: {
      label: "Drive Solo",
      icon: "🚗",
      color: "red",
      timeMin: Math.round(distance / 25 * 60), // ~25 mph avg
      costUSD: Math.round((distance / 25) * 4), // $4/gallon, 25 mpg
    },
    carpool_2: {
      label: "Carpool (2)",
      icon: "🚗🚗",
      color: "amber",
      timeMin: Math.round(distance / 25 * 60),
      costUSD: Math.round((distance / 25) * 2),
    },
    carpool_3plus: {
      label: "Carpool (3+)",
      icon: "🚗🚗🚗",
      color: "yellow",
      timeMin: Math.round(distance / 25 * 60),
      costUSD: Math.round((distance / 25) * 1.5),
    },
    uts_bus: {
      label: "UTS Bus",
      icon: "🚌",
      color: "green",
      timeMin: Math.round(distance / 12 * 60) + 8, // slower + wait time
      costUSD: 0, // UVA students free
    },
    cat_bus: {
      label: "CAT Bus",
      icon: "🚌",
      color: "teal",
      timeMin: Math.round(distance / 12 * 60) + 8,
      costUSD: 2, // CAT fare
    },
    connect_bus: {
      label: "CONNECT (Regional)",
      icon: "🚌",
      color: "teal",
      timeMin: Math.round(distance / 15 * 60) + 5,
      costUSD: 3,
    },
    ebike: {
      label: "E-Bike",
      icon: "🛵",
      color: "green",
      timeMin: Math.round(distance / 12 * 60),
      costUSD: 0,
    },
    bike: {
      label: "Bike",
      icon: "🚴",
      color: "green",
      timeMin: Math.round(distance / 10 * 60),
      costUSD: 0,
    },
    walking: {
      label: "Walk",
      icon: "🚶",
      color: "slate",
      timeMin: Math.round(distance / 3 * 60),
      costUSD: 0,
    },
    ev: {
      label: "Electric Vehicle",
      icon: "⚡",
      color: "blue",
      timeMin: Math.round(distance / 25 * 60),
      costUSD: Math.round((distance / 4) * 0.14), // $0.14 per kWh, 4 mi/kWh
    },
  };

  const factor = EMISSION_FACTORS[mode as keyof typeof EMISSION_FACTORS];
  if (!factor && factor !== 0) return null;

  const baseScore = base[mode];
  if (!baseScore) return null;

  let gCO2e = distance * factor;

  // Weather adjustment for bike
  if ((mode === "bike" || mode === "ebike") && weather) {
    if (weather.rain_probability > 40 || weather.wind_speed > 15) {
      // Still show carbon, but flag it
    }
  }

  return {
    mode,
    label: baseScore.label || mode,
    gCO2e: Math.round(gCO2e),
    timeMin: baseScore.timeMin || 0,
    costUSD: baseScore.costUSD || 0,
    recommended: false, // Set by caller
    icon: baseScore.icon || "🚌",
    color: baseScore.color || "slate",
    warning: weather?.rain_probability > 40 ? "Rain expected" : undefined,
  };
}

/**
 * Main scoring endpoint
 */
export async function POST(req: Request) {
  try {
    const body: ScoreRequest = await req.json();
    const { origin, destination, distance_miles, persona, weather } = body;

    if (!distance_miles || distance_miles <= 0) {
      return Response.json({ error: "Invalid distance" }, { status: 400 });
    }

    // Generate all mode scores
    const allModes = [
      "walking",
      "bike",
      "ebike",
      "uts_bus",
      "cat_bus",
      "carpool_3plus",
      "carpool_2",
      "solo_car",
      "ev",
      "connect_bus",
    ];

    let scores: ModeScore[] = allModes
      .map((mode) => scoreMode(mode, distance_miles, persona, weather))
      .filter((s): s is ModeScore => s !== null);

    // Sort by CO2e ascending
    scores.sort((a, b) => a.gCO2e - b.gCO2e);

    // Mark first (lowest emissions) as recommended
    if (scores.length > 0) {
      scores[0].recommended = true;
    }

    // Persona-based filtering
    if (persona === "student") {
      // Prioritize UTS bus
      const utsBusIdx = scores.findIndex((s) => s.mode === "uts_bus");
      if (utsBusIdx > 0) {
        const utsBus = scores.splice(utsBusIdx, 1)[0];
        utsBus.recommended = true;
        scores[0].recommended = false;
        scores.unshift(utsBus);
      }
    } else if (persona === "health") {
      // Prioritize CAT Route 7 (to UVA Health)
      const catBusIdx = scores.findIndex((s) => s.mode === "cat_bus");
      if (catBusIdx >= 0) {
        scores[catBusIdx].label = "CAT Route 7 → UVA Health";
      }
    } else if (persona === "faculty") {
      // Show carpool savings
      const carpool2Idx = scores.findIndex((s) => s.mode === "carpool_2");
      if (carpool2Idx >= 0) {
        const solo = scores.find((s) => s.mode === "solo_car");
        if (solo) {
          const annualSavings = Math.round(
            (solo.gCO2e - scores[carpool2Idx].gCO2e) * 250 / 1000
          );
          scores[carpool2Idx].label += ` (save ~${annualSavings}kg CO2/yr)`;
        }
      }
    }

    return Response.json({
      origin,
      destination,
      distance_miles,
      persona,
      scores,
      baseline: {
        solo_car_gco2e: Math.round(distance_miles * EMISSION_FACTORS.solo_car),
      },
    });
  } catch (error) {
    console.error("Score API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
