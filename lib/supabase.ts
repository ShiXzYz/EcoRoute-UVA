import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('xxxxxxxxxxxx');

// Only create client if properly configured, otherwise create a dummy client to avoid build errors
let supabaseClient: any = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a minimal dummy client that won't fail during build
  supabaseClient = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  };
}

export const supabase = supabaseClient;
