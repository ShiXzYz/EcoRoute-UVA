/**
 * EcoRoute UVA - Main Application
 * Aggregates real-time transportation data with carbon emissions tracking
 */

class EcoRouteApp {
    constructor() {
        this.routes = [];
        this.vehicles = [];
        this.weather = null;
        this.selectedRoute = null;
        this.markers = {};
        this.polylines = {};
        
        this.init();
    }

    async init() {
        console.log('🌱 Initializing EcoRoute...');
        
        // Initialize map
        this.initMap();
        
        // Load data
        await Promise.all([
            this.loadRoutes(),
            this.loadVehicles(),
            this.loadWeather()
        ]);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Auto-refresh vehicle positions
        setInterval(() => this.loadVehicles(), 5000);
        
        console.log('✅ EcoRoute ready!');
    }

    initMap() {
        // UVA Grounds center
        const uvaCenter = [38.0336, -78.5080];
        
        this.map = L.map('map').setView(uvaCenter, 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);
    }

    async loadRoutes() {
        try {
            const response = await fetch('/api/transit/routes');
            this.routes = await response.json();
            this.renderRoutesList();
            this.displayRoutes();
            console.log(`📍 Loaded ${this.routes.length} routes`);
        } catch (error) {
            console.error('Error loading routes:', error);
            this.showError('Failed to load routes');
        }
    }

    async loadVehicles() {
        try {
            const response = await fetch('/api/transit/vehicles');
            this.vehicles = await response.json();
            this.displayVehicles();
            console.log(`🚌 Loaded ${this.vehicles.length} vehicles`);
        } catch (error) {
            console.error('Error loading vehicles:', error);
        }
    }

    async loadWeather() {
        try {
            const response = await fetch('/api/weather/current');
            this.weather = await response.json();
            this.displayWeather();
            console.log('🌤️ Weather loaded');
        } catch (error) {
            console.error('Error loading weather:', error);
        }
    }

    renderRoutesList() {
        const routesList = document.getElementById('routesList');
        routesList.innerHTML = '';
        
        this.routes.forEach(route => {
            const routeEl = document.createElement('div');
            routeEl.className = 'route-item';
            routeEl.style.borderLeftColor = route.color;
            routeEl.innerHTML = `
                <div class="route-name">${route.name}</div>
                <div class="route-agency">${route.agency}</div>
            `;
            
            routeEl.addEventListener('click', () => this.selectRoute(route));
            routesList.appendChild(routeEl);
        });
    }

    displayRoutes() {
        this.routes.forEach(route => {
            // Create polyline for route (approximate based on stops)
            const stops = route.stops;
            if (stops && stops.length > 0) {
                const latlngs = stops.map(stop => [stop.lat, stop.lng]);
                
                const polyline = L.polyline(latlngs, {
                    color: route.color,
                    weight: 3,
                    opacity: 0.6,
                    smoothFactor: 1
                }).addTo(this.map);
                
                this.polylines[route.id] = polyline;
                
                // Add stop markers
                stops.forEach((stop, idx) => {
                    const markerEl = document.createElement('div');
                    markerEl.className = 'stop-marker';
                    markerEl.style.backgroundColor = route.color;
                    
                    const marker = L.marker([stop.lat, stop.lng], {
                        icon: L.divIcon({
                            html: `<div style="width: 12px; height: 12px; background: ${route.color}; border-radius: 50%; border: 2px solid white;"></div>`,
                            iconSize: [16, 16],
                            className: 'custom-marker'
                        })
                    }).addTo(this.map)
                     .bindPopup(`<strong>${stop.name}</strong><br>${route.name}`);
                    
                    if (!this.markers[route.id]) {
                        this.markers[route.id] = [];
                    }
                    this.markers[route.id].push(marker);
                });
            }
        });
    }

    displayVehicles() {
        this.vehicles.forEach(vehicle => {
            const markerId = `vehicle-${vehicle.id}`;
            
            if (this.markers[markerId]) {
                this.markers[markerId].setLatLng([vehicle.lat, vehicle.lng]);
            } else {
                const marker = L.marker([vehicle.lat, vehicle.lng], {
                    icon: L.divIcon({
                        html: `<div style="font-size: 1.5rem; text-align: center;">🚌</div>`,
                        iconSize: [24, 24],
                        className: 'bus-marker'
                    })
                }).addTo(this.map)
                 .bindPopup(`
                    <strong>Bus ${vehicle.id}</strong><br>
                    Route: ${vehicle.routeId}<br>
                    Next: ${vehicle.nextStop} (${vehicle.minutesUntilNext} min)<br>
                    Passengers: ${vehicle.passengers}/${vehicle.capacity}<br>
                    Speed: ${vehicle.speed} mph
                 `);
                
                if (!this.markers[markerId]) {
                    this.markers[markerId] = [];
                }
                this.markers[markerId] = marker;
            }
        });
    }

    displayWeather() {
        if (!this.weather) return;
        
        const temp = Math.round(this.weather.temperature);
        const condition = this.weather.condition;
        const icon = this.getWeatherIcon(this.weather.condition);
        
        document.getElementById('weatherTemp').textContent = `${temp}°F`;
        document.getElementById('weatherCondition').textContent = condition;
        document.getElementById('weatherIcon').textContent = icon;
    }

    getWeatherIcon(condition) {
        const iconMap = {
            'Clear': '☀️',
            'Mainly Clear': '🌤️',
            'Partly Cloudy': '⛅',
            'Overcast': '☁️',
            'Foggy': '🌫️',
            'Light Drizzle': '🌦️',
            'Moderate Drizzle': '🌧️',
            'Heavy Drizzle': '⛈️',
            'Slight Rain': '🌧️',
            'Moderate Rain': '🌧️',
            'Heavy Rain': '⛈️',
            'Snow': '❄️',
            'Thunderstorm': '⛈️'
        };
        return iconMap[condition] || '🌤️';
    }

    selectRoute(route) {
        this.selectedRoute = route;
        this.showDetails(route);
    }

    showDetails(route) {
        const panel = document.getElementById('detailsPanel');
        const content = document.getElementById('detailsContent');
        
        let stopsHtml = route.stops.map(stop => `
            <div class="detail-item">
                <div class="detail-label">📍 Stop</div>
                <div class="detail-value">${stop.name}</div>
            </div>
        `).join('');
        
        content.innerHTML = `
            <h2>${route.name}</h2>
            <div class="detail-item">
                <div class="detail-label">Agency</div>
                <div class="detail-value">${route.agency}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Color Code</div>
                <div style="width: 30px; height: 30px; background: ${route.color}; border-radius: 4px;"></div>
            </div>
            <h3 style="margin-top: 1rem; margin-bottom: 0.75rem;">Stops</h3>
            ${stopsHtml}
        `;
        
        panel.classList.add('open');
    }

    compareEmissions() {
        const distance = parseFloat(document.getElementById('distanceInput').value);
        if (!distance || distance <= 0) {
            alert('Please enter a valid distance');
            return;
        }
        
        fetch('/api/carbon/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ distance, passengers: 1 })
        })
        .then(res => res.json())
        .then(data => {
            this.displayEmissionsComparison(data);
        })
        .catch(error => console.error('Error comparing emissions:', error));
    }

    displayEmissionsComparison(data) {
        const container = document.getElementById('emissionsComparison');
        container.innerHTML = '';
        
        Object.entries(data.comparison).forEach(([mode, emission]) => {
            const emissionEl = document.createElement('div');
            emissionEl.className = 'emission-item';
            emissionEl.style.backgroundColor = `${emission.color}22`;
            emissionEl.style.borderLeft = `4px solid ${emission.color}`;
            
            const savings = emission.mode === 'bus' 
                ? ` (saves 78% vs car)`
                : emission.mode === 'car'
                ? ' (average solo)'
                : '';
            
            emissionEl.innerHTML = `
                <div class="emission-mode">🚗 ${emission.label}</div>
                <div class="emission-value">${emission.emissions.toFixed(2)} kg CO₂</div>
                <div class="emission-description">${emission.distance} miles${savings}</div>
            `;
            
            container.appendChild(emissionEl);
        });
        
        // Show impact
        const treeEquivalent = Math.round(data.comparison.bus.emissions / 21.77);
        const bestChoice = data.bestChoice.toUpperCase();
        const impactPanel = document.getElementById('impactProjection');
        impactPanel.innerHTML = `
            <div class="impact-stat">
                <strong>${bestChoice}</strong>
                <div>is your best choice</div>
            </div>
            <div class="impact-stat">
                <strong>-78%</strong>
                <div>vs driving solo</div>
            </div>
            <div class="impact-stat">
                <strong>${treeEquivalent}</strong>
                <div>trees needed to offset bus ride</div>
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('compareBtn').addEventListener('click', 
            () => this.compareEmissions());
        
        document.getElementById('distanceInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.compareEmissions();
        });
        
        document.getElementById('closeDetailsBtn').addEventListener('click', () => {
            document.getElementById('detailsPanel').classList.remove('open');
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterRoutes(e.target.value);
        });
    }

    filterRoutes(query) {
        const items = document.querySelectorAll('.route-item');
        items.forEach(item => {
            const name = item.querySelector('.route-name').textContent.toLowerCase();
            if (name.includes(query.toLowerCase())) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    showError(message) {
        console.error(message);
        const routesList = document.getElementById('routesList');
        routesList.innerHTML = `<div class="loading" style="color: red;">${message}</div>`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EcoRouteApp();
});
