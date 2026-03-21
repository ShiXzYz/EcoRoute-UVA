const express = require('express');
const router = express.Router();
const transitService = require('../services/transitService');

// Get all routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await transitService.getRoutes();
    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get real-time bus positions
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await transitService.getVehicles();
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get stops for a specific route
router.get('/stops/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const stops = await transitService.getStops(routeId);
    res.json(stops);
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ error: 'Failed to fetch stops' });
  }
});

// Get route details
router.get('/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await transitService.getRouteDetails(routeId);
    res.json(route);
  } catch (error) {
    console.error('Error fetching route details:', error);
    res.status(500).json({ error: 'Failed to fetch route details' });
  }
});

module.exports = router;
