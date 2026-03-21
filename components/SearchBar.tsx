'use client';

import { useState, useEffect, useRef } from 'react';

interface Location {
  lat: number;
  lng: number;
  name: string;
  displayName?: string;
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
  const [queryFrom, setQueryFrom] = useState('');
  const [queryTo, setQueryTo] = useState('');
  const [suggestionsFrom, setSuggestionsFrom] = useState<Location[]>([]);
  const [suggestionsTo, setSuggestionsTo] = useState<Location[]>([]);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceFrom = useRef<NodeJS.Timeout>();
  const debounceTo = useRef<NodeJS.Timeout>();
  const inputFromRef = useRef<HTMLInputElement>(null);
  const inputToRef = useRef<HTMLInputElement>(null);
  
  // Cache to reduce API calls
  const cache = useRef<Map<string, Location[]>>(new Map());
  
  // Rate limiting
  const lastSearchTime = useRef<number>(0);
  const MIN_SEARCH_INTERVAL = 300; // ms between searches

  const searchPlaces = async (query: string, setSuggestions: (locs: Location[]) => void) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (cache.current.has(cacheKey)) {
      setSuggestions(cache.current.get(cacheKey)!);
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastSearchTime.current < MIN_SEARCH_INTERVAL) {
      return;
    }
    lastSearchTime.current = now;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/places?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      if (data.results) {
        const results = data.results.slice(0, 5).map((place: any) => ({
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          name: place.name,
          displayName: place.formatted_address,
        }));
        // Cache results
        cache.current.set(cacheKey, results);
        // Limit cache size
        if (cache.current.size > 50) {
          const firstKey = cache.current.keys().next().value;
          if (firstKey) cache.current.delete(firstKey);
        }
        setSuggestions(results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFromChange = (value: string) => {
    setQueryFrom(value);
    setShowFrom(true);
    clearTimeout(debounceFrom.current);
    debounceFrom.current = setTimeout(() => {
      searchPlaces(value, setSuggestionsFrom);
    }, 300);
  };

  const handleToChange = (value: string) => {
    setQueryTo(value);
    setShowTo(true);
    clearTimeout(debounceTo.current);
    debounceTo.current = setTimeout(() => {
      searchPlaces(value, setSuggestionsTo);
    }, 300);
  };

  const handleSelectFrom = (location: Location) => {
    onLocationSelect(location, 'from');
    setQueryFrom(location.displayName || location.name);
    setSuggestionsFrom([]);
    setShowFrom(false);
    onSelectedTypeChange('to');
  };

  const handleSelectTo = (location: Location) => {
    onLocationSelect(location, 'to');
    setQueryTo(location.displayName || location.name);
    setSuggestionsTo([]);
    setShowTo(false);
    onSelectedTypeChange(null);
  };

  const handleDotClick = (type: 'from' | 'to') => {
    onSelectedTypeChange(selectedType === type ? null : type);
  };

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
          <div className="relative">
            <input
              ref={inputFromRef}
              type="text"
              placeholder="From: University, address..."
              value={queryFrom}
              onChange={(e) => handleFromChange(e.target.value)}
              onFocus={() => { onSelectedTypeChange('from'); setShowFrom(true); }}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-all ${
                selectedType === 'from' 
                  ? 'border-uva-accent bg-blue-50' 
                  : 'border-slate-200 bg-white'
              }`}
            />
            {showFrom && suggestionsFrom.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-50">
                {suggestionsFrom.map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectFrom(loc)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="font-medium text-slate-900 text-sm">{loc.name}</div>
                    <div className="text-xs text-slate-500 truncate">{loc.displayName}</div>
                  </button>
                ))}
              </div>
            )}
            {isSearching && showFrom && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-uva-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="relative">
            <input
              ref={inputToRef}
              type="text"
              placeholder="To: Where are you going?"
              value={queryTo}
              onChange={(e) => handleToChange(e.target.value)}
              onFocus={() => { onSelectedTypeChange('to'); setShowTo(true); }}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-all ${
                selectedType === 'to' 
                  ? 'border-eco-red bg-red-50' 
                  : 'border-slate-200 bg-white'
              }`}
            />
            {showTo && suggestionsTo.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-50">
                {suggestionsTo.map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectTo(loc)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="font-medium text-slate-900 text-sm">{loc.name}</div>
                    <div className="text-xs text-slate-500 truncate">{loc.displayName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
