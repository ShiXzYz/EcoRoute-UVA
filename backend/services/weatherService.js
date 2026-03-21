const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 30 minutes
const cache = new NodeCache({ stdTTL: 1800 });

const WEATHER_API_BASE = process.env.WEATHER_API_BASE || 'https://api-open-meteo.com/v1';
const UVA_LAT = process.env.UVA_LAT || 38.0336;
const UVA_LNG = process.env.UVA_LNG || -78.5080;

/**
 * Weather Service using Open-Meteo API (no auth needed)
 */

async function getCurrentWeather() {
  const cached = cache.get('current_weather');
  if (cached) return cached;
  
  try {
    const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
      params: {
        latitude: UVA_LAT,
        longitude: UVA_LNG,
        current: 'temperature_2m,weather_code,wind_speed_10m,precipitation',
        temperature_unit: 'fahrenheit'
      }
    });
    
    const current = response.data.current;
    const weather = {
      temperature: current.temperature_2m,
      condition: interpretWeatherCode(current.weather_code),
      windSpeed: current.wind_speed_10m,
      precipitation: current.precipitation,
      timestamp: current.time
    };
    
    cache.set('current_weather', weather);
    return weather;
  } catch (error) {
    console.error('Error fetching current weather:', error.message);
    return {
      temperature: 65,
      condition: 'Partly Cloudy',
      windSpeed: 8,
      precipitation: 0,
      error: 'Failed to fetch real weather data'
    };
  }
}

async function getForecast() {
  const cached = cache.get('forecast');
  if (cached) return cached;
  
  try {
    const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
      params: {
        latitude: UVA_LAT,
        longitude: UVA_LNG,
        hourly: 'temperature_2m,precipitation_probability,precipitation',
        temperature_unit: 'fahrenheit',
        timezone: 'America/New_York'
      }
    });
    
    const hourly = response.data.hourly;
    const forecast = {
      hourly: hourly.time.slice(0, 24).map((time, idx) => ({
        time,
        temperature: hourly.temperature_2m[idx],
        precipitationProbability: hourly.precipitation_probability[idx],
        precipitation: hourly.precipitation[idx]
      })),
      timestamp: new Date().toISOString()
    };
    
    cache.set('forecast', forecast);
    return forecast;
  } catch (error) {
    console.error('Error fetching forecast:', error.message);
    return { error: 'Failed to fetch forecast' };
  }
}

function interpretWeatherCode(code) {
  // WMO Weather interpretation codes
  const codes = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy with Rime',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Heavy Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Hail'
  };
  return codes[code] || 'Unknown';
}

module.exports = {
  getCurrentWeather,
  getForecast
};
