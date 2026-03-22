'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMaps } from '@/lib/GoogleMapsContext';

interface Location {
  lat: number;
  lng: number;
  name: string;
  displayName?: string;
}

interface CachedPlace {
  description: string;
  placeId: string;
  location: Location;
  timestamp?: number;
}

const CACHE_KEY = 'ecoroute_place_cache';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function getPlaceCache(): Record<string, CachedPlace> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    const data = JSON.parse(cached);
    const now = Date.now();
    const filtered: Record<string, CachedPlace> = {};
    for (const [key, value] of Object.entries(data)) {
      const entry = value as CachedPlace & { timestamp: number };
      if (now - entry.timestamp < CACHE_TTL) {
        filtered[key] = entry;
      }
    }
    return filtered;
  } catch {
    return {};
  }
}

function savePlaceToCache(key: string, place: CachedPlace) {
  try {
    const cache = getPlaceCache();
    cache[key] = { ...place, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

interface SearchBarProps {
  fromLocation: Location | null;
  toLocation: Location | null;
  selectedType: 'from' | 'to' | null;
  onSelectedTypeChange: (type: 'from' | 'to' | null) => void;
  onLocationSelect: (location: Location, type: 'from' | 'to') => void;
  onSwap: () => void;
}

export default function SearchBar({
  fromLocation,
  toLocation,
  selectedType,
  onSelectedTypeChange,
  onLocationSelect,
  onSwap,
}: SearchBarProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const inputFromRef = useRef<HTMLInputElement>(null);
  const inputToRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line
  const autocompleteFromRef = useRef<any>(null);
  // eslint-disable-next-line
  const autocompleteToRef = useRef<any>(null);
  
  // Store callbacks in refs to avoid effect re-runs
  const onLocationSelectRef = useRef(onLocationSelect);
  const onSelectedTypeChangeRef = useRef(onSelectedTypeChange);
  
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    onSelectedTypeChangeRef.current = onSelectedTypeChange;
  });

  // Track if autocomplete has been initialized
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !inputFromRef.current || !inputToRef.current) return;
    
    // Prevent re-initialization on re-renders
    if (initializedRef.current) return;
    initializedRef.current = true;

    const bounds = new google.maps.LatLngBounds(
      { lat: 37.7, lng: -79.0 },
      { lat: 38.2, lng: -78.0 }
    );

    const options = {
      bounds: bounds,
      strictBounds: true,
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'geometry', 'name', 'formatted_address'],
    };

    autocompleteFromRef.current = new google.maps.places.Autocomplete(inputFromRef.current, options);
    autocompleteToRef.current = new google.maps.places.Autocomplete(inputToRef.current, options);

    const handleFromPlaceChanged = () => {
      const place = autocompleteFromRef.current?.getPlace();
      if (place?.geometry?.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || place.formatted_address || 'From location',
          displayName: place.formatted_address,
        };
        // Cache the selected place
        const cacheKey = `from_${place.place_id}`;
        savePlaceToCache(cacheKey, {
          description: place.formatted_address || place.name || '',
          placeId: place.place_id,
          location,
        });
        // Cache by address too
        const addressKey = `addr_${(place.formatted_address || '').toLowerCase().replace(/\s+/g, '_').substring(0, 50)}`;
        savePlaceToCache(addressKey, {
          description: place.formatted_address || place.name || '',
          placeId: place.place_id,
          location,
        });
        onLocationSelectRef.current(location, 'from');
        onSelectedTypeChangeRef.current('to');
      }
    };

    const handleToPlaceChanged = () => {
      const place = autocompleteToRef.current?.getPlace();
      if (place?.geometry?.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || place.formatted_address || 'To location',
          displayName: place.formatted_address,
        };
        // Cache the selected place
        const cacheKey = `to_${place.place_id}`;
        savePlaceToCache(cacheKey, {
          description: place.formatted_address || place.name || '',
          placeId: place.place_id,
          location,
        });
        // Cache by address too
        const addressKey = `addr_${(place.formatted_address || '').toLowerCase().replace(/\s+/g, '_').substring(0, 50)}`;
        savePlaceToCache(addressKey, {
          description: place.formatted_address || place.name || '',
          placeId: place.place_id,
          location,
        });
        onLocationSelectRef.current(location, 'to');
        onSelectedTypeChangeRef.current(null);
      }
    };

    autocompleteFromRef.current.addListener('place_changed', handleFromPlaceChanged);
    autocompleteToRef.current.addListener('place_changed', handleToPlaceChanged);

    return () => {
      if (autocompleteFromRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteFromRef.current);
      }
      if (autocompleteToRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteToRef.current);
      }
    };
  }, [isLoaded]);

  const handleDotClick = (type: 'from' | 'to') => {
    onSelectedTypeChange(selectedType === type ? null : type);
  };

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-4">
        <p className="text-red-500">Error loading Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-xl mx-auto flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-uva-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-3 w-full max-w-xl mx-auto">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => handleDotClick('from')}
            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer touch-manipulation ${
              selectedType === 'from' 
                ? 'bg-uva-accent border-uva-accent scale-110 shadow-lg ring-2 ring-uva-accent ring-offset-1' 
                : fromLocation
                  ? 'bg-uva-accent border-uva-accent'
                  : 'bg-white border-slate-300'
            }`}
          />
          <div className="w-0.5 h-6 sm:h-8 bg-slate-300" />
          <button
            type="button"
            onClick={() => handleDotClick('to')}
            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer touch-manipulation ${
              selectedType === 'to' 
                ? 'bg-eco-red border-eco-red scale-110 shadow-lg ring-2 ring-eco-red ring-offset-1' 
                : toLocation
                  ? 'bg-eco-red border-eco-red'
                  : 'bg-white border-slate-300'
            }`}
          />
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputFromRef}
            type="text"
            placeholder="From: University, address..."
            defaultValue={fromLocation?.displayName || ''}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-all ${
              selectedType === 'from' 
                ? 'border-uva-accent bg-uva-accent/10' 
                : 'border-slate-200 bg-white'
            }`}
            onFocus={() => onSelectedTypeChange('from')}
          />
          <input
            ref={inputToRef}
            type="text"
            placeholder="To: Where are you going?"
            defaultValue={toLocation?.displayName || ''}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-all ${
              selectedType === 'to' 
                ? 'border-eco-red bg-eco-red/10' 
                : 'border-slate-200 bg-white'
            }`}
            onFocus={() => onSelectedTypeChange('to')}
          />
        </div>
        <button
          onClick={onSwap}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          title="Swap locations"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {selectedType && (
        <div className={`text-xs font-medium px-2 py-1.5 rounded-lg mt-2 ${
          selectedType === 'from' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
        }`}>
          📍 {selectedType === 'from' ? 'Enter starting point' : 'Enter destination'}
        </div>
      )}
    </div>
  );
}
