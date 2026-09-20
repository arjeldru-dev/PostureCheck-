import { describe, expect, it } from 'vitest';
import { createSupabaseClient } from '@posture-check/shared';
import { supabase } from '../supabase';

describe('Supabase Client Configuration', () => {
  it('initializes the desktop supabase client singleton', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  it('shared factory rejects empty URL or anon key', () => {
    expect(() => createSupabaseClient('', 'test-key')).toThrow(
      'Missing Supabase configuration'
    );
    expect(() => createSupabaseClient('https://example.supabase.co', '')).toThrow(
      'Missing Supabase configuration'
    );
  });

  it('shared factory instantiates typed client with custom options', () => {
    const client = createSupabaseClient(
      'https://custom-project.supabase.co',
      'custom-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});
