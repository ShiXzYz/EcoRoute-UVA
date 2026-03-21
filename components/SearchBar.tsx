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
  selectedType: 'from' | 'to' | null;
  onSelectedTypeChange: (type: 'from' | 'to' | null) => void;
  onFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwap: () => void;
  onSearch: () => void;
}

export default function SearchBar({
  fromLocation,
  toLocation,
  selectedType,
  onSelectedTypeChange,
  onFromChange,
  onToChange,
  onSwap,
  onSearch,
}: SearchBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-3 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-2">
        {/* From/To with clickable dots */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-1">
            {/* From dot - clickable */}
            <button
              type="button"
              onClick={() => onSelectedTypeChange(selectedType === 'from' ? null : 'from')}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer touch-manipulation active:scale-110 ${
                selectedType === 'from' 
                  ? 'bg-uva-accent border-uva-accent scale-110 shadow-lg ring-2 ring-uva-accent ring-offset-1' 
                  : fromLocation
                    ? 'bg-uva-accent border-uva-accent'
                    : 'bg-white border-slate-300 active:border-uva-accent'
              }`}
            />
            <div className="w-0.5 h-6 sm:h-8 bg-slate-300" />
            {/* To dot - clickable */}
            <button
              type="button"
              onClick={() => onSelectedTypeChange(selectedType === 'to' ? null : 'to')}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer touch-manipulation active:scale-110 ${
                selectedType === 'to' 
                  ? 'bg-eco-red border-eco-red scale-110 shadow-lg ring-2 ring-eco-red ring-offset-1' 
                  : toLocation
                    ? 'bg-eco-red border-eco-red'
                    : 'bg-white border-slate-300 active:border-eco-red'
              }`}
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Start location"
              value={fromLocation?.name || ''}
              onChange={onFromChange}
              onFocus={() => onSelectedTypeChange('from')}
              readOnly
              className={`w-full px-2 sm:px-3 py-2 sm:py-2.5 text-sm border rounded-lg transition-all cursor-pointer touch-manipulation ${
                selectedType === 'from' 
                  ? 'border-uva-accent ring-2 ring-uva-accent ring-opacity-30 bg-blue-50' 
                  : 'border-slate-200 bg-white'
              }`}
            />
            <input
              type="text"
              placeholder="End location"
              value={toLocation?.name || ''}
              onChange={onToChange}
              onFocus={() => onSelectedTypeChange('to')}
              readOnly
              className={`w-full px-2 sm:px-3 py-2 sm:py-2.5 text-sm border rounded-lg transition-all cursor-pointer mt-1 sm:mt-2 touch-manipulation ${
                selectedType === 'to' 
                  ? 'border-eco-red ring-2 ring-eco-red ring-opacity-30 bg-red-50' 
                  : 'border-slate-200 bg-white'
              }`}
            />
          </div>
          <button
            onClick={onSwap}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
            title="Swap locations"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Selection indicator */}
        {selectedType && (
          <div className={`text-xs font-medium px-2 sm:px-3 py-1.5 rounded-lg ${
            selectedType === 'from' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {selectedType === 'from' ? '📍 Tap map to set start' : '📍 Tap map to set destination'}
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={onSearch}
          disabled={!fromLocation || !toLocation}
          className="w-full bg-uva-accent hover:bg-opacity-90 disabled:bg-slate-300 text-white font-medium py-2 sm:py-2.5 px-4 rounded-lg transition-colors touch-manipulation"
        >
          Find Routes
        </button>
      </div>
    </div>
  );
}
