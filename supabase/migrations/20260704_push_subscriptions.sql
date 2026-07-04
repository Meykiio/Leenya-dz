-- Push subscriptions for browser notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  queue_ticket_id UUID REFERENCES queue_tickets(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  locale TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_booking ON push_subscriptions(booking_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_ticket ON push_subscriptions(queue_ticket_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a subscription (no auth needed for customers)
CREATE POLICY "Anyone can create push subscriptions"
  ON push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the business owner can read their subscriptions
CREATE POLICY "Business owners can read their push subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can delete subscriptions
CREATE POLICY "Business owners can delete push subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Staff can read subscriptions for their business (to send queue notifications)
CREATE POLICY "Staff can read push subscriptions for queue tickets"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT sm.business_id FROM staff_members sm WHERE sm.profile_id = auth.uid()
    )
  );

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
