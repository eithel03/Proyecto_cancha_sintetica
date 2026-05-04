-- EVOLUCIÓN DEL SISTEMA DE RETOS (MATCHMAKING)
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Recrear o actualizar la tabla challenges
DROP TABLE IF EXISTS public.challenges CASCADE;

CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Datos informativos (opcionales pero útiles para mostrar rápido sin joins)
    customer_name TEXT,
    customer_phone TEXT,
    
    challenge_date DATE NOT NULL,
    challenge_time TIME NOT NULL,
    notes TEXT,
    
    -- Status: 
    -- open: publicado y esperando rival
    -- accepted: alguien aceptó, esperando confirmación admin
    -- confirmed: el admin confirmó el reto (crea reserva)
    -- cancelled: cancelado por creador o admin
    -- completed: el partido ya pasó
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'confirmed', 'cancelled', 'completed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Habilitar RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para Challenges

-- Ver retos: Cualquiera puede ver retos (para el muro público)
CREATE POLICY "Challenges viewable by everyone" 
ON public.challenges FOR SELECT USING (true);

-- Crear retos: Solo clientes autenticados
CREATE POLICY "Authenticated users can create challenges" 
ON public.challenges FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Actualizar retos: 
-- - El creador puede editar/cancelar si está 'open'
-- - El oponente puede actualizar status a 'accepted' y ponerse como opponent_id
-- - El dueño del negocio o super admin pueden actualizar cualquier cosa (confirmar/cancelar)
CREATE POLICY "Users and admins can update challenges" 
ON public.challenges FOR UPDATE 
USING (
    auth.uid() = creator_id OR 
    (status = 'open' AND auth.role() = 'authenticated') OR
    EXISTS (SELECT 1 FROM public.businesses WHERE id = challenges.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Eliminar retos: Solo Super Admin
CREATE POLICY "Super Admin can delete challenges" 
ON public.challenges FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 4. ÍNDICES
CREATE INDEX idx_challenges_business ON public.challenges(business_id);
CREATE INDEX idx_challenges_status ON public.challenges(status);
CREATE INDEX idx_challenges_date ON public.challenges(challenge_date);
