'use client';

/**
 * GPS Page — Primary EcoRoute interaction surface
 * 
 * Users:
 * 1. Enter origin + destination via Google Places Autocomplete (SearchBar)
 * 2. Map displays:
 *    - Blue pin: origin
 *    - Green pin: destination
 *    - Orange pins: nearest bus stops (from GTFS data)
 * 3. Select from ranked transport options (car, bike, bus, walk)
 * 4. Map updates with polyline (car/bike/walk) or stop markers (transit)
 * 5. Log trip: "I took this route today" → streak updates
 * 
 * Architecture:
 * - /api/score: Calculate & rank all modes (POST)
 * - MapSelector: Google Maps display
 * - SlideUpPanel: Pullable bottom sheet with mode cards
 * - SearchBar: Google Places Autocomplete input
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';

const MapSelector = dynamic(() => import('@/components/MapSelector'), { ssr: false });

/**
 * ModeScore extended with transit fields
 * See API_DOCS.md for full reference
 */
interface ModeScore {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  icon: string;
  color: string;
  polyline?: string;                           // Google Maps encoded polyline
  bikeWarning?: boolean;
  transitStops?: {                             // GTFS stop markers
    origin: { id: string; lat: number; lon: number };
    destination: { id: string; lat: number; lon: number };
  };
  nextDepartureTime?: string;                  // "HH:MM"
  minutesUntilDeparture?: number;
}

interface Location {
  lat: number;
  lng: number;
  name: string;
}

/**
 * Haversine distance calculation (miles)
 * Used client-side for rough distance estimation
 * Server calls Google Directions API for authoritative distance
 */
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

export default function GPSPage() {
  // Trip state
  const [scores, setScores] = useState<ModeScore[] | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedModeData, setSelectedModeData] = useState<ModeScore | null>(null);

  // Streak state (from localStorage or Supabase)
  const [streak, setStreak] = useState<number>(0);

  // Search/location state
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [selectedType, setSelectedType] = useState<'from' | 'to' | null>('from');

  // UI state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);

  /**
   * Handle location selection from Google Places Autocomplete
   * Once both origin and destination are selected, call /api/score
   */
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

  /**
   * Manually trigger search (in case user doesn't select auto suggestion)
   */
  const handleSearch = async () => {
    if (fromLocation && toLocation) {
      await fetchScores(fromLocation, toLocation);
    }
  };

  /**
   * Swap origin and destination
   */
  const handleSwap = () => {
    const tempLocation = fromLocation;
    const tempInput = fromInput;
    setFromLocation(toLocation);
    setToLocation(tempLocation);
    setFromInput(toInput);
    setToInput(tempInput);
  };

  /**
   * Call /api/score to get ranked transportation modes
   * Response includes polylines, transit stops, and next departure times
   */
  const fetchScores = async (from: Location, to: Location) => {
    setLoading(true);
    setSelectedMode(null);
    setScores(null);

    try {
      // Client-side distance (rough estimate for UI)
      const distance_miles = calculateDistance(from.lat, from.lng, to.lat, to.lng);
      setDistance(distance_miles);

      // Call server endpoint
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: `${from.lat},${from.lng}`,
          destination: `${to.lat},${to.lng}`,
          distance_miles,  // Passed for reference; server calls Google Directions for truth
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Response is array sorted by gCO2e, first item has recommended: true
      setScores(data);

      // Auto-select the recommended option (lowest CO₂)
      if (data.length > 0 && data[0].recommended) {
        setSelectedMode(data[0].mode);
        setSelectedModeData(data[0]);
      }

      setPanelOpen(true);
    } catch (error) {
      console.error('Error scoring trip:', error);
      alert('Failed to calculate routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle mode selection from card
   * Updates map with polyline or transit stop markers
   */
  const handleModeSelect = (mode: ModeScore) => {
    setSelectedMode(mode.mode);
    setSelectedModeData(mode);
  };

  /**
   * Log a completed trip to Supabase
   * Updates streak counter and stats page data
   */
  const handleLogTrip = async (mode: ModeScore) => {
    const sessionId = typeof window !== 'undefined' 
      ? localStorage.getItem('sessionId') || 'demo-user'
      : 'demo-user';

    try {
      const response = await fetch('/api/log-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode: mode.mode,
          gCO2e: mode.gCO2e,
          distance_miles: distance,
          time_min: mode.timeMin,
        }),
      });

      const data = await response.json();
      
      // Update local streak counter
      setStreak(data.streak);

      // Show toast or badge unlock message
      if (data.badgeUnlocked) {
        alert('🎉 Green Hoo badge unlocked! 7-day streak achieved!');
      }

      console.log('Trip logged:', { mode: mode.mode, streak: data.streak });
    } catch (error) {
      console.error('Error logging trip:', error);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden flex flex-col">
      {/* Full-screen map display */}
      <div className="flex-1 relative">
        <MapSelector
          onLocationSelect={handleLocationSelect}
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
        />
      </div>

      {/* Top search bar — Google Places Autocomplete */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <SearchBar
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedType={selectedType}
          onSelectedTypeChange={(type) => setSelectedType(type)}
          onFromChange={(e) => setFromInput(e.target.value)}
          onToChange={(e) => setToInput(e.target.value)}
          onSwap={handleSwap}
          onSearch={handleSearch}
        />
      </div>

      {/* Bottom tab bar — GPS | Stats */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex">
        <a
          href="/"
          className="flex-1 py-3 text-center font-semibold text-green-600 border-b-2 border-green-600"
        >
          📍 GPS
        </a>
        <a
          href="/stats"
          className="flex-1 py-3 text-center font-semibold text-slate-600"
        >
          📊 Stats
        </a>
      </nav>
    </main>
  );
}
