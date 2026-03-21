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
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [selectedType, setSelectedType] = useState<'from' | 'to' | null>('from');

  const handleLocationSelect = async (location: Location, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromLocation(location);
      setFromInput(location.name);
      setSelectedType('to');
    } else {
      setToLocation(location);
      setToInput(location.name);
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

  const handleSearch = async () => {
    if (fromLocation && toLocation) {
      await fetchScores(fromLocation, toLocation);
    }
  };

  const handleSwap = () => {
    const tempLocation = fromLocation;
    const tempInput = fromInput;
    setFromLocation(toLocation);
    setToLocation(tempLocation);
    setFromInput(toInput);
    setToInput(tempInput);
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
        setSelectedMode(data.scores[0].mode);
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

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Full Screen Map - with low z-index */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <MapSelector
          onLocationSelect={handleLocationSelect}
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
        />
      </div>

      {/* Search Bar - Floating at top with high z-index */}
      <div className="absolute top-4 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl" style={{ zIndex: 100 }}>
        <SearchBar
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
          onSelectedTypeChange={handleSelectedTypeChange}
          onFromChange={(e) => setFromInput(e.target.value)}
          onToChange={(e) => setToInput(e.target.value)}
          onSwap={handleSwap}
          onSearch={handleSearch}
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
              <span className="font-medium">Tip:</span> Tap the blue dot to set start, red dot for destination.
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
        onClose={() => setPanelOpen(false)}
        onSelect={setSelectedMode}
        onLogTrip={handleLogTrip}
      />
    </main>
  );
}
