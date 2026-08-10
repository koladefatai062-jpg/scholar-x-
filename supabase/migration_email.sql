-- ============================================================
-- ScholarX — Custom email verification (run in the Supabase SQL editor)
-- Adds an email_verified flag to user profiles and a table for
-- one-time codes sent by the app itself (via Resend), NOT Supabase.
-- ============================================================

-- Email verification flag on the public profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- One-time codes used for signup verification + password reset.
-- RLS is intentionally left off (no policies) so only the service role
-- (app server) can read/write codes.
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup' CHECK (purpose IN ('signup', 'reset')),
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes (email, purpose);

-- Existing users: mark everyone as verified so nobody gets locked out
-- after this migration. Only NEW signups will require a code.
UPDATE users SET email_verified = true WHERE email_verified IS NULL OR email_verified = false;
