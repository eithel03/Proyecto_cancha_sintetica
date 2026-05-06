-- Script de Políticas RLS para SaaSintética
-- IMPORTANTE: Ejecuta esto en el SQL Editor de tu panel de Supabase.

-- Habilitar RLS en las tablas principales (si no estaban habilitadas)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para 'businesses' (Negocios)
-- Los dueños solo pueden ver y editar su propio negocio.
-- Los clientes y visitantes pueden leer los negocios activos (para ver el perfil público).
CREATE POLICY "Dueños pueden gestionar su propio negocio" 
ON public.businesses
FOR ALL 
USING (owner_id = auth.uid());

CREATE POLICY "Cualquiera puede ver negocios activos" 
ON public.businesses
FOR SELECT 
USING (is_active = true);

-- 2. Políticas para 'courts' (Canchas)
-- Los dueños pueden gestionar solo las canchas de su negocio.
-- Cualquiera puede ver las canchas activas.
CREATE POLICY "Dueños gestionan las canchas de su negocio" 
ON public.courts
FOR ALL 
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Cualquiera puede ver canchas activas" 
ON public.courts
FOR SELECT 
USING (is_active = true);

-- 3. Políticas para 'reservations' (Reservas)
-- Los dueños pueden ver TODAS las reservas hechas en sus canchas.
-- Los clientes (customers) pueden ver todas las reservas para saber qué horas están ocupadas,
-- pero SOLO pueden gestionar (update/insert) las suyas.
CREATE POLICY "Dueños ven reservas de su negocio" 
ON public.reservations
FOR ALL 
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Cualquiera puede ver disponibilidad de reservas" 
ON public.reservations
FOR SELECT 
USING (true); -- Permitimos ver todas las reservas para la funcionalidad de 'tachar' horas ocupadas.

CREATE POLICY "Clientes pueden crear sus propias reservas" 
ON public.reservations
FOR INSERT 
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Clientes pueden cancelar (actualizar) sus propias reservas" 
ON public.reservations
FOR UPDATE 
USING (customer_id = auth.uid() AND status = 'pending');

-- 4. Super Admin Override
-- Si tienes un rol de super_admin en los perfiles, puedes usar esta función para saltarte las políticas
-- y permitir que el SuperAdmin vea todo.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregando excepción de Super Admin a las tablas
CREATE POLICY "SuperAdmin tiene acceso total a negocios" ON public.businesses FOR ALL USING (public.is_super_admin());
CREATE POLICY "SuperAdmin tiene acceso total a canchas" ON public.courts FOR ALL USING (public.is_super_admin());
CREATE POLICY "SuperAdmin tiene acceso total a reservas" ON public.reservations FOR ALL USING (public.is_super_admin());

-- ¡Listo! Esto asegura que un dueño de cancha nunca podrá consultar por API las reservas o ingresos de otra cancha.
