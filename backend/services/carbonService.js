/**
 * Carbon Emissions Service
 * Calculates and compares transportation emissions
 * Based on EPA and transportation research data
 */

// CO2 emissions per passenger-mile (kg CO2/passenger-mile)
const EMISSION_FACTORS = {
  bus: {
    factor: 0.089, // kg CO2/passenger-mile (average occupancy)
    color: '#1B998B',
    label: 'Bus'
  },
  car: {
    factor: 0.411, // kg CO2/passenger-mile (single occupant)
    color: '#FF6B35',
    label: 'Car (Solo)'
  },
  carpool: {
    factor: 0.205, // kg CO2/passenger-mile (2 passengers)
    color: '#FFB703',
    label: 'Carpool'
  },
  bicycle: {
    factor: 0, // No emissions
    color: '#2A9D8F',
    label: 'Bicycle'
  },
  walking: {
    factor: 0, // No emissions
    color: '#264653',
    label: 'Walking'
  },
  scooter: {
    factor: 0.025, // kg CO2/passenger-mile (manufacturing included)
    color: '#E76F51',
    label: 'Electric Scooter'
  }
};

function getEmissionFactors() {
  return EMISSION_FACTORS;
}

/**
 * Calculate emissions for a transportation mode
 * @param {string} mode - Transportation mode (bus, car, etc.)
 * @param {number} distance - Distance in miles
 * @param {number} passengers - Number of passengers (optional, for shared vehicles)
 * @returns {object} Emission calculation result
 */
function calculateEmissions(mode, distance, passengers = 1) {
  if (!EMISSION_FACTORS[mode]) {
    return { error: `Unknown mode: ${mode}` };
  }
  
  const factor = EMISSION_FACTORS[mode];
  const emissions = factor.factor * distance * passengers;
  
  return {
    mode,
    distance,
    passengers,
    emissions: parseFloat(emissions.toFixed(4)),
    unit: 'kg CO2',
    label: `${factor.label}`,
    color: factor.color,
    description: `${mode}: ${emissions.toFixed(2)} kg CO2 (${distance} miles)`
  };
}

/**
 * Compare all transportation modes for a given distance
 * @param {number} distance - Distance in miles
 * @param {number} passengers - Number of passengers
 * @returns {object} Comparison of all modes
 */
function compareTransportModes(distance, passengers = 1) {
  const modes = Object.keys(EMISSION_FACTORS);
  const comparison = {};
  
  modes.forEach(mode => {
    comparison[mode] = calculateEmissions(mode, distance, passengers);
  });
  
  // Sort by emissions (lowest first)
  const sorted = Object.entries(comparison)
    .sort((a, b) => a[1].emissions - b[1].emissions)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  
  return {
    distance,
    passengers,
    comparison: sorted,
    bestChoice: Object.keys(sorted)[0],
    mostEmissions: Object.keys(sorted)[modes.length - 1],
    savings: {
      busVsCar: Math.round(
        ((EMISSION_FACTORS.car.factor - EMISSION_FACTORS.bus.factor) / 
         EMISSION_FACTORS.car.factor * 100)
      ),
      description: `Taking the bus instead of driving alone saves ${Math.round(
        ((EMISSION_FACTORS.car.factor - EMISSION_FACTORS.bus.factor) / 
         EMISSION_FACTORS.car.factor * 100)
      )}% emissions`
    }
  };
}

/**
 * Calculate daily campus emissions if all students took transit vs drove
 * @param {number} studentsAffected - Number of students
 * @param {number} avgDistance - Average commute distance in miles
 * @returns {object} Impact projection
 */
function projectDailyImpact(studentsAffected, avgDistance) {
  const emissionsIfDriving = EMISSION_FACTORS.car.factor * avgDistance * studentsAffected;
  const emissionsIfTransit = EMISSION_FACTORS.bus.factor * avgDistance * studentsAffected;
  const emissionsSaved = emissionsIfDriving - emissionsIfTransit;
  
  return {
    studentsAffected,
    avgDistance,
    emissionsIfDriving: parseFloat(emissionsIfDriving.toFixed(2)),
    emissionsIfTransit: parseFloat(emissionsIfTransit.toFixed(2)),
    emissionsSaved: parseFloat(emissionsSaved.toFixed(2)),
    percentageReduction: parseFloat(
      ((emissionsSaved / emissionsIfDriving) * 100).toFixed(1)
    ),
    treeEquivalent: Math.round(emissionsSaved / 21.77), // Trees needed to offset
    description: `If ${studentsAffected} students used transit instead of driving, we'd save ${emissionsSaved.toFixed(1)} kg CO2 daily!`
  };
}

module.exports = {
  getEmissionFactors,
  calculateEmissions,
  compareTransportModes,
  projectDailyImpact,
  EMISSION_FACTORS
};
