'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
}

const GREEN_MODES = ['uts_bus', 'cat_bus', 'connect_bus', 'bike', 'ebike', 'walk', 'escooter'];
const CAR_MODE = 'solo_car';

function loadStats(): Stats {
  if (typeof window === 'undefined') {
    return { totalGSaved: 0, totalMiles: 0, totalTrips: 0, modeBreakdown: {}, weeklyGSaved: 0, weeklyTrips: 0 };
  }
  
  const saved = localStorage.getItem('ecoroute_trips');
  if (!saved) {
    return { totalGSaved: 0, totalMiles: 0, totalTrips: 0, modeBreakdown: {}, weeklyGSaved: 0, weeklyTrips: 0 };
  }

  const trips: TripLog[] = JSON.parse(saved);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let totalGSaved = 0;
  let totalMiles = 0;
  let totalTrips = trips.length;
  let modeBreakdown: Record<string, number> = {};
  let weeklyGSaved = 0;
  let weeklyTrips = 0;

  const carTrips: TripLog[] = [];

  trips.forEach(trip => {
    totalMiles += trip.distanceMiles;
    modeBreakdown[trip.mode] = (modeBreakdown[trip.mode] || 0) + 1;
    
    if (trip.mode === CAR_MODE) {
      carTrips.push(trip);
    } else {
      totalGSaved += trip.gCO2e;
    }

    const tripDate = new Date(trip.date);
    if (tripDate >= weekAgo) {
      weeklyTrips++;
      if (trip.mode !== CAR_MODE) {
        weeklyGSaved += trip.gCO2e;
      }
    }
  });

  return { totalGSaved, totalMiles, totalTrips, modeBreakdown, weeklyGSaved, weeklyTrips };
}

function calculateStreak(trips: TripLog[]): StreakData {
  if (trips.length === 0) {
    return { current: 0, longest: 0, lastTripDate: null, badgeUnlocked: false };
  }

  const sortedTrips = [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const greenTripDates = new Set<string>();
  sortedTrips.forEach(trip => {
    if (GREEN_MODES.includes(trip.mode)) {
      const date = new Date(trip.date).toDateString();
      greenTripDates.add(date);
    }
  });

  const sortedDates = Array.from(greenTripDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let today = new Date().toDateString();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (sortedDates[0] === today || sortedDates[0] === yesterdayStr) {
    tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        break;
      }
    }
    currentStreak = tempStreak;
  }

  tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastTripDate: sortedDates[0] || null,
    badgeUnlocked: currentStreak >= 7,
  };
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats>({ totalGSaved: 0, totalMiles: 0, totalTrips: 0, modeBreakdown: {}, weeklyGSaved: 0, weeklyTrips: 0 });
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, lastTripDate: null, badgeUnlocked: false });

  useEffect(() => {
    const loadedStats = loadStats();
    setStats(loadedStats);

    const saved = localStorage.getItem('ecoroute_trips');
    const trips: TripLog[] = saved ? JSON.parse(saved) : [];
    setStreak(calculateStreak(trips));
  }, []);

  const weeklyKgSaved = stats.weeklyGSaved / 1000;
  const annualKgSaved = weeklyKgSaved * 52;
  const treesEquivalent = annualKgSaved / 60;

  const milesAvoided = stats.totalMiles * 0.3;
  const gasSaved = (milesAvoided / 28) * 3.5;

  const uvtTrips = (stats.modeBreakdown['uts_bus'] || 0) + (stats.modeBreakdown['cat_bus'] || 0) + (stats.modeBreakdown['connect_bus'] || 0);
  const bikeTrips = (stats.modeBreakdown['bike'] || 0) + (stats.modeBreakdown['ebike'] || 0);
  const walkTrips = stats.modeBreakdown['walk'] || 0;

  const uva2030GoalKg = 50000;
  const progressPercent = Math.min((stats.totalGSaved / uva2030GoalKg) * 100, 100);

  return (
    <div className="h-screen bg-slate-50 pb-20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-uva-primary text-white px-4 py-6 flex-shrink-0">
        <h1 className="text-2xl font-bold">Your Impact</h1>
        <p className="text-uva-accent text-sm">Track your environmental contribution</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🌳</span>
            <div>
              <h2 className="text-lg font-semibold">CO₂ to Trees</h2>
              <p className="text-sm text-green-100">Annual impact projection</p>
            </div>
          </div>
          <p className="text-3xl font-bold">{treesEquivalent.toFixed(2)}</p>
          <p className="text-sm text-green-100 mt-1">
            {weeklyKgSaved.toFixed(1)} kg saved this week ≈ {treesEquivalent.toFixed(1)} trees grown per year
          </p>
          <p className="text-xs text-green-200 mt-2">
            Based on EPA: One urban tree absorbs ~60 kg CO₂/year
          </p>
        </div>

        {/* Gas Savings */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💰</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Gas Savings</h2>
              <p className="text-sm text-slate-500">Estimated money saved</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">${gasSaved.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">
            saved on gas based on {(milesAvoided).toFixed(1)} miles avoided
          </p>
        </div>

        {/* Mode Breakdown */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🚌🚴</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Mode Breakdown</h2>
              <p className="text-sm text-slate-500">All time trips by mode</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">🚌 Bus Rides</span>
              <span className="font-semibold text-slate-800">{uvtTrips} trips</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">🚴 Bike/E-bike</span>
              <span className="font-semibold text-slate-800">{bikeTrips} trips</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">🚶 Walking</span>
              <span className="font-semibold text-slate-800">{walkTrips} trips</span>
            </div>
          </div>
        </div>

        {/* 2030 Progress */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">📈</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">2030 Progress</h2>
              <p className="text-sm text-slate-500">UVA Carbon Neutrality Goal</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 mb-2">
            <div 
              className="bg-gradient-to-r from-uva-primary to-uva-accent h-4 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{(stats.totalGSaved / 1000).toFixed(1)} kg</span> of your contribution
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Goal: 50,000 kg (UVA&apos;s annual reduction target per student)
          </p>
        </div>

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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 z-[90]">
        <Link href="/" className="flex flex-col items-center py-2 px-4 text-uva-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-xs mt-1 font-medium">Map</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center py-2 px-4 text-uva-accent">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Stats</span>
        </Link>
      </nav>
    </div>
  );
}
