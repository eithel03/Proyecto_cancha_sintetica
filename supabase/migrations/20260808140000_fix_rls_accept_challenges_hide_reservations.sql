-- Migration: Fix RLS for accepting challenges, hiding reservations, and staff business updates
-- Covers audit findings from the full functional review (retos/perfil/settings modules)

-- 1. Allow any authenticated user to ACCEPT an open challenge:
--    the previous "Users and admins can update challenges" policy required
--    auth.uid() = opponent_id on the OLD row, but opponent_id is NULL before
--    acceptance, so acceptChallenge silently updated 0 rows.
DROP POLICY IF EXISTS "Acceptor can accept open challenges" ON public.challenges;
CREATE POLICY "Acceptor can accept open challenges" ON public.challenges FOR UPDATE
USING (status = 'open')
WITH CHECK (status = 'accepted' AND opponent_id = auth.uid());

-- 2. Allow customers to hide their own reservations (hideHistoryItem / clearAllHistory)
DROP POLICY IF EXISTS "Customers can hide own reservations" ON public.reservations;
CREATE POLICY "Customers can hide own reservations" ON public.reservations FOR UPDATE USING (
    auth.uid() = customer_id
);

-- 3. Allow staff (business_users) to update business settings (updateBusiness silent no-op)
DROP POLICY IF EXISTS "Staff can update businesses" ON public.businesses;
CREATE POLICY "Staff can update businesses" ON public.businesses FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.business_users WHERE business_id = businesses.id AND user_id = auth.uid())
);

-- 4. Allow 'own_goal' event type in tournament match events (UI sends it, CHECK constraint rejected it)
ALTER TABLE public.tournament_match_events DROP CONSTRAINT IF EXISTS tournament_match_events_event_type_check;
ALTER TABLE public.tournament_match_events ADD CONSTRAINT tournament_match_events_event_type_check
    CHECK (event_type = ANY (ARRAY['goal', 'assist', 'yellow_card', 'red_card', 'own_goal']));
