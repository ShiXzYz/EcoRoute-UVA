const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes to avoid excessive API calls
const cache = new NodeCache({ stdTTL: 300 });

/**
 * TransLoc API Service
 * Handles fetching real-time transit data for UVA and Charlottesville
 */

// Mock data for demonstration (replace with real TransLoc API calls)
const mockRoutes = [
  {
    id: 'uva_1',
    name: 'Loop 1 - Stadium Drive',
    agency: 'UVA Transit',
    color: '#FF6B35',
    stops: [
      { id: 'stop_1', name: 'Alderman Library', lat: 38.0345, lng: -78.5047 },
      { id: 'stop_2', name: 'Emmet St', lat: 38.0352, lng: -78.5055 },
      { id: 'stop_3', name: 'Main Grounds', lat: 38.0340, lng: -78.5020 }
    ]
  },
  {
    id: 'uva_2',
    name: 'Loop 2 - Observatory Hill',
    agency: 'UVA Transit',
    color: '#004E89',
    stops: [
      { id: 'stop_4', name: 'Observatory Rd', lat: 38.0320, lng: -78.5100 },
      { id: 'stop_5', name: 'North Grounds', lat: 38.0360, lng: -78.5090 },
      { id: 'stop_6', name: 'Engineering', lat: 38.0310, lng: -78.5080 }
    ]
  },
  {
    id: 'cat_1',
    name: 'CAT Route 1 - Downtown',
    agency: 'Charlottesville Area Transit',
    color: '#1B998B',
    stops: [
      { id: 'stop_7', name: 'Main St & Water', lat: 38.0272, lng: -78.4778 },
      { id: 'stop_8', name: 'Pearl St Station', lat: 38.0298, lng: -78.4795 },
      { id: 'stop_9', name: 'McGuffey Park', lat: 38.0335, lng: -78.4920 }
    ]
  }
];

const mockVehicles = [
  {
    id: 'bus_1',
    routeId: 'uva_1',
    lat: 38.0345,
    lng: -78.5047,
    heading: 45,
    speed: 15,
    capacity: 40,
    passengers: 22,
    nextStop: 'Emmet St',
    minutesUntilNext: 3
  },
  {
    id: 'bus_2',
    routeId: 'uva_2',
    lat: 38.0320,
    lng: -78.5100,
    heading: 90,
    speed: 12,
    capacity: 40,
    passengers: 15,
    nextStop: 'North Grounds',
    minutesUntilNext: 5
  },
  {
    id: 'bus_3',
    routeId: 'cat_1',
    lat: 38.0272,
    lng: -78.4778,
    heading: 180,
    speed: 18,
    capacity: 60,
    passengers: 35,
    nextStop: 'Pearl St Station',
    minutesUntilNext: 2
  }
];

async function getRoutes() {
  const cached = cache.get('routes');
  if (cached) return cached;
  
  try {
    // In production, call real TransLoc API
    // const response = await axios.get(`${process.env.TRANSLOC_API_BASE}/routes`);
    // return response.data;
    
    cache.set('routes', mockRoutes);
    return mockRoutes;
  } catch (error) {
    console.error('Error fetching routes:', error.message);
    return mockRoutes; // Return mock data on error
  }
}

async function getVehicles() {
  const cached = cache.get('vehicles');
  if (cached) return cached;
  
  try {
    // In production, call real TransLoc API
    // const response = await axios.get(`${process.env.TRANSLOC_API_BASE}/vehicles`);
    // return response.data;
    
    cache.set('vehicles', mockVehicles);
    return mockVehicles;
  } catch (error) {
    console.error('Error fetching vehicles:', error.message);
    return mockVehicles; // Return mock data on error
  }
}

async function getStops(routeId) {
  const routes = await getRoutes();
  const route = routes.find(r => r.id === routeId);
  return route ? route.stops : [];
}

async function getRouteDetails(routeId) {
  const routes = await getRoutes();
  return routes.find(r => r.id === routeId);
}

module.exports = {
  getRoutes,
  getVehicles,
  getStops,
  getRouteDetails
};
