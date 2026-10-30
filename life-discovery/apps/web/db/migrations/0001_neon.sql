CREATE TABLE IF NOT EXISTS app_schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS account_states (
  account_id text PRIMARY KEY,
  version bigint NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS account_mutations (
  account_id text NOT NULL REFERENCES account_states(account_id) ON DELETE CASCADE,
  operation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id, operation_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS catalog_sources (
  source_key text PRIMARY KEY,
  domain text NOT NULL,
  city text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_success_at timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS catalog_snapshots (
  source_key text NOT NULL,
  snapshot_date date NOT NULL,
  domain text NOT NULL,
  city text NOT NULL,
  items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source_key, snapshot_date)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS catalog_runs (
  run_date date PRIMARY KEY,
  status text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_sources_domain_city ON catalog_sources(domain, city);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION commit_account_state(p_account text, p_version bigint, p_state jsonb, p_ids jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE current_row account_states%ROWTYPE; applied jsonb;
BEGIN
  SELECT * INTO current_row FROM account_states WHERE account_id=p_account FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_initialized'; END IF;
  SELECT coalesce(jsonb_agg(operation_id), '[]'::jsonb) INTO applied FROM account_mutations
    WHERE account_id=p_account AND operation_id IN (SELECT jsonb_array_elements_text(p_ids));
  IF jsonb_array_length(applied)=jsonb_array_length(p_ids) THEN
    RETURN jsonb_build_object('state',current_row.state,'version',current_row.version,'acknowledged',applied,'conflict',false);
  END IF;
  IF current_row.version<>p_version OR jsonb_array_length(applied)>0 THEN
    RETURN jsonb_build_object('state',current_row.state,'version',current_row.version,'acknowledged',applied,'conflict',true);
  END IF;
  UPDATE account_states SET state=p_state, version=version+1, updated_at=now() WHERE account_id=p_account RETURNING * INTO current_row;
  INSERT INTO account_mutations(account_id,operation_id) SELECT p_account,jsonb_array_elements_text(p_ids);
  RETURN jsonb_build_object('state',current_row.state,'version',current_row.version,'acknowledged',p_ids,'conflict',false);
END;
$$;
