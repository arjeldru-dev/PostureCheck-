import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
} from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type TypedSupabaseClient = SupabaseClient<Database>;
export type { SupabaseClientOptions } from '@supabase/supabase-js';

/**
 * Creates a typed Supabase client configured with the Posture Check! database schema.
 *
 * @param supabaseUrl - The URL of your Supabase project (or local instance)
 * @param supabaseAnonKey - The public anon key for your Supabase project
 * @param options - Optional client configuration (storage adapters, auth headers, etc.)
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<'public'>
): TypedSupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration: both supabaseUrl and supabaseAnonKey must be provided.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      ...options?.auth,
    },
    ...options,
  });
}
