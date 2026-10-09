-- The sign-in role (nexus_authn) and the billing/webhook role (nexus_service) legitimately work across companies.
-- Give them that through explicit policies instead of the BYPASSRLS role attribute. What each may touch is still
-- limited by its table GRANTs; the tenant role (nexus_app) gets no such policy and stays confined to one company.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t.relname AND policyname = 'identity_role') THEN
      EXECUTE format('CREATE POLICY identity_role ON %I TO nexus_authn USING (true) WITH CHECK (true)', t.relname);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t.relname AND policyname = 'service_role') THEN
      EXECUTE format('CREATE POLICY service_role ON %I TO nexus_service USING (true) WITH CHECK (true)', t.relname);
    END IF;
  END LOOP;
END $$;
