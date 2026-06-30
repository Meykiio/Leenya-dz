-- Reset trial_ends_at for all businesses to end of July 31, 2026
-- Ensures continuous access from June 30 through end of July, no gap.
UPDATE businesses
SET trial_ends_at = '2026-07-31 23:59:59+00'
WHERE trial_ends_at IS NOT NULL OR plan = 'free';
