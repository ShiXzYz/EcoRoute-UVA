'use client';

interface ModeScore {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  icon: string;
  color: string;
  warning?: string;
}

interface ModeCardProps {
  mode: ModeScore;
  isSelected: boolean;
  baseline: number;
  onSelect: () => void;
  onLogTrip: () => void;
}

function getEmissionColor(gCO2e: number, baseline: number): string {
  const percent = (gCO2e / baseline) * 100;
  if (percent <= 20) return 'text-green-600';
  if (percent <= 50) return 'text-emerald-600';
  if (percent <= 75) return 'text-amber-600';
  return 'text-red-600';
}

function getEmissionLabel(gCO2e: number, baseline: number): string {
  if (gCO2e === 0) return 'Zero emissions';
  const percent = Math.round((gCO2e / baseline) * 100);
  return `${percent}% of driving solo`;
}

function calculateTreesNeeded(gCO2e: number): number {
  // Average tree absorbs ~21.77 kg CO2 per year
  // For a single trip, we calculate: grams / (21.77kg * 1000) = trees needed per trip
  return Math.max(0, Math.round((gCO2e / 1000) / 21.77 * 100) / 100);
}

function calculateTreesSaved(baselineGCO2e: number, modeGCO2e: number): number {
  const savings = baselineGCO2e - modeGCO2e;
  return Math.max(0, Math.round((savings / 1000) / 21.77 * 100) / 100);
}

export default function ModeCard({
  mode,
  isSelected,
  baseline,
  onSelect,
  onLogTrip,
}: ModeCardProps) {
  const treesSaved = calculateTreesSaved(baseline, mode.gCO2e);
  const soloCarTrees = calculateTreesNeeded(baseline);
  
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      } ${mode.recommended && !isSelected ? 'ring-2 ring-green-200' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mode.icon}</span>
          <div>
            <p className="font-semibold text-slate-900">{mode.label}</p>
            {mode.warning && (
              <p className="text-xs text-amber-600 font-medium">⚠️ {mode.warning}</p>
            )}
          </div>
        </div>
        {mode.recommended && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            ✓ Best
          </span>
        )}
      </div>

      {/* Emissions & Details */}
      <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-slate-200">
        <div>
          <p className="text-xs text-slate-600 font-medium">CO₂</p>
          <p className={`text-lg font-bold ${getEmissionColor(mode.gCO2e, baseline)}`}>
            {mode.gCO2e.toLocaleString()}g
          </p>
          <p className="text-xs text-slate-600">{getEmissionLabel(mode.gCO2e, baseline)}</p>
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
          <p className="text-xs text-slate-600">&nbsp;</p>
        </div>
      </div>

      {/* Tree Impact */}
      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">🌱 Impact:</span> You saved <span className="font-bold text-green-600">{treesSaved} trees</span> vs driving solo!
        </p>
        <p className="text-xs text-slate-600 mt-1">
          (Solo car: ~{soloCarTrees} trees needed to offset)
        </p>
      </div>

      {/* Log Trip Button */}
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
