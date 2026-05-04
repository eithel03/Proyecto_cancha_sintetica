-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLAS PRINCIPALES

-- Tabla businesses (Negocios / Sintéticas)
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    location TEXT,
    phone TEXT,
    whatsapp TEXT,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla profiles (Perfiles de usuarios)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla business_users (Relación de usuarios (staff) con negocios)
CREATE TABLE public.business_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- Tabla courts (Canchas de cada negocio)
CREATE TABLE public.courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_per_hour NUMERIC,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla business_hours (Horario del negocio)
CREATE TABLE public.business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    UNIQUE(business_id, day_of_week)
);

-- Tabla reservations (Reservas)
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. VALIDACIÓN DE DOBLE RESERVA (Trigger)
-- Función que verifica si el horario se sobrepone
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.reservations
        WHERE court_id = NEW.court_id
          AND reservation_date = NEW.reservation_date
          AND status IN ('pending', 'confirmed') -- no contamos las canceladas
          AND id != NEW.id -- por si es un update
          AND (
                (NEW.start_time < end_time AND NEW.start_time >= start_time) OR
                (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
                (NEW.start_time <= start_time AND NEW.end_time >= end_time)
          )
    ) THEN
        RAISE EXCEPTION 'La cancha ya está reservada en este horario.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_double_booking
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION check_reservation_overlap();

-- 3. AUTOMATIZACIÓN DE PERFILES
-- Trigger para crear un perfil automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    f_name TEXT;
    l_name TEXT;
    calc_full_name TEXT;
    u_phone TEXT;
BEGIN
    f_name := NEW.raw_user_meta_data->>'first_name';
    l_name := NEW.raw_user_meta_data->>'last_name';
    u_phone := NEW.raw_user_meta_data->>'phone';
    
    IF f_name IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
        calc_full_name := NEW.raw_user_meta_data->>'full_name';
    ELSE
        calc_full_name := TRIM(CONCAT(f_name, ' ', l_name));
    END IF;

    INSERT INTO public.profiles (id, first_name, last_name, full_name, phone, role)
    VALUES (
        NEW.id, 
        f_name,
        l_name,
        calc_full_name, 
        u_phone,
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SEGURIDAD DE NIVEL DE FILA (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para Businesses
-- Públicas para ver (para el landing y las páginas de reservas)
CREATE POLICY "Businesses are viewable by everyone" ON public.businesses FOR SELECT USING (true);
-- Solo el owner puede insertar/modificar
CREATE POLICY "Owners can insert businesses" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own businesses" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para Business Users
CREATE POLICY "Business staff viewable by owner" ON public.business_users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_users.business_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can manage staff" ON public.business_users FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_users.business_id AND owner_id = auth.uid())
);

-- Políticas para Courts
-- Públicas para ver
CREATE POLICY "Courts viewable by everyone" ON public.courts FOR SELECT USING (true);
-- Dueño o staff pueden gestionar
CREATE POLICY "Owners and staff manage courts" ON public.courts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = courts.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = courts.business_id AND user_id = auth.uid())
);

-- Políticas para Business Hours
CREATE POLICY "Business hours viewable by everyone" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "Owners manage hours" ON public.business_hours FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_hours.business_id AND owner_id = auth.uid())
);

-- Políticas para Reservations
-- Cualquiera autenticado puede insertar (se valida customer_id en la app o aquí)
CREATE POLICY "Authenticated users can insert reservation" ON public.reservations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Para ver: se necesitan dueños y staff del negocio
CREATE POLICY "Staff can view reservations" ON public.reservations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = reservations.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = reservations.business_id AND user_id = auth.uid())
);
CREATE POLICY "Staff can update reservations" ON public.reservations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = reservations.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = reservations.business_id AND user_id = auth.uid())
);
-- Los clientes no necesitan ver reservas (se puede restringir o dejar público solo para horarios ocupados)
-- Para que el calendario público muestre horas ocupadas, podemos habilitar un SELECT limitado o una función.
-- Por seguridad, daremos SELECT público pero se filtrará a nivel app (no mostrar datos privados de otras reservas).
CREATE POLICY "Anyone can view reservations (for availability)" ON public.reservations FOR SELECT USING (true);

-- Índices recomendados
CREATE INDEX idx_reservations_court_date ON public.reservations (court_id, reservation_date);
CREATE INDEX idx_businesses_slug ON public.businesses (slug);

-- Políticas SUPER ADMIN (Acceso total si role = 'super_admin')
-- Businesses
CREATE POLICY "Super admin can manage businesses" ON public.businesses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
-- Profiles
CREATE POLICY "Super admin can manage profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
-- Courts
CREATE POLICY "Super admin can manage courts" ON public.courts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
-- Reservations
CREATE POLICY "Super admin can manage reservations" ON public.reservations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 5. TABLA DE RETOS (CHALLENGES)
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    challenge_date DATE NOT NULL,
    challenge_time TIME NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges viewable by everyone" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users and admins can update challenges" ON public.challenges FOR UPDATE USING (
    auth.uid() = creator_id OR 
    (status = 'open' AND auth.role() = 'authenticated') OR
    EXISTS (SELECT 1 FROM public.businesses WHERE id = challenges.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE INDEX idx_challenges_business ON public.challenges(business_id);
CREATE INDEX idx_challenges_status ON public.challenges(status);
CREATE INDEX idx_challenges_date ON public.challenges(challenge_date);

