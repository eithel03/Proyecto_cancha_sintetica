export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_exceptions: {
        Row: {
          business_id: string | null
          created_at: string | null
          exception_date: string
          id: string
          is_closed: boolean | null
          reason: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          exception_date: string
          id?: string
          is_closed?: boolean | null
          reason?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          exception_date?: string
          id?: string
          is_closed?: boolean | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_exceptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_exceptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string | null
          close_time: string
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string
        }
        Insert: {
          business_id?: string | null
          close_time: string
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time: string
        }
        Update: {
          business_id?: string | null
          close_time?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          admin_notes: string | null
          branding: Json | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          max_courts: number
          name: string
          owner_id: string | null
          phone: string | null
          show_tournament: boolean | null
          slug: string
          whatsapp: string | null
        }
        Insert: {
          admin_notes?: string | null
          branding?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_courts?: number
          name: string
          owner_id?: string | null
          phone?: string | null
          show_tournament?: boolean | null
          slug: string
          whatsapp?: string | null
        }
        Update: {
          admin_notes?: string | null
          branding?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_courts?: number
          name?: string
          owner_id?: string | null
          phone?: string | null
          show_tournament?: boolean | null
          slug?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          accepted_at: string | null
          business_id: string | null
          challenge_date: string
          challenge_time: string
          confirmed_at: string | null
          court_id: string | null
          created_at: string | null
          creator_id: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          gender: string | null
          hidden_by_customer: boolean | null
          id: string
          men_count: number | null
          notes: string | null
          opponent_id: string | null
          status: string | null
          women_count: number | null
        }
        Insert: {
          accepted_at?: string | null
          business_id?: string | null
          challenge_date: string
          challenge_time: string
          confirmed_at?: string | null
          court_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          gender?: string | null
          hidden_by_customer?: boolean | null
          id?: string
          men_count?: number | null
          notes?: string | null
          opponent_id?: string | null
          status?: string | null
          women_count?: number | null
        }
        Update: {
          accepted_at?: string | null
          business_id?: string | null
          challenge_date?: string
          challenge_time?: string
          confirmed_at?: string | null
          court_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          gender?: string | null
          hidden_by_customer?: boolean | null
          id?: string
          men_count?: number | null
          notes?: string | null
          opponent_id?: string | null
          status?: string | null
          women_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      court_pricing_rules: {
        Row: {
          court_id: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          price: number
          start_time: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          price: number
          start_time: string
        }
        Update: {
          court_id?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          price?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_pricing_rules_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          business_id: string | null
          capacity: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price_per_hour: number | null
          price_per_person: number | null
        }
        Insert: {
          business_id?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price_per_hour?: number | null
          price_per_person?: number | null
        }
        Update: {
          business_id?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price_per_hour?: number | null
          price_per_person?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          business_id: string | null
          court_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          end_time: string
          hidden_by_customer: boolean | null
          id: string
          notes: string | null
          reservation_date: string
          start_time: string
          status: string | null
        }
        Insert: {
          business_id?: string | null
          court_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          end_time: string
          hidden_by_customer?: boolean | null
          id?: string
          notes?: string | null
          reservation_date: string
          start_time: string
          status?: string | null
        }
        Update: {
          business_id?: string | null
          court_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          end_time?: string
          hidden_by_customer?: boolean | null
          id?: string
          notes?: string | null
          reservation_date?: string
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_classification_zones: {
        Row: {
          business_id: string
          created_at: string
          direct_count: number
          eliminated_count: number
          gender: string
          id: string
          playoff_count: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          direct_count?: number
          eliminated_count?: number
          gender: string
          id?: string
          playoff_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          direct_count?: number
          eliminated_count?: number
          gender?: string
          id?: string
          playoff_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_classification_zones_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_classification_zones_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_match_events: {
        Row: {
          business_id: string | null
          created_at: string | null
          event_type: string
          id: string
          match_id: string | null
          minute: number | null
          player_id: string | null
          quantity: number | null
          team_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          match_id?: string | null
          minute?: number | null
          player_id?: string | null
          quantity?: number | null
          team_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          match_id?: string | null
          minute?: number | null
          player_id?: string | null
          quantity?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "tournament_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournament_match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          business_id: string | null
          court_id: string | null
          created_at: string | null
          current_minute: number | null
          elapsed_seconds: number | null
          gender: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          live_started_at: string | null
          match_date: string
          match_time: string
          status: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          business_id?: string | null
          court_id?: string | null
          created_at?: string | null
          current_minute?: number | null
          elapsed_seconds?: number | null
          gender?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          live_started_at?: string | null
          match_date: string
          match_time: string
          status?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          business_id?: string | null
          court_id?: string | null
          created_at?: string | null
          current_minute?: number | null
          elapsed_seconds?: number | null
          gender?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          live_started_at?: string | null
          match_date?: string
          match_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_players: {
        Row: {
          business_id: string | null
          created_at: string | null
          first_name: string
          id: string
          is_active: boolean | null
          jersey_number: number | null
          last_name: string | null
          position: string | null
          team_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          jersey_number?: number | null
          last_name?: string | null
          position?: string | null
          team_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          jersey_number?: number | null
          last_name?: string | null
          position?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_players_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournament_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          business_id: string | null
          captain_name: string | null
          captain_phone: string | null
          created_at: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
        }
        Insert: {
          business_id?: string | null
          captain_name?: string | null
          captain_phone?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
        }
        Update: {
          business_id?: string | null
          captain_name?: string | null
          captain_phone?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      businesses_public: {
        Row: {
          branding: Json | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          max_courts: number | null
          name: string | null
          phone: string | null
          show_tournament: boolean | null
          slug: string | null
          whatsapp: string | null
        }
        Insert: {
          branding?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_courts?: number | null
          name?: string | null
          phone?: string | null
          show_tournament?: boolean | null
          slug?: string | null
          whatsapp?: string | null
        }
        Update: {
          branding?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_courts?: number | null
          name?: string | null
          phone?: string | null
          show_tournament?: boolean | null
          slug?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      challenges_public: {
        Row: {
          accepted_at: string | null
          business_id: string | null
          challenge_date: string | null
          challenge_time: string | null
          confirmed_at: string | null
          court_id: string | null
          court_name: string | null
          created_at: string | null
          creator_id: string | null
          customer_name: string | null
          gender: string | null
          id: string | null
          men_count: number | null
          notes: string | null
          opponent_id: string | null
          status: string | null
          women_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          full_name: string | null
          id: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      tournament_standings: {
        Row: {
          business_id: string | null
          dg: number | null
          e: number | null
          g: number | null
          gc: number | null
          gf: number | null
          logo_url: string | null
          p: number | null
          pj: number | null
          pts: number | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_challenge: { Args: { p_challenge_id: string }; Returns: Json }
      can_view_profile: { Args: { target_user_id: string }; Returns: boolean }
      confirm_challenge: { Args: { p_challenge_id: string }; Returns: Json }
      create_customer_reservation: {
        Args: {
          p_business_id: string
          p_court_id: string
          p_customer_email?: string
          p_customer_name: string
          p_customer_phone: string
          p_end_time: string
          p_reservation_date: string
          p_start_time: string
        }
        Returns: string
      }
      get_court_availability: {
        Args: { p_court_id: string; p_date: string }
        Returns: {
          end_time: string
          gender: string
          kind: string
          reference_id: string
          start_time: string
          status: string
        }[]
      }
      has_business_access: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      is_business_storage_path: {
        Args: { object_name: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      safe_time: { Args: { value: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
