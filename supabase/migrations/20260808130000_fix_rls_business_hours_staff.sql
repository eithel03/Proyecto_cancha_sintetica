-- Fix: Allow staff to manage business_hours and business_exceptions
-- Previously only owners could manage these, blocking staff in settings page

-- Business Hours: Drop old owner-only policy, create owner+staff policy
DROP POLICY IF EXISTS "Owners manage hours" ON public.business_hours;
CREATE POLICY "Owners and staff manage hours" ON public.business_hours FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_hours.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = business_hours.business_id AND user_id = auth.uid())
);

-- Business Exceptions: Drop old owner-only policy, create owner+staff policy
DROP POLICY IF EXISTS "Owners manage exceptions" ON public.business_exceptions;
CREATE POLICY "Owners and staff manage exceptions" ON public.business_exceptions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_exceptions.business_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = business_exceptions.business_id AND user_id = auth.uid())
);
