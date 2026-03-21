# 🚀 EcoRoute Quick Start Guide

## ✅ Server is Running!

Your EcoRoute application is live and ready to use.

### 🌐 Access the App
- **Open your browser to**: [http://localhost:3000](http://localhost:3000)

### 📡 Test the APIs

#### Get all routes
```bash
curl http://localhost:3000/api/transit/routes
```

#### Get real-time vehicles
```bash
curl http://localhost:3000/api/transit/vehicles
```

#### Get current weather
```bash
curl http://localhost:3000/api/weather/current
```

#### Compare transportation modes (2 mile trip)
```bash
curl -X POST http://localhost:3000/api/carbon/compare \
  -H "Content-Type: application/json" \
  -d '{"distance": 2, "passengers": 1}'
```

#### Get emission factors
```bash
curl http://localhost:3000/api/carbon/factors
```

## 📂 Project Structure

```
EcoRoute-UVA/
├── backend/
│   ├── server.js                 # Express server
│   ├── routes/
│   │   ├── transit.js           # Transit APIs
│   │   ├── weather.js           # Weather APIs
│   │   └── carbon.js            # Carbon calculation APIs
│   └── services/
│       ├── transitService.js    # Transit logic
│       ├── weatherService.js    # Weather logic
│       └── carbonService.js     # Carbon calculations
├── frontend/
│   ├── index.html               # Main page
│   ├── js/
│   │   └── app.js              # Frontend app logic
│   └── styles/
│       └── main.css            # Styling
├── package.json                 # Dependencies
├── Dockerfile                   # Docker setup
├── docker-compose.yml           # Docker compose
└── .env.example                 # Environment config
```

## 🎨 Features Available on the Map

1. **Route Visualization**: Click on any route in the sidebar to see details
2. **Real-time Buses**: 🚌 icons show live bus positions (updates every 5 seconds)
3. **Emissions Calculator**: Enter a distance to compare carbon emissions
4. **Weather Widget**: Current conditions displayed in header
5. **Route Search**: Filter routes by typing in the search box
6. **Details Panel**: Click on routes to see stops and information

## 🔧 Configuration

### Edit Environment Variables
```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Available settings:
- `PORT`: Server port (default: 3000)
- `UVA_LAT`/`UVA_LNG`: Coordinates for UVA center
- `MAPBOX_TOKEN`: Optional Mapbox API key
- `GOOGLE_MAPS_API_KEY`: Optional Google Maps API key

## 📊 Current Data (Demo Mode)

The app includes **sample data** for 3 transit routes:
- **Loop 1**: Stadium Drive (UVA Transit)
- **Loop 2**: Observatory Hill (UVA Transit)  
- **CAT Route 1**: Downtown Charlottesville

Real buses are simulated at various locations. Ready to use:
- ✅ TransLoc API (when connected)
- ✅ CAT GTFS feed (when connected)
- ✅ Real weather from Open-Meteo API

## 🚀 Next Steps

### Ready to go live?
1. **Replace mock transit data** with real TransLoc/GTFS APIs
2. **Add authentication** for user accounts
3. **Deploy to cloud** (Heroku, AWS, Azure, Render)
4. **Connect to UVA database** for personalization

### Deployment with Docker
```bash
docker-compose up -d
# Access at http://localhost:3000
```

### Add Real Transit APIs
Edit `backend/services/transitService.js`:
- Replace mock data with real API calls
- Add error handling and caching
- Implement GTFS parsing for CAT

## 🐛 Troubleshooting

### Server won't start?
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process if needed
kill -9 <PID>
# Start again
npm start
```

### Page won't load?
- Check browser console (F12 → Console tab)
- Verify API calls in Network tab
- Ensure backend is running: `curl http://localhost:3000/api/health`

### Mock data not showing?
- Refresh the page (Cmd+R on Mac)
- Check browser's IndexedDB/localStorage
- Verify map is centered on UVA (38.0336, -78.5080)

## 📞 Support

For issues:
1. Check the [README.md](README.md) for detailed docs
2. Review server logs for errors
3. Test individual API endpoints with curl
4. Check browser developer console (F12)

## 🎓 Educational Value

This project demonstrates:
- ✅ Full-stack JavaScript development
- ✅ REST API design and implementation
- ✅ Real-time data aggregation
- ✅ Interactive web mapping
- ✅ Environmental data science
- ✅ Sustainable technology solutions

---

**🌍 You're ready to change transportation at UVA! Good luck with your hackathon! 🚀**

Need help? Check the API documentation by visiting `/api` endpoints or the full README.
