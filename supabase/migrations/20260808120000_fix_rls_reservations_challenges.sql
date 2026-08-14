-- Migration: Fix RLS policies for reservations and challenges
-- C6: reservations INSERT should verify customer_id
-- C7: challenges UPDATE was too permissive (any auth user could modify open challenges)

-- C6: Drop and recreate reservations INSERT policy with customer_id check
DROP POLICY IF EXISTS "Authenticated users can insert reservation" ON public.reservations;
CREATE POLICY "Authenticated users can insert own reservation" ON public.reservations FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (customer_id = auth.uid() OR customer_id IS NULL)
);

-- C7: Drop and recreate challenges UPDATE policy without the overly permissive "open" clause
DROP POLICY IF EXISTS "Users and admins can update challenges" ON public.challenges;
CREATE POLICY "Users and admins can update challenges" ON public.challenges FOR UPDATE USING (
    auth.uid() = creator_id OR
    auth.uid() = opponent_id OR
    EXISTS (SELECT 1 FROM public.businesses WHERE id = challenges.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = challenges.business_id AND user_id = auth.uid())
);
