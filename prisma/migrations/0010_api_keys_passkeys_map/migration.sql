-- API keys, passkey sign-in and the contacts map.

-- API keys let other software use one company's books through the API. Only a SHA-256 hash of each key is kept, so a
-- leaked database cannot be used to call the API; the key itself is shown once, when it is created.
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_id('key'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  access TEXT NOT NULL CHECK (access IN ('READ','WRITE')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX api_keys_org ON api_keys (organization_id, created_at DESC);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON api_keys USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
-- The sign-in role looks a key up by its hash before it knows the company, the same way it looks up a user by email.
CREATE POLICY identity_role ON api_keys TO nexus_authn USING (true) WITH CHECK (true);
CREATE POLICY service_role ON api_keys TO nexus_service USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE (revoked_at) ON api_keys TO nexus_app;
GRANT SELECT, UPDATE (last_used_at) ON api_keys TO nexus_authn;
GRANT SELECT ON api_keys TO nexus_service;

-- Passkeys and hardware security keys (WebAuthn). A passkey belongs to a person, not a company, so only the sign-in
-- role can reach this table. The public key is not a secret; the private key never leaves the person's device.
CREATE TABLE passkeys (
  id TEXT PRIMARY KEY DEFAULT gen_id('pk'),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX passkeys_user ON passkeys (user_id);
ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_role ON passkeys TO nexus_authn USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, DELETE, UPDATE (counter, last_used_at, name) ON passkeys TO nexus_authn;

-- One-time WebAuthn challenges: each is used once and expires after five minutes, so a captured passkey response
-- cannot be replayed.
CREATE TABLE auth_challenges (
  id TEXT PRIMARY KEY DEFAULT gen_id('ch'),
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('REGISTER','LOGIN')),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes'
);
ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_role ON auth_challenges TO nexus_authn USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, DELETE ON auth_challenges TO nexus_authn;

-- The contacts map: where each customer or supplier is, found from the address or placed by hand.
ALTER TABLE contacts
  ADD COLUMN latitude NUMERIC(9,6) CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN longitude NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
  ADD COLUMN location_source TEXT CHECK (location_source IN ('ADDRESS','MANUAL')),
  ADD COLUMN located_at TIMESTAMPTZ,
  ADD CONSTRAINT contacts_location_pair CHECK ((latitude IS NULL) = (longitude IS NULL));
