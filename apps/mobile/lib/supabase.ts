import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createSupabaseClient, type TypedSupabaseClient } from '@posture-check/shared';

// Expo automatically embeds variables prefixed with EXPO_PUBLIC_
const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.supabaseUrl ||
  'http://localhost:54321';

const supabaseAnonKey: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0NDEyMDB9.CRX_default_local_anon_key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL && !extra.supabaseUrl) {
  if (__DEV__) {
    console.warn(
      '[PostureCheck:Mobile] EXPO_PUBLIC_SUPABASE_URL not set in environment. Falling back to local default. On a physical device or emulator, update this with your LAN IP or cloud Supabase URL.'
    );
  } else {
    throw new Error(
      '[PostureCheck:Mobile] Missing required environment variable EXPO_PUBLIC_SUPABASE_URL in production build.'
    );
  }
}


/**
 * Supabase client instance for the Mobile application (Expo / React Native).
 * Configured with AsyncStorage for persistent auth session management.
 */
export const supabase: TypedSupabaseClient = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
