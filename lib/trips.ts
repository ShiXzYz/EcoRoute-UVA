import { supabase } from './supabase';

export interface TripLog {
  mode: string;
  gCO2e: number;
  distanceMiles: number;
  date: string;
  synced?: boolean;
}

interface SupabaseTripRow {
  mode: string;
  g_co2e: number;
  distance_miles: number;
  created_at: string;
}

const TRIPS_KEY = 'ecoroute_trips';

export function loadTrips(): TripLog[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(TRIPS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveTrips(trips: TripLog[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export function addTrip(trip: Omit<TripLog, 'synced'>) {
  const trips = loadTrips();
  trips.push({ ...trip, synced: false });
  saveTrips(trips);
  return trips;
}

export async function syncTripsToSupabase(userId: string): Promise<{ synced: number; failed: number }> {
  const trips = loadTrips();
  const unsyncedTrips = trips.filter(t => !t.synced);
  
  if (unsyncedTrips.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const trip of unsyncedTrips) {
    try {
      const { error } = await supabase.from('trips').insert({
        user_id: userId,
        mode: trip.mode,
        g_co2e: trip.gCO2e,
        distance_miles: trip.distanceMiles,
        created_at: trip.date,
      });

      if (error) {
        console.error('Failed to sync trip:', error);
        failed++;
      } else {
        trip.synced = true;
        synced++;
      }
    } catch (err) {
      console.error('Error syncing trip:', err);
      failed++;
    }
  }

  saveTrips(trips);
  return { synced, failed };
}

export async function loadTripsFromSupabase(userId: string): Promise<TripLog[]> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('mode, g_co2e, distance_miles, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading trips from Supabase:', error);
      return [];
    }

    return data.map((row: SupabaseTripRow) => ({
      mode: row.mode,
      gCO2e: row.g_co2e,
      distanceMiles: row.distance_miles,
      date: row.created_at,
      synced: true,
    }));
  } catch (err) {
    console.error('Error loading trips from Supabase:', err);
    return [];
  }
}

export async function mergeAndSaveTrips(userId: string): Promise<TripLog[]> {
  const localTrips = loadTrips();
  const supabaseTrips = await loadTripsFromSupabase(userId);
  
  const merged = [...localTrips];
  
  for (const supabaseTrip of supabaseTrips) {
    const exists = merged.some(
      t => t.date === supabaseTrip.date && t.mode === supabaseTrip.mode && t.distanceMiles === supabaseTrip.distanceMiles
    );
    if (!exists) {
      merged.push(supabaseTrip);
    }
  }
  
  merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  saveTrips(merged);
  return merged;
}

export async function saveTripToSupabase(userId: string, trip: Omit<TripLog, 'synced'>): Promise<boolean> {
  try {
    const { error } = await supabase.from('trips').insert({
      user_id: userId,
      mode: trip.mode,
      g_co2e: trip.gCO2e,
      distance_miles: trip.distanceMiles,
      created_at: trip.date,
    });

    if (error) {
      console.error('Failed to save trip to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving trip to Supabase:', err);
    return false;
  }
}
