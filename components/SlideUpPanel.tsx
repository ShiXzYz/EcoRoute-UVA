'use client';

import { useState, useEffect } from 'react';
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

interface SlideUpPanelProps {
  modes: ModeScore[];
  selectedMode: string | null;
  baseline: number;
  distance: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: string) => void;
  onLogTrip: (mode: string, gCO2e: number) => void;
}

export default function SlideUpPanel({
  modes,
  selectedMode,
  baseline,
  distance,
  isOpen,
  onClose,
  onSelect,
  onLogTrip,
}: SlideUpPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    if (isOpen) {
      setExpanded(true);
    }
  }, [isOpen]);

  const handleModeSelect = (mode: ModeScore) => {
    onSelect(mode.mode);
  };

  const savings = baseline - (selectedMode ? modes.find(m => m.mode === selectedMode)?.gCO2e || 0 : 0);
  const savingsPercent = selectedMode && baseline > 0 
    ? Math.round((savings / baseline) * 100) 
    : 0;

  if (!isOpen && !expanded) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out z-50 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ maxHeight: expanded ? '85vh' : '300px' }}
    >
      {/* Drag Handle */}
      <div 
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          const startY = e.clientY;
          const startHeight = height;
          
          const handleMouseMove = (e: MouseEvent) => {
            const delta = startY - e.clientY;
            const newHeight = Math.min(Math.max(startHeight + delta, 200), window.innerHeight * 0.85);
            setHeight(newHeight);
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (height < 250) {
              onClose();
            }
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {modes.length > 0 ? `${modes.length} routes found` : 'Select a route'}
            </h2>
            <p className="text-sm text-slate-500">{distance.toFixed(1)} miles</p>
          </div>
          {selectedMode && savings > 0 && (
            <div className="bg-green-50 px-3 py-1.5 rounded-full">
              <span className="text-green-600 font-medium text-sm">
                Save {savingsPercent}% CO₂
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        className="overflow-y-auto px-5 py-4"
        style={{ maxHeight: `calc(${height}px - 100px)` }}
      >
        {modes.length > 0 ? (
          <div className="space-y-3 pb-4">
            {modes.map((mode) => (
              <ModeCard
                key={mode.mode}
                mode={mode}
                isSelected={selectedMode === mode.mode}
                baseline={baseline}
                onSelect={() => handleModeSelect(mode)}
                onLogTrip={() => onLogTrip(mode.mode, mode.gCO2e)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No routes found. Try different locations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
