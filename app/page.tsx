'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import SlideUpPanel from '@/components/SlideUpPanel';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/lib/auth';
import { getCachedDirections, setCachedDirections } from '@/lib/cache';
import { addTrip, saveTripToSupabase, loadTrips } from '@/lib/trips';

const GREEN_MODES = ['uts_bus', 'cat_bus', 'connect_bus', 'bike', 'ebike', 'walk', 'escooter'];

function calculateCurrentStreak(trips: any[]): number {
  const greenTrips = trips.filter(t => GREEN_MODES.includes(t.mode));
  if (greenTrips.length === 0) return 0;

  const greenDays = new Set<string>();
  greenTrips.forEach(trip => {
    greenDays.add(new Date(trip.date).toDateString());
  });

  const sortedDays = Array.from(greenDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const mostRecentDay = sortedDays[0];
  if (mostRecentDay !== today && mostRecentDay !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let checkDate = new Date(mostRecentDay);
  for (const day of sortedDays) {
    const dayDate = new Date(day);
    if (dayDate.toDateString() === checkDate.toDateString()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const MapSelector = dynamic(() => import('@/components/MapSelector'), { ssr: false });

interface ModeScore {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  icon: string;
  color: string;
}

interface Location {
  lat: number;
  lng: number;
  name: string;
  displayName?: string;
}

interface RouteData {
  points: { lat: number; lng: number }[];
  color?: string;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [scores, setScores] = useState<ModeScore[] | null>(null);
  const [baseline, setBaseline] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<'from' | 'to' | null>('from');
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const trips = loadTrips();
    setTripCount(trips.length);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const trips = loadTrips();
      setTripCount(trips.length);
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      const trips = loadTrips();
      setTripCount(trips.length);
    }, 1000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleLocationSelect = async (location: Location, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromLocation(location);
      setSelectedType('to');
    } else {
      setToLocation(location);
      setSelectedType(null);
    }

    const otherLocation = type === 'from' ? toLocation : fromLocation;
    if (otherLocation) {
      await fetchScores(
        type === 'from' ? location : fromLocation!,
        type === 'to' ? location : toLocation!
      );
    }
  };

  const handleSelectedTypeChange = (type: 'from' | 'to' | null) => {
    setSelectedType(type);
  };

  const handleSwap = () => {
    const tempLocation = fromLocation;
    setFromLocation(toLocation);
    setToLocation(tempLocation);
    if (fromLocation && toLocation) {
      setSelectedType(null);
    } else if (fromLocation) {
      setSelectedType('to');
    } else if (toLocation) {
      setSelectedType('from');
    }
  };

  const fetchScores = async (from: Location, to: Location) => {
    setLoading(true);
    setSelectedMode(null);

    try {
      const distance_miles = calculateDistance(from.lat, from.lng, to.lat, to.lng);

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: from.name,
          destination: to.name,
          distance_miles,
          persona: 'Student',
          weather: {
            rain_probability: 10,
            wind_speed: 8,
          },
        }),
      });

      const data = await response.json();
      setScores(data.scores);
      setBaseline(data.baseline.solo_car_gco2e);
      setDistance(distance_miles);
      setSelectedMode(null); // Don't auto-select, let user choose
      setRoute(null);

      setPanelOpen(true);
      setPanelExpanded(true); // Always expand when panel opens
    } catch (error) {
      console.error('Error scoring trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogTrip = async (mode: string, gCO2e: number) => {
    const tripEntry = {
      mode,
      gCO2e,
      distanceMiles: distance,
      date: new Date().toISOString(),
    };

    addTrip(tripEntry);
    const trips = loadTrips();
    setTripCount(trips.length);

    if (user) {
      const saved = await saveTripToSupabase(user.id, tripEntry);
      if (saved) {
        console.log('Trip saved to cloud');
      }
    }

    console.log('Logged trip:', { mode, gCO2e, distance, trips: trips.length });
  };

  const fetchDirections = (selectedMode: string) => {
    if (!fromLocation || !toLocation) return;

    setRouteLoading(true);
    setRoute(null); // Clear previous route while loading

    // Delay to ensure Google Maps is fully loaded
    const tryFetch = async () => {
      // Wait a bit longer for Google Maps to be ready
      if (typeof window.google === 'undefined' || !window.google.maps || !window.google.maps.DirectionsService) {
        setTimeout(tryFetch, 200);
        return;
      }

      // Check cache first
      const cached = await getCachedDirections(
        fromLocation.lat,
        fromLocation.lng,
        toLocation.lat,
        toLocation.lng,
        selectedMode
      );

      if (cached) {
        // eslint-disable-next-line
        const points = window.google.maps.geometry.encoding.decodePath(cached.polyline);
        setRoute({
          points: points.map((p: any) => ({ lat: p.lat(), lng: p.lng() })),
          color: undefined,
        });
        setRouteLoading(false);
        return;
      }

      try {
        // eslint-disable-next-line
        const maps = window.google.maps as any;
        const modeToTravelMode: Record<string, string> = {
          walking: 'WALKING',
          bike: 'BICYCLING',
          ebike: 'BICYCLING',
          ev: 'DRIVING',
          solo_car: 'DRIVING',
          carpool_2: 'DRIVING',
          carpool_3: 'DRIVING',
          cat_bus: 'TRANSIT',
          uts_bus: 'TRANSIT',
          trolley: 'TRANSIT',
        };

        const travelMode = modeToTravelMode[selectedMode] || 'DRIVING';
        const directionsService = new maps.DirectionsService();

        directionsService.route(
          {
            origin: new maps.LatLng(fromLocation.lat, fromLocation.lng),
            destination: new maps.LatLng(toLocation.lat, toLocation.lng),
            travelMode: maps.TravelMode[travelMode],
          },
          async (result: any, status: string) => {
            if (status === 'OK' && result && result.routes[0]) {
              // eslint-disable-next-line
              const polyline = result.routes[0].overview_polyline as any;
              const path = polyline.getPath ? polyline.getPath() : polyline;
              const points = maps.geometry.encoding.decodePath(path);

              // Cache the result
              await setCachedDirections(
                fromLocation.lat,
                fromLocation.lng,
                toLocation.lat,
                toLocation.lng,
                selectedMode,
                path,
                result.routes[0].legs[0]?.distance?.value || 0,
                result.routes[0].legs[0]?.duration?.value || 0
              );

              setRoute({
                points: points.map((p: any) => ({ lat: p.lat(), lng: p.lng() })),
                color: undefined,
              });
            } else {
              console.error('Directions failed:', status);
              // Retry once after a delay
              setTimeout(() => {
                directionsService.route(
                  {
                    origin: new maps.LatLng(fromLocation.lat, fromLocation.lng),
                    destination: new maps.LatLng(toLocation.lat, toLocation.lng),
                    travelMode: maps.TravelMode[travelMode],
                  },
                  async (retryResult: any, retryStatus: string) => {
                    if (retryStatus === 'OK' && retryResult && retryResult.routes[0]) {
                      // eslint-disable-next-line
                      const retryPolyline = retryResult.routes[0].overview_polyline as any;
                      const retryPath = retryPolyline.getPath ? retryPolyline.getPath() : retryPolyline;
                      const retryPoints = maps.geometry.encoding.decodePath(retryPath);

                      await setCachedDirections(
                        fromLocation.lat,
                        fromLocation.lng,
                        toLocation.lat,
                        toLocation.lng,
                        selectedMode,
                        retryPath,
                        retryResult.routes[0].legs[0]?.distance?.value || 0,
                        retryResult.routes[0].legs[0]?.duration?.value || 0
                      );

                      setRoute({
                        points: retryPoints.map((p: any) => ({ lat: p.lat(), lng: p.lng() })),
                        color: undefined,
                      });
                    }
                    setRouteLoading(false);
                  }
                );
              }, 500);
            }
            setRouteLoading(false);
          }
        );
      } catch (error) {
        console.error('Error fetching directions:', error);
        setRouteLoading(false);
      }
    };

    setTimeout(tryFetch, 300);
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    fetchDirections(mode);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Full Screen Map - with top and bottom padding */}
      <div 
        className="absolute left-0 right-0 bottom-0" 
        style={{ zIndex: 1, top: '56px', bottom: '64px' }}
        onClick={() => {
          if (panelOpen && panelExpanded) {
            setPanelExpanded(false);
          }
        }}
      >
        <MapSelector
          onLocationSelect={handleLocationSelect}
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
          route={route}
          mode={selectedMode || undefined}
          mapType={mapType}
          onMapTypeChange={setMapType}
          key={route ? `route-${selectedMode}` : 'no-route'}
        />
      </div>

      {/* Top Bar - Logo Centered */}
      <div 
        className="absolute top-0 left-0 right-0 h-14 bg-white shadow-md flex items-center justify-between px-4 z-[100]"
      >
        {/* Logo & App Name - Left */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-uva-primary rounded-lg flex items-center justify-center">
            <span className="text-lg">🌿</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-uva-primary leading-tight">EcoRoute</h1>
            <p className="text-[10px] text-uva-accent font-medium -mt-0.5">UVA</p>
          </div>
        </div>

        {/* Account Button - Right */}
        <button
          onClick={() => setShowAuthModal(true)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          {user ? (
            <span className="text-lg">👤</span>
          ) : (
            <span className="text-lg">🔐</span>
          )}
        </button>
      </div>

      {/* Map Controls - Below Top Bar, Left Side */}
      <div className="absolute top-16 left-2 flex flex-col gap-2" style={{ zIndex: 100 }}>
        <div className="flex flex-col shadow-lg rounded-lg overflow-hidden">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              mapType === 'roadmap'
                ? 'bg-white text-uva-primary'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            MAP
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-2 text-xs font-medium transition-colors border-t border-slate-600 ${
              mapType === 'satellite'
                ? 'bg-white text-uva-primary'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            SAT
          </button>
        </div>
      </div>

      {/* Full Screen Button - Below Top Bar, Right Side */}
      <div className="absolute top-16 right-2" style={{ zIndex: 100 }}>
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-2 bg-white hover:bg-slate-100 rounded-lg shadow-md transition-colors"
          title="Full Screen"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Search Bar - Below Top Bar */}
      <div className="absolute top-16 left-20 right-20 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl" style={{ zIndex: 100 }}>
        <SearchBar
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
          onSelectedTypeChange={handleSelectedTypeChange}
          onLocationSelect={handleLocationSelect}
          onSwap={handleSwap}
        />
      </div>

      {/* Streak Badge - Below Top Bar Right */}
      {tripCount > 0 && (
        <div className="absolute top-16 right-2 sm:right-4" style={{ zIndex: 100 }}>
          <div className="bg-white rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-uva-primary text-sm">{calculateCurrentStreak(loadTrips())}</span>
          </div>
        </div>
      )}

      {/* Instructions - Bottom Left */}
      {!fromLocation && !panelOpen && (
        <div className="absolute bottom-24 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-xs" style={{ zIndex: 100 }}>
          <div className="bg-white bg-opacity-95 backdrop-blur rounded-lg shadow-lg px-4 py-3">
            <p className="text-sm text-slate-700">
              <span className="font-medium">Tip:</span> Search for a location or tap on the map.
            </p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 100 }}>
          <div className="bg-white rounded-full shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-uva-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-700 font-medium">Finding routes...</span>
          </div>
        </div>
      )}

      {/* Slide Up Panel */}
      <SlideUpPanel
        modes={scores || []}
        selectedMode={selectedMode}
        baseline={baseline}
        distance={distance}
        isOpen={panelOpen}
        isExpanded={panelExpanded}
        onClose={() => setPanelOpen(false)}
        onCollapse={() => setPanelExpanded(false)}
        onExpand={() => setPanelExpanded(true)}
        onSelect={handleModeSelect}
        onLogTrip={handleLogTrip}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 z-[90]">
        <Link href="/" className="flex flex-col items-center py-2 px-4 text-uva-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-xs mt-1 font-medium">Map</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center py-2 px-4 text-slate-400 hover:text-uva-accent transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Stats</span>
        </Link>
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}
