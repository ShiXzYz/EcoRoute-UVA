'use client';

import { ModeResult } from '@/types';

interface ModeCardProps {
  mode: ModeResult;
  isSelected: boolean;
  onSelect: () => void;
  onLogTrip: () => void;
}

/**
 * Tailwind color class based on emissions intensity
 */
function getEmissionColor(gCO2e: number): string {
  if (gCO2e < 100) return 'text-green-600';
  if (gCO2e < 500) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * ModeCard — Single transportation option in GPS page
 * 
 * Displays:
 * - Mode icon + name with timing (e.g., "UTS Bus — Departs in 5 min (14:30)")
 * - Emissions in grams CO₂e
 * - Trip duration and user cost
 * - "Recommended" badge if lowest-emissions option
 * - "I took this route" button for trip logging
 */
export default function ModeCard({
  mode,
  isSelected,
  onSelect,
  onLogTrip,
}: ModeCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      } ${mode.recommended ? 'ring-2 ring-green-300' : ''}`}
    >
      {/* Header: Mode name + recommended badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-900">{mode.label}</p>
          {/* Show transit departure timing if available */}
          {mode.minutesUntilDeparture !== undefined && mode.nextDepartureTime && (
            <p className="text-xs text-amber-700 font-semibold mt-1">
              ⏱️ Next departure: {mode.nextDepartureTime} ({mode.minutesUntilDeparture} min)
            </p>
          )}
        </div>
        {mode.recommended && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2">
            ✓ Recommended
          </span>
        )}
      </div>

      {/* Emissions, Time, Cost row */}
      <div className="grid grid-cols-3 gap-3 pb-3 border-b border-slate-200">
        <div>
          <p className="text-xs text-slate-600 font-medium">CO₂</p>
          <p className={`text-lg font-bold ${getEmissionColor(mode.gCO2e)}`}>
            {mode.gCO2e.toLocaleString()}g
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-600 font-medium">Time</p>
          <p className="text-lg font-bold text-slate-900">{mode.timeMin}</p>
          <p className="text-xs text-slate-600">min</p>
        </div>
        <div>
          <p className="text-xs text-slate-600 font-medium">Cost</p>
          <p className="text-lg font-bold text-slate-900">
            {mode.costUSD === 0 ? 'Free' : `$${mode.costUSD}`}
          </p>
        </div>
      </div>

      {/* Log Trip Button (only shown when selected) */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogTrip();
          }}
          className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          ✓ I took this route
        </button>
      )}
    </div>
  );
}
