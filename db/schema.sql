CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS provider_kind TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS endpoint_url TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS api_version TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS deployment_name TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS secret_ciphertext TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS secret_hint TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS frameworks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, version)
);

CREATE TABLE IF NOT EXISTS framework_controls (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  guidance JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework_id, code)
);

CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER NOT NULL REFERENCES frameworks(id),
  name TEXT NOT NULL,
  auditee TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  period_label TEXT NOT NULL DEFAULT '',
  version_label TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'borrador',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_controls (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  framework_control_id INTEGER NOT NULL REFERENCES framework_controls(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  ai_status TEXT NOT NULL DEFAULT 'pendiente',
  ai_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
  auditor_notes TEXT NOT NULL DEFAULT '',
  compensatory_notes TEXT NOT NULL DEFAULT '',
  reviewer_decision TEXT NOT NULL DEFAULT '',
  reviewer_justification TEXT NOT NULL DEFAULT '',
  is_auditable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evaluation_id, framework_control_id)
);

CREATE TABLE IF NOT EXISTS connectors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  connector_type TEXT NOT NULL,
  base_path TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL DEFAULT '',
  credentials_hint TEXT NOT NULL DEFAULT '',
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER REFERENCES users(id),
  evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidences (
  id SERIAL PRIMARY KEY,
  evaluation_control_id INTEGER NOT NULL REFERENCES evaluation_controls(id) ON DELETE CASCADE,
  evidence_role TEXT NOT NULL DEFAULT 'principal',
  origin_type TEXT NOT NULL,
  source_label TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  stored_path TEXT NOT NULL DEFAULT '',
  reference_path TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  connector_id INTEGER REFERENCES connectors(id),
  mime_type TEXT NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  clarification_text TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_assessments (
  id SERIAL PRIMARY KEY,
  evaluation_control_id INTEGER NOT NULL REFERENCES evaluation_controls(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  result TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  evidence_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS findings (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  evaluation_control_id INTEGER REFERENCES evaluation_controls(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'abierto',
  source_type TEXT NOT NULL DEFAULT 'manual',
  recommendation TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  due_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_plans (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'abierto',
  progress INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL DEFAULT 'system',
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, key)
);

CREATE TABLE IF NOT EXISTS evaluation_participants (
    id SERIAL PRIMARY KEY,
    evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
