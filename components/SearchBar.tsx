'use client';

import { useState } from 'react';

interface Location {
  lat: number;
  lng: number;
  name: string;
}

interface SearchBarProps {
  fromLocation: Location | null;
  toLocation: Location | null;
  onFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwap: () => void;
  onSearch: () => void;
}

export default function SearchBar({
  fromLocation,
  toLocation,
  onFromChange,
  onToChange,
  onSwap,
  onSearch,
}: SearchBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-3 w-full max-w-xl">
      <div className="flex flex-col gap-2">
        {/* From Input */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-uva-accent border-2 border-white shadow" />
            <div className="w-0.5 h-8 bg-slate-300" />
            <div className="w-3 h-3 rounded-full bg-eco-red border-2 border-white shadow" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Choose starting point"
              value={fromLocation?.name || ''}
              onChange={onFromChange}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-uva-accent focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Choose destination"
              value={toLocation?.name || ''}
              onChange={onToChange}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-uva-accent focus:border-transparent mt-2"
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

        {/* Search Button */}
        <button
          onClick={onSearch}
          disabled={!fromLocation || !toLocation}
          className="w-full bg-uva-accent hover:bg-opacity-90 disabled:bg-slate-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          Find Routes
        </button>
      </div>
    </div>
  );
}
