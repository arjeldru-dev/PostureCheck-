/**
 * Supabase Database TypeScript Definitions
 *
 * NOTE: This is a typed stub matching our domain entities for initial setup.
 * In Phase 4 (Step 4.2), this file will be auto-generated from the live schema using:
 * `supabase gen types typescript --local > packages/shared/src/types/database.ts`
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          user_id: string | null;
          device_type: 'desktop' | 'mobile';
          device_name: string;
          platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
          push_token: string | null;
          is_active: boolean;
          last_seen_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          device_type: 'desktop' | 'mobile';
          device_name: string;
          platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
          push_token?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_type?: 'desktop' | 'mobile';
          device_name?: string;
          platform?: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
          push_token?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      posture_settings: {
        Row: {
          id: string;
          user_id: string | null;
          device_id: string;
          profile_name: string;
          interval_minutes: number;
          intensity_level: number;
          active_hours_start: string;
          active_hours_end: string;
          active_days: number[];
          routing_mode: string;
          auto_escalation: boolean;
          dnd_enabled: boolean;
          is_active_profile: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          device_id: string;
          profile_name?: string;
          interval_minutes?: number;
          intensity_level?: number;
          active_hours_start?: string;
          active_hours_end?: string;
          active_days?: number[];
          routing_mode?: string;
          auto_escalation?: boolean;
          dnd_enabled?: boolean;
          is_active_profile?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_id?: string;
          profile_name?: string;
          interval_minutes?: number;
          intensity_level?: number;
          active_hours_start?: string;
          active_hours_end?: string;
          active_days?: number[];
          routing_mode?: string;
          auto_escalation?: boolean;
          dnd_enabled?: boolean;
          is_active_profile?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posture_checks: {
        Row: {
          id: string;
          user_id: string | null;
          device_id: string;
          fired_at: string;
          acknowledged_at: string | null;
          response: 'acknowledged' | 'snoozed' | 'dismissed' | 'expired';
          intensity_level: number;
          xp_earned: number;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          device_id: string;
          fired_at?: string;
          acknowledged_at?: string | null;
          response: 'acknowledged' | 'snoozed' | 'dismissed' | 'expired';
          intensity_level?: number;
          xp_earned?: number;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_id?: string;
          fired_at?: string;
          acknowledged_at?: string | null;
          response?: 'acknowledged' | 'snoozed' | 'dismissed' | 'expired';
          intensity_level?: number;
          xp_earned?: number;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          total_xp: number;
          current_level: number;
          current_streak: number;
          longest_streak: number;
          total_checks: number;
          streak_freeze_available: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_checks?: number;
          streak_freeze_available?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_checks?: number;
          streak_freeze_available?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
