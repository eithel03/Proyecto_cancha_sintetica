-- ==========================================================
-- SaaSintetica - Script DDL de creación de base de datos
-- DBMS: PostgreSQL 17.6 mediante Supabase
-- Esquema: public
-- Archivo: /database/schema.sql
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.tournament_match_events CASCADE;
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournament_players CASCADE;
DROP TABLE IF EXISTS public.tournament_teams CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.court_pricing_rules CASCADE;
DROP TABLE IF EXISTS public.courts CASCADE;
DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.business_subscriptions CASCADE;
DROP TABLE IF EXISTS public.business_exceptions CASCADE;
DROP TABLE IF EXISTS public.business_hours CASCADE;
DROP TABLE IF EXISTS public.business_users CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    location TEXT,
    phone TEXT,
    whatsapp TEXT,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    owner_id UUID REFERENCES auth.users(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    branding JSONB DEFAULT '{"text": "#ffffff", "accent": "#10b981", "card_bg": "#18181b", "primary": "#10b981", "background": "#09090b"}'::jsonb,
    admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug
ON public.businesses USING btree (slug);

CREATE TABLE IF NOT EXISTS public.business_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    user_id UUID REFERENCES public.profiles(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT business_users_business_id_user_id_key
        UNIQUE (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    day_of_week INTEGER NOT NULL,
    open_time TIME WITHOUT TIME ZONE NOT NULL,
    close_time TIME WITHOUT TIME ZONE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    CONSTRAINT business_hours_day_of_week_check
        CHECK ((day_of_week >= 0) AND (day_of_week <= 6)),
    CONSTRAINT business_hours_business_id_day_of_week_key
        UNIQUE (business_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.business_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    exception_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT true,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT business_subscriptions_customer_id_business_id_key
        UNIQUE (customer_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_favorites_user_id_business_id_key
        UNIQUE (user_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    name TEXT NOT NULL,
    description TEXT,
    price_per_hour NUMERIC,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    price_per_person NUMERIC,
    capacity INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS public.court_pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID REFERENCES public.courts(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    day_of_week INTEGER NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    court_id UUID REFERENCES public.courts(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    reservation_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    customer_id UUID REFERENCES public.profiles(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    hidden_by_customer BOOLEAN DEFAULT false,
    CONSTRAINT reservations_status_check
        CHECK (status = ANY (ARRAY[
            'pending'::text,
            'confirmed'::text,
            'cancelled'::text,
            'completed'::text
        ]))
);

CREATE INDEX IF NOT EXISTS idx_reservations_court_date
ON public.reservations USING btree (court_id, reservation_date);

CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    customer_id UUID REFERENCES public.profiles(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    customer_name TEXT,
    customer_phone TEXT,
    challenge_date DATE NOT NULL,
    challenge_time TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    court_id UUID REFERENCES public.courts(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    opponent_id UUID REFERENCES public.profiles(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    accepted_at TIMESTAMP WITH TIME ZONE,
    creator_id UUID REFERENCES public.profiles(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    hidden_by_customer BOOLEAN DEFAULT false,
    gender TEXT DEFAULT 'masculino',
    men_count INTEGER,
    women_count INTEGER
);

CREATE TABLE IF NOT EXISTS public.tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    name TEXT NOT NULL,
    logo_url TEXT,
    captain_name TEXT,
    captain_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    gender TEXT DEFAULT 'masculino'
);

CREATE TABLE IF NOT EXISTS public.tournament_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    team_id UUID REFERENCES public.tournament_teams(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    first_name TEXT NOT NULL,
    last_name TEXT,
    jersey_number INTEGER,
    position TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    home_team_id UUID REFERENCES public.tournament_teams(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    away_team_id UUID REFERENCES public.tournament_teams(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    court_id UUID REFERENCES public.courts(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,
    match_date DATE NOT NULL,
    match_time TIME WITHOUT TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    current_minute INTEGER DEFAULT 0,
    live_started_at TIMESTAMP WITH TIME ZONE,
    elapsed_seconds INTEGER DEFAULT 0,
    gender TEXT DEFAULT 'masculino',
    CONSTRAINT tournament_matches_status_check
        CHECK (status = ANY (ARRAY[
            'scheduled'::text,
            'live'::text,
            'halftime'::text,
            'finished'::text,
            'cancelled'::text
        ]))
);

CREATE TABLE IF NOT EXISTS public.tournament_match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    match_id UUID REFERENCES public.tournament_matches(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    team_id UUID REFERENCES public.tournament_teams(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    player_id UUID REFERENCES public.tournament_players(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    event_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    minute INTEGER,
    CONSTRAINT tournament_match_events_event_type_check
        CHECK (event_type = ANY (ARRAY[
            'goal'::text,
            'assist'::text,
            'yellow_card'::text,
            'red_card'::text
        ]))
);

CREATE INDEX IF NOT EXISTS idx_courts_business_id
ON public.courts USING btree (business_id);

CREATE INDEX IF NOT EXISTS idx_business_hours_business_id
ON public.business_hours USING btree (business_id);

CREATE INDEX IF NOT EXISTS idx_business_exceptions_business_date
ON public.business_exceptions USING btree (business_id, exception_date);

CREATE INDEX IF NOT EXISTS idx_reservations_business_date
ON public.reservations USING btree (business_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_challenges_business_date
ON public.challenges USING btree (business_id, challenge_date);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_business_id
ON public.tournament_teams USING btree (business_id);

CREATE INDEX IF NOT EXISTS idx_tournament_players_team_id
ON public.tournament_players USING btree (team_id);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_business_date
ON public.tournament_matches USING btree (business_id, match_date);

CREATE INDEX IF NOT EXISTS idx_tournament_match_events_match_id
ON public.tournament_match_events USING btree (match_id);