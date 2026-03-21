const express = require('express');
const router = express.Router();
const carbonService = require('../services/carbonService');

// Calculate emissions for a route
router.post('/emissions', async (req, res) => {
  try {
    const { mode, distance, passengers } = req.body;
    
    if (!mode || !distance) {
      return res.status(400).json({ error: 'mode and distance required' });
    }
    
    const emissions = carbonService.calculateEmissions(mode, distance, passengers);
    res.json(emissions);
  } catch (error) {
    console.error('Error calculating emissions:', error);
    res.status(500).json({ error: 'Failed to calculate emissions' });
  }
});

// Get emission factors
router.get('/factors', (req, res) => {
  const factors = carbonService.getEmissionFactors();
  res.json(factors);
});

// Compare modes (best for climate)
router.post('/compare', async (req, res) => {
  try {
    const { distance, passengers } = req.body;
    
    if (!distance) {
      return res.status(400).json({ error: 'distance required' });
    }
    
    const comparison = carbonService.compareTransportModes(distance, passengers);
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing modes:', error);
    res.status(500).json({ error: 'Failed to compare modes' });
  }
});

module.exports = router;
