export const API_KEYS = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  googleMaps: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  mapbox: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  openWeather: process.env.OPENWEATHERMAP_API_KEY || '',
  transit: process.env.TRANSIT_API_KEY || '',
} as const;

export const IS_DEV = process.env.NODE_ENV === 'development';

export function getSupabaseConfig() {
  const { url, anonKey } = API_KEYS.supabase;
  if (!url || url.includes('xxxxxx')) {
    console.warn('⚠️ Supabase not configured');
    return null;
  }
  return { url, anonKey };
}
