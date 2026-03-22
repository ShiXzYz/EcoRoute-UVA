'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import UVAProgress from '@/components/UVAProgress';

interface TripLog {
  mode: string;
  gCO2e: number;
  distanceMiles: number;
  date: string;
}

interface StreakData {
  current: number;
  longest: number;
  lastTripDate: string | null;
  badgeUnlocked: boolean;
}

interface Stats {
  totalGSaved: number;
  totalMiles: number;
  totalTrips: number;
  modeBreakdown: Record<string, number>;
  weeklyGSaved: number;
  weeklyTrips: number;
  weeklyModeBreakdown: Record<string, number>;
  greenMiles: number;
}

const GREEN_MODES = ['uts_bus', 'cat_bus', 'connect_bus', 'bike', 'ebike', 'walk'];

function loadTrips(): TripLog[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('ecoroute_trips');
  return saved ? JSON.parse(saved) : [];
}

function saveTrips(trips: TripLog[]) {
  localStorage.setItem('ecoroute_trips', JSON.stringify(trips));
}

function calculateStats(trips: TripLog[]): Stats {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let totalGSaved = 0;
  let totalMiles = 0;
  let greenMiles = 0;
  let totalTrips = trips.length;
  let modeBreakdown: Record<string, number> = {};
  let weeklyGSaved = 0;
  let weeklyTrips = 0;
  let weeklyModeBreakdown: Record<string, number> = {};

  trips.forEach(trip => {
    totalMiles += trip.distanceMiles;
    modeBreakdown[trip.mode] = (modeBreakdown[trip.mode] || 0) + 1;
    
    // Track green mode miles for gas savings calculation
    if (GREEN_MODES.includes(trip.mode)) {
      greenMiles += trip.distanceMiles;
    }
    
    // gCO2e now stores co2Saved (CO2 saved vs driving solo)
    // solo_car trips have co2Saved = 0
    totalGSaved += trip.gCO2e;

    const tripDate = new Date(trip.date);
    if (tripDate >= weekAgo) {
      weeklyTrips++;
      weeklyModeBreakdown[trip.mode] = (weeklyModeBreakdown[trip.mode] || 0) + 1;
      weeklyGSaved += trip.gCO2e;
    }
  });

  return { totalGSaved, totalMiles, totalTrips, modeBreakdown, weeklyGSaved, weeklyTrips, weeklyModeBreakdown, greenMiles };
}

function calculateStreak(trips: TripLog[]): StreakData {
  // Get green trips only
  const greenTrips = trips.filter(trip => GREEN_MODES.includes(trip.mode));
  
  if (greenTrips.length === 0) {
    return { current: 0, longest: 0, lastTripDate: null, badgeUnlocked: false };
  }

  // Get unique days with green trips
  const greenDays = new Set<string>();
  greenTrips.forEach(trip => {
    const date = new Date(trip.date).toDateString();
    greenDays.add(date);
  });

  // Sort days from newest to oldest
  const sortedDays = Array.from(greenDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  let currentStreak = 0;
  let longestStreak = 0;
  
  // Check if most recent green trip was today or yesterday
  const mostRecentDay = sortedDays[0];
  if (mostRecentDay === today || mostRecentDay === yesterdayStr) {
    // Count consecutive days
    let checkDate = new Date(mostRecentDay);
    for (const day of sortedDays) {
      const dayDate = new Date(day);
      const expectedPrevDay = new Date(checkDate);
      expectedPrevDay.setDate(expectedPrevDay.getDate() - 1);
      
      if (dayDate.toDateString() === checkDate.toDateString()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak (from all data)
  let tempStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  // Reset streak if last green trip was more than 1 day ago
  if (mostRecentDay !== today && mostRecentDay !== yesterdayStr) {
    currentStreak = 0;
  }

  return {
    current: currentStreak,
    longest: longestStreak,
    lastTripDate: mostRecentDay,
    badgeUnlocked: currentStreak >= 7,
  };
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats>({ totalGSaved: 0, totalMiles: 0, totalTrips: 0, modeBreakdown: {}, weeklyGSaved: 0, weeklyTrips: 0, weeklyModeBreakdown: {}, greenMiles: 0 });
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, lastTripDate: null, badgeUnlocked: false });

  const loadData = useCallback(() => {
    const trips = loadTrips();
    setStats(calculateStats(trips));
    setStreak(calculateStreak(trips));
  }, []);

  useEffect(() => {
    loadData();
    
    // Listen for storage changes (from other tabs/windows)
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    
    // Poll for changes every second
    const interval = setInterval(loadData, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [loadData]);

  const weeklyKgSaved = stats.weeklyGSaved / 1000;
  const annualKgSaved = weeklyKgSaved * 52;
  const treesEquivalent = annualKgSaved / 60;

  const milesAvoided = stats.greenMiles;
  const gasSaved = (milesAvoided / 28) * 3.5;

  const uva2030GoalKg = 50000;
  const progressPercent = Math.min((stats.totalGSaved / uva2030GoalKg) * 100, 100);

  return (
    <div className="h-screen bg-slate-50 pb-14 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-uva-primary text-white px-4 py-6 flex-shrink-0">
        <h1 className="text-2xl font-bold">Your Impact</h1>
        <p className="text-uva-accent text-sm">Track your environmental contribution</p>
      </div>

      <div 
        className="flex-1 overflow-y-auto px-4 py-6 pb-20 space-y-4"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Weekly Summary Card */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">This Week</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.weeklyTrips}</p>
              <p className="text-xs text-slate-500">Trips</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.weeklyGSaved.toFixed(0)}g</p>
              <p className="text-xs text-slate-500">CO₂ Saved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-uva-accent">{streak.current}</p>
              <p className="text-xs text-slate-500">Day Streak</p>
            </div>
          </div>
        </div>

        {/* CO₂ to Trees */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-md p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-5xl">🌳</span>
              <div>
                <p className="text-xs text-green-100 opacity-80">Annual impact</p>
                <h2 className="text-sm font-semibold text-green-100">CO₂ to Trees</h2>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-4xl font-bold">{treesEquivalent.toFixed(2)}</p>
              <p className="text-xs text-green-100">trees/year</p>
            </div>
          </div>
          <p className="text-sm text-green-100 mt-3">
            {weeklyKgSaved.toFixed(1)} kg saved this week ≈ {treesEquivalent.toFixed(1)} trees grown per year
          </p>
          <p className="text-xs text-green-200 mt-2 opacity-80">
            Based on EPA: One urban tree absorbs ~60 kg CO₂/year
          </p>
        </div>

        {/* Gas Savings */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-5xl">💰</span>
              <div>
                <p className="text-xs text-slate-500">Estimated savings</p>
                <h2 className="text-sm font-semibold text-slate-700">Gas Savings</h2>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-4xl font-bold text-green-600">${gasSaved.toFixed(2)}</p>
              <p className="text-xs text-slate-500">this week</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            saved on gas based on {(milesAvoided).toFixed(1)} miles avoided
          </p>
        </div>

        {/* Mode Breakdown - Weekly */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Trips This Week</h2>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-800">🚌 Transit</span>
              <span className="font-semibold text-slate-800">
                {(stats.weeklyModeBreakdown['uts_bus'] || 0) + 
                 (stats.weeklyModeBreakdown['cat_bus'] || 0) + 
                 (stats.weeklyModeBreakdown['connect_bus'] || 0)} trips
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-800">🚶 Walk/Bike</span>
              <span className="font-semibold text-slate-800">
                {(stats.weeklyModeBreakdown['walk'] || 0) + 
                 (stats.weeklyModeBreakdown['bike'] || 0)} trips
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-800">⚡ E-Bike/Scooter</span>
              <span className="font-semibold text-slate-800">
                {(stats.weeklyModeBreakdown['ebike'] || 0) + 
                 (stats.weeklyModeBreakdown['escooter'] || 0)} trips
              </span>
            </div>
          </div>
        </div>

        {/* UVA 2030 Progress */}
        <UVAProgress userWeeklyKgSaved={weeklyKgSaved} />

        {/* Streak Tracker */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Streak Tracker</h2>
              <p className="text-sm text-slate-500">Consecutive green days</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-4xl font-bold text-uva-primary">{streak.current}</p>
              <p className="text-sm text-slate-500">Current Streak</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-slate-700">{streak.longest}</p>
              <p className="text-xs text-slate-400">Longest: {streak.longest} days</p>
            </div>
          </div>
          {streak.badgeUnlocked ? (
            <div className="mt-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg p-3 text-center">
              <span className="text-xl">🏆</span>
              <p className="font-bold text-amber-900">Green Hoo Badge Unlocked!</p>
            </div>
          ) : (
            <div className="mt-3 bg-slate-100 rounded-lg p-3 text-center">
              <p className="text-sm text-slate-500">
                {7 - streak.current} more days until Green Hoo badge
              </p>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Green modes: bus, bike, e-bike, walk, e-scooter
          </p>
        </div>

        {/* Total Impact */}
        <div className="bg-uva-primary rounded-2xl shadow-md p-4 text-white">
          <h2 className="text-lg font-semibold mb-2">All-Time Impact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{(stats.totalGSaved / 1000).toFixed(1)} kg</p>
              <p className="text-xs text-uva-accent">CO₂ Saved</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMiles.toFixed(0)}</p>
              <p className="text-xs text-uva-accent">Miles Traveled</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTrips}</p>
              <p className="text-xs text-uva-accent">Total Trips</p>
            </div>
            <div>
              <p className="text-2xl font-bold">${(gasSaved * 52).toFixed(0)}</p>
              <p className="text-xs text-uva-accent">Est. Annual Savings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around z-[90] h-14"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Link href="/" className="flex flex-col items-center justify-center flex-1 text-slate-400 hover:text-uva-primary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-[10px] font-medium">Map</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center justify-center flex-1 text-uva-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-medium">Stats</span>
        </Link>
      </nav>
    </div>
  );
}
