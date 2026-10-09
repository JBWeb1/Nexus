-- When a password is reset, sign-in tokens issued before this moment stop working.
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
GRANT UPDATE (password_changed_at) ON users TO nexus_authn;
