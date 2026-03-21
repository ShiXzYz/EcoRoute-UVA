import { supabase, isSupabaseConfigured } from './supabase';

const CACHE_TTL = {
  directions: 7 * 24 * 60 * 60 * 1000, // 7 days
  scores: 60 * 60 * 1000, // 1 hour
};

function roundCoord(coord: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(coord * factor) / factor;
}

export async function getCachedDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: string
): Promise<{ polyline: string; distance: number; duration: number } | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data } = await supabase
      .from('directions_cache')
      .select('polyline, distance_meters, duration_seconds')
      .eq('origin_lat', roundCoord(originLat))
      .eq('origin_lng', roundCoord(originLng))
      .eq('dest_lat', roundCoord(destLat))
      .eq('dest_lng', roundCoord(destLng))
      .eq('mode', mode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (data) {
      return {
        polyline: data.polyline,
        distance: data.distance_meters,
        duration: data.duration_seconds,
      };
    }
  } catch (error) {
    console.error('Cache read error (directions):', error);
  }

  return null;
}

export async function setCachedDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: string,
  polyline: string,
  distance: number,
  duration: number
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    await supabase
      .from('directions_cache')
      .upsert({
        origin_lat: roundCoord(originLat),
        origin_lng: roundCoord(originLng),
        dest_lat: roundCoord(destLat),
        dest_lng: roundCoord(destLng),
        mode,
        polyline,
        distance_meters: distance,
        duration_seconds: duration,
        expires_at: new Date(Date.now() + CACHE_TTL.directions).toISOString(),
      }, {
        onConflict: 'origin_lat,origin_lng,dest_lat,dest_lng,mode',
      });
  } catch (error) {
    console.error('Cache write error (directions):', error);
  }
}

export async function getCachedScores(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  distanceMiles: number
): Promise<{ scores: any; baseline: number } | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data } = await supabase
      .from('scores_cache')
      .select('scores')
      .eq('origin_lat', roundCoord(originLat))
      .eq('origin_lng', roundCoord(originLng))
      .eq('dest_lat', roundCoord(destLat))
      .eq('dest_lng', roundCoord(destLng))
      .eq('distance_miles', Math.round(distanceMiles * 10) / 10)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (data?.scores) {
      return {
        scores: data.scores.scores,
        baseline: data.scores.baseline,
      };
    }
  } catch (error) {
    console.error('Cache read error (scores):', error);
  }

  return null;
}

export async function setCachedScores(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  distanceMiles: number,
  scores: any[],
  baseline: number
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    await supabase
      .from('scores_cache')
      .upsert({
        origin_lat: roundCoord(originLat),
        origin_lng: roundCoord(originLng),
        dest_lat: roundCoord(destLat),
        dest_lng: roundCoord(destLng),
        distance_miles: Math.round(distanceMiles * 10) / 10,
        scores: { scores, baseline },
        expires_at: new Date(Date.now() + CACHE_TTL.scores).toISOString(),
      }, {
        onConflict: 'origin_lat,origin_lng,dest_lat,dest_lng,distance_miles',
      });
  } catch (error) {
    console.error('Cache write error (scores):', error);
  }
}
