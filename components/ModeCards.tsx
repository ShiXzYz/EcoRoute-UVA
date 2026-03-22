'use client';

import ModeCard from './ModeCard';

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

interface ModeCardsProps {
  modes: ModeScore[];
  selectedMode: string | null;
  baseline: number;
  distance: number;
  onSelect: (mode: string) => void;
  onLogTrip: (mode: string, gCO2e: number) => void;
}

export default function ModeCards({
  modes,
  selectedMode,
  baseline,
  distance,
  onSelect,
  onLogTrip,
}: ModeCardsProps) {
  const handleModeSelect = (mode: ModeScore) => {
    onSelect(mode.mode);
  };

  const savings = baseline - (selectedMode ? modes.find(m => m.mode === selectedMode)?.gCO2e || 0 : 0);
  const savingsPercent = selectedMode && baseline > 0 
    ? Math.round((savings / baseline) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Savings Summary */}
      {selectedMode && savings > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Saving vs. driving solo</p>
              <p className="text-2xl font-bold text-green-600">{savings.toLocaleString()} g CO₂</p>
              <p className="text-xs text-slate-600 mt-1">{savingsPercent}% cleaner</p>
            </div>
            <div className="text-3xl">🌱</div>
          </div>
        </div>
      )}

      {/* Mode Cards */}
      <div className="space-y-3">
        {modes.map((mode) => (
          <ModeCard
            key={mode.mode}
            mode={mode}
            isSelected={selectedMode === mode.mode}
            onSelect={() => handleModeSelect(mode)}
            onLogTrip={() => onLogTrip(mode.mode, mode.gCO2e)}
          />
        ))}
      </div>

      {/* Bottom Info */}
      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
        <p>
          <strong>Why these defaults?</strong> The greenest option is pre-selected based on verified EPA emission
          factors. All options are available — just tap to switch.
        </p>
      </div>
    </div>
  );
}
