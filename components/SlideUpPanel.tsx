'use client';

import { useState, useRef } from 'react';
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

const SNAP_HEIGHTS = {
  closed: 0,
  small: typeof window !== 'undefined' ? window.innerHeight * 0.2 : 200,
  large: typeof window !== 'undefined' ? window.innerHeight * 0.85 : 600,
};

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
  const [currentHeight, setCurrentHeight] = useState(SNAP_HEIGHTS.small);
  const [expanded, setExpanded] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const isDragging = useRef(false);

  const handleModeSelect = (mode: ModeScore) => {
    onSelect(mode.mode);
  };

  const savings = baseline - (selectedMode ? modes.find(m => m.mode === selectedMode)?.gCO2e || 0 : 0);
  const savingsPercent = selectedMode && baseline > 0 
    ? Math.round((savings / baseline) * 100) 
    : 0;

  const snapToPosition = (newHeight: number) => {
    const windowHeight = window.innerHeight;
    const snapSmall = windowHeight * 0.2;
    const snapLarge = windowHeight * 0.8;
    
    if (newHeight < snapSmall * 0.6) {
      setCurrentHeight(0);
      setTimeout(onClose, 300);
    } else if (newHeight < snapSmall + (snapLarge - snapSmall) * 0.4) {
      setCurrentHeight(snapSmall);
      setExpanded(false);
    } else {
      setCurrentHeight(snapLarge);
      setExpanded(true);
    }
  };

  const handleDragStart = (clientY: number) => {
    isDragging.current = true;
    startY.current = clientY;
    startHeight.current = currentHeight;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging.current) return;
    const delta = startY.current - clientY;
    const newHeight = Math.min(Math.max(startHeight.current + delta, 0), window.innerHeight * 0.95);
    setCurrentHeight(newHeight);
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    snapToPosition(currentHeight);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: `${currentHeight}px`,
        transition: isDragging.current ? 'none' : 'height 0.3s ease-out',
      }}
    >
      <div className="h-full bg-white rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Drag Handle */}
        <div 
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => {
            if (isDragging.current) handleDragMove(e.clientY);
          }}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => {
            if (isDragging.current) handleDragEnd();
          }}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => {
            if (isDragging.current) {
              e.preventDefault();
              handleDragMove(e.touches[0].clientY);
            }
          }}
          onTouchEnd={handleDragEnd}
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

        {/* Content - Scrollable */}
        <div className="overflow-y-auto h-full px-5 py-4">
          {modes.length > 0 ? (
            <div className="space-y-3">
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
    </div>
  );
}
