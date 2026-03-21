'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import SlideUpPanel from '@/components/SlideUpPanel';

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
  const [streak, setStreak] = useState<number>(0);
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<'from' | 'to' | null>('from');
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

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

      if (data.scores.length > 0) {
        const defaultMode = data.scores[0].mode;
        setSelectedMode(defaultMode);
        fetchDirections(defaultMode);
      }

      setPanelOpen(true);
    } catch (error) {
      console.error('Error scoring trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogTrip = async (mode: string, gCO2e: number) => {
    setStreak(streak + 1);
    console.log('Logged trip:', { mode, gCO2e, streak: streak + 1 });
  };

  const fetchDirections = (selectedMode: string) => {
    if (!fromLocation || !toLocation) return;

    setRouteLoading(true);

    // Wait for google to be available
    const tryFetch = () => {
      if (typeof window.google === 'undefined' || !window.google.maps) {
        setTimeout(tryFetch, 100);
        return;
      }

      try {
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

        const mode = modeToTravelMode[selectedMode] || 'DRIVING';
        const directionsService = new window.google.maps.DirectionsService();

        directionsService.route(
          {
            origin: new window.google.maps.LatLng(fromLocation.lat, fromLocation.lng),
            destination: new window.google.maps.LatLng(toLocation.lat, toLocation.lng),
            travelMode: (window.google.maps.TravelMode as any)[mode],
          },
          (result, status) => {
            if (status === 'OK' && result) {
              // eslint-disable-next-line
              const polyline = result.routes[0].overview_polyline as any;
              const path = polyline.getPath ? polyline.getPath() : polyline;
              const points = window.google.maps.geometry.encoding.decodePath(path);
              setRoute({
                points: points.map((p: any) => ({ lat: p.lat(), lng: p.lng() })),
                color: undefined,
              });
            } else {
              console.error('Directions failed:', status);
            }
            setRouteLoading(false);
          }
        );
      } catch (error) {
        console.error('Error fetching directions:', error);
        setRouteLoading(false);
      }
    };

    tryFetch();
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    fetchDirections(mode);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Full Screen Map - with low z-index */}
      <div 
        className="absolute inset-0" 
        style={{ zIndex: 1 }}
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
        />
      </div>

      {/* Search Bar - Floating at top with high z-index */}
      <div className="absolute top-4 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl" style={{ zIndex: 100 }}>
        <SearchBar
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
          onSelectedTypeChange={handleSelectedTypeChange}
          onLocationSelect={handleLocationSelect}
          onSwap={handleSwap}
        />
      </div>

      {/* Streak Badge - Top Right */}
      {streak > 0 && (
        <div className="absolute top-4 right-2 sm:right-4" style={{ zIndex: 100 }}>
          <div className="bg-white rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-uva-primary text-sm">{streak}</span>
          </div>
        </div>
      )}

      {/* Instructions - Bottom Left */}
      {!fromLocation && !panelOpen && (
        <div className="absolute bottom-8 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-xs" style={{ zIndex: 100 }}>
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
    </main>
  );
}
