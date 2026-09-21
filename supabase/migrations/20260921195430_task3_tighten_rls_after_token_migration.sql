-- ============================================================
-- TASK 3 (phase 2): Tighten RLS now that all anonymous customer paths
-- use validated token-based commands instead of direct table access.
-- Closes: public reading of all active queue tickets (names+phones),
-- forged anonymous queue/bookings inserts, token-less booking access.
-- Applied to production 2026-09-21 via MCP.
-- ============================================================

DROP POLICY IF EXISTS "Anon can view own ticket by id" ON public.queue_tickets;
DROP POLICY IF EXISTS "Public can insert queue tickets" ON public.queue_tickets;
REVOKE INSERT, SELECT ON TABLE public.queue_tickets FROM anon;

DROP POLICY IF EXISTS "Anon can view booking by token" ON public.bookings;
DROP POLICY IF EXISTS "Anon can cancel booking by token" ON public.bookings;
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
REVOKE ALL ON TABLE public.bookings FROM anon;

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Clients can insert reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);
REVOKE INSERT ON TABLE public.reviews FROM anon;
