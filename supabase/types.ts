export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          phone: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string | null
        }
      }
      businesses: {
        Row: {
          id: string
          name: string
          slug: string
          location: string | null
          phone: string | null
          whatsapp: string | null
          description: string | null
          logo_url: string | null
          cover_image_url: string | null
          owner_id: string | null
          created_at: string | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          branding: Json | null
          admin_notes: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          location?: string | null
          phone?: string | null
          whatsapp?: string | null
          description?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          owner_id?: string | null
          created_at?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          branding?: Json | null
          admin_notes?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          location?: string | null
          phone?: string | null
          whatsapp?: string | null
          description?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          owner_id?: string | null
          created_at?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          branding?: Json | null
          admin_notes?: string | null
        }
      }
      business_users: {
        Row: {
          id: string
          business_id: string | null
          user_id: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          user_id?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          user_id?: string | null
          role?: string | null
          created_at?: string | null
        }
      }
      business_hours: {
        Row: {
          id: string
          business_id: string | null
          day_of_week: number
          open_time: string
          close_time: string
          is_closed: boolean | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          day_of_week: number
          open_time: string
          close_time: string
          is_closed?: boolean | null
        }
        Update: {
          id?: string
          business_id?: string | null
          day_of_week?: number
          open_time?: string
          close_time?: string
          is_closed?: boolean | null
        }
      }
      business_exceptions: {
        Row: {
          id: string
          business_id: string | null
          exception_date: string
          is_closed: boolean | null
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          exception_date: string
          is_closed?: boolean | null
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          exception_date?: string
          is_closed?: boolean | null
          reason?: string | null
          created_at?: string | null
        }
      }
      business_subscriptions: {
        Row: {
          id: string
          customer_id: string | null
          business_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          business_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          business_id?: string | null
          created_at?: string | null
        }
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string | null
          business_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          business_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          business_id?: string | null
          created_at?: string | null
        }
      }
      courts: {
        Row: {
          id: string
          business_id: string | null
          name: string
          description: string | null
          price_per_hour: number | null
          image_url: string | null
          is_active: boolean | null
          created_at: string | null
          price_per_person: number | null
          capacity: number | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          name: string
          description?: string | null
          price_per_hour?: number | null
          image_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          price_per_person?: number | null
          capacity?: number | null
        }
        Update: {
          id?: string
          business_id?: string | null
          name?: string
          description?: string | null
          price_per_hour?: number | null
          image_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          price_per_person?: number | null
          capacity?: number | null
        }
      }
      court_pricing_rules: {
        Row: {
          id: string
          court_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          price: number
          created_at: string | null
        }
        Insert: {
          id?: string
          court_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          price: number
          created_at?: string | null
        }
        Update: {
          id?: string
          court_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          price?: number
          created_at?: string | null
        }
      }
      reservations: {
        Row: {
          id: string
          business_id: string | null
          court_id: string | null
          customer_name: string
          customer_phone: string
          customer_email: string | null
          reservation_date: string
          start_time: string
          end_time: string
          status: string | null
          notes: string | null
          created_at: string | null
          customer_id: string | null
          hidden_by_customer: boolean | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          court_id?: string | null
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          reservation_date: string
          start_time: string
          end_time: string
          status?: string | null
          notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          hidden_by_customer?: boolean | null
        }
        Update: {
          id?: string
          business_id?: string | null
          court_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          reservation_date?: string
          start_time?: string
          end_time?: string
          status?: string | null
          notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          hidden_by_customer?: boolean | null
        }
      }
      challenges: {
        Row: {
          id: string
          business_id: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          challenge_date: string
          challenge_time: string
          notes: string | null
          status: string | null
          created_at: string | null
          court_id: string | null
          opponent_id: string | null
          accepted_at: string | null
          creator_id: string | null
          confirmed_at: string | null
          hidden_by_customer: boolean | null
          gender: string | null
          men_count: number | null
          women_count: number | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          challenge_date: string
          challenge_time: string
          notes?: string | null
          status?: string | null
          created_at?: string | null
          court_id?: string | null
          opponent_id?: string | null
          accepted_at?: string | null
          creator_id?: string | null
          confirmed_at?: string | null
          hidden_by_customer?: boolean | null
          gender?: string | null
          men_count?: number | null
          women_count?: number | null
        }
        Update: {
          id?: string
          business_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          challenge_date?: string
          challenge_time?: string
          notes?: string | null
          status?: string | null
          created_at?: string | null
          court_id?: string | null
          opponent_id?: string | null
          accepted_at?: string | null
          creator_id?: string | null
          confirmed_at?: string | null
          hidden_by_customer?: boolean | null
          gender?: string | null
          men_count?: number | null
          women_count?: number | null
        }
      }
      tournament_teams: {
        Row: {
          id: string
          business_id: string | null
          name: string
          logo_url: string | null
          captain_name: string | null
          captain_phone: string | null
          is_active: boolean | null
          created_at: string | null
          gender: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          name: string
          logo_url?: string | null
          captain_name?: string | null
          captain_phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
          gender?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          name?: string
          logo_url?: string | null
          captain_name?: string | null
          captain_phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
          gender?: string | null
        }
      }
      tournament_players: {
        Row: {
          id: string
          business_id: string | null
          team_id: string | null
          first_name: string
          last_name: string | null
          jersey_number: number | null
          position: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          team_id?: string | null
          first_name: string
          last_name?: string | null
          jersey_number?: number | null
          position?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          team_id?: string | null
          first_name?: string
          last_name?: string | null
          jersey_number?: number | null
          position?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      tournament_matches: {
        Row: {
          id: string
          business_id: string | null
          home_team_id: string | null
          away_team_id: string | null
          court_id: string | null
          match_date: string
          match_time: string
          status: string | null
          home_score: number | null
          away_score: number | null
          created_at: string | null
          current_minute: number | null
          live_started_at: string | null
          elapsed_seconds: number | null
          gender: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          home_team_id?: string | null
          away_team_id?: string | null
          court_id?: string | null
          match_date: string
          match_time: string
          status?: string | null
          home_score?: number | null
          away_score?: number | null
          created_at?: string | null
          current_minute?: number | null
          live_started_at?: string | null
          elapsed_seconds?: number | null
          gender?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          home_team_id?: string | null
          away_team_id?: string | null
          court_id?: string | null
          match_date?: string
          match_time?: string
          status?: string | null
          home_score?: number | null
          away_score?: number | null
          created_at?: string | null
          current_minute?: number | null
          live_started_at?: string | null
          elapsed_seconds?: number | null
          gender?: string | null
        }
      }
      tournament_match_events: {
        Row: {
          id: string
          business_id: string | null
          match_id: string | null
          team_id: string | null
          player_id: string | null
          event_type: string
          quantity: number | null
          created_at: string | null
          minute: number | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          match_id?: string | null
          team_id?: string | null
          player_id?: string | null
          event_type: string
          quantity?: number | null
          created_at?: string | null
          minute?: number | null
        }
        Update: {
          id?: string
          business_id?: string | null
          match_id?: string | null
          team_id?: string | null
          player_id?: string | null
          event_type?: string
          quantity?: number | null
          created_at?: string | null
          minute?: number | null
        }
      }
      tournament_classification_zones: {
        Row: {
          id: string
          business_id: string
          gender: string
          direct_count: number
          playoff_count: number
          eliminated_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          gender?: string
          direct_count?: number
          playoff_count?: number
          eliminated_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          gender?: string
          direct_count?: number
          playoff_count?: number
          eliminated_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
