import { createSupabaseClient, type TypedSupabaseClient } from '@posture-check/shared';

// Vite exposes environment variables with the VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0NDEyMDB9.CRX_default_local_anon_key';

if (!import.meta.env.VITE_SUPABASE_URL) {
  if (import.meta.env.DEV) {
    console.warn(
      '[PostureCheck:Desktop] VITE_SUPABASE_URL not set in environment. Falling back to local Supabase URL (http://localhost:54321).'
    );
  } else {
    throw new Error(
      '[PostureCheck:Desktop] Missing required environment variable VITE_SUPABASE_URL in production build.'
    );
  }
}


/**
 * Supabase client instance for the Desktop application (Tauri / Vite).
 * Configured with browser localStorage session persistence and automatic token refreshing.
 */
export const supabase: TypedSupabaseClient = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
