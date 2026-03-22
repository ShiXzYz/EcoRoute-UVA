'use client';

import { useState, useRef, useEffect } from 'react';
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
  isExpanded: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  onSelect: (mode: string) => void;
  onLogTrip: (mode: string, gCO2e: number) => void;
}

export default function SlideUpPanel({
  modes,
  selectedMode,
  baseline,
  distance,
  isOpen,
  isExpanded,
  onClose,
  onCollapse,
  onExpand,
  onSelect,
  onLogTrip,
}: SlideUpPanelProps) {
  const [currentHeight, setCurrentHeight] = useState(600);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentHeight(isExpanded ? window.innerHeight * 0.6 : window.innerHeight * 0.15);
    }
  }, [isOpen, isExpanded]);

  const handleModeSelect = (mode: ModeScore) => {
    onSelect(mode.mode);
  };

  const savings = baseline - (selectedMode ? modes.find(m => m.mode === selectedMode)?.gCO2e || 0 : 0);
  const savingsPercent = selectedMode && baseline > 0 
    ? Math.round((savings / baseline) * 100) 
    : 0;

  const getSnapHeights = () => ({
    snapCollapsed: typeof window !== 'undefined' ? window.innerHeight * 0.12 : 100,
    snapExpanded: typeof window !== 'undefined' ? window.innerHeight * 0.6 : 450,
  });

  const snapToPosition = (newHeight: number) => {
    const { snapCollapsed, snapExpanded } = getSnapHeights();
    
    if (newHeight < snapCollapsed + (snapExpanded - snapCollapsed) * 0.4) {
      setCurrentHeight(snapCollapsed);
      onCollapse();
    } else {
      setCurrentHeight(snapExpanded);
      onExpand();
    }
  };

  const handleDragStart = (clientY: number) => {
    isDragging.current = true;
    startY.current = clientY;
    startHeight.current = currentHeight;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging.current) return;
    const delta = (startY.current - clientY) * 1.5;
    const minHeight = typeof window !== 'undefined' ? window.innerHeight * 0.08 : 60;
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 550;
    const newHeight = Math.min(Math.max(startHeight.current + delta, minHeight), maxHeight);
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
      className="fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-4"
      style={{
        height: `${currentHeight}px`,
        transition: isDragging.current ? 'none' : 'height 0.3s ease-out',
      }}
    >
      <div className="h-full bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Drag Handle */}
        <div 
          className="flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            handleDragStart(e.clientY);
            const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientY);
            const onMouseUp = () => {
              handleDragEnd();
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
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
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mt-3 mb-1" />
        </div>

        {/* Header - clickable to collapse */}
        <div 
          className="px-4 py-3 border-b border-slate-100 flex-shrink-0 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => {
            if (isExpanded) {
              setCurrentHeight(window.innerHeight * 0.15);
              onCollapse();
            } else {
              setCurrentHeight(window.innerHeight * 0.6);
              onExpand();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {modes.length > 0 ? `${modes.length} routes` : 'Select a route'}
              </h2>
              <p className="text-xs text-slate-500">{distance.toFixed(1)} miles</p>
            </div>
            {selectedMode && savings > 0 && (
              <div className="bg-green-50 px-2 py-1 rounded-full">
                <span className="text-green-600 font-medium text-xs">
                  -{savingsPercent}% CO₂
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {modes.length > 0 ? (
            <div className="space-y-2">
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
            <div className="text-center py-6 text-slate-500">
              <p className="text-sm">No routes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
