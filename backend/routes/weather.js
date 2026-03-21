const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// Get current weather at UVA
router.get('/current', async (req, res) => {
  try {
    const weather = await weatherService.getCurrentWeather();
    res.json(weather);
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Get weather forecast
router.get('/forecast', async (req, res) => {
  try {
    const forecast = await weatherService.getForecast();
    res.json(forecast);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

module.exports = router;
