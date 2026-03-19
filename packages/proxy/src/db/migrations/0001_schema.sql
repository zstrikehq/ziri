CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  name TEXT,
  password TEXT NOT NULL,
  tenant TEXT NOT NULL DEFAULT 'default',
  is_agent INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
  last_sign_in TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  role TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_email_hash ON auth(email_hash);
CREATE INDEX IF NOT EXISTS idx_auth_status ON auth(status);
CREATE INDEX IF NOT EXISTS idx_auth_is_agent ON auth(is_agent);

CREATE TABLE IF NOT EXISTS user_agent_keys (
  id TEXT PRIMARY KEY,
  key_value TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  auth_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (auth_id) REFERENCES auth(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_agent_keys_auth_id ON user_agent_keys(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_keys_key_hash ON user_agent_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_agent_keys_created_at ON user_agent_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_user_agent_keys_status ON user_agent_keys(status);

CREATE TABLE IF NOT EXISTS provider_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_provider ON provider_keys(provider);

CREATE TABLE IF NOT EXISTS schema_policy (
  id TEXT PRIMARY KEY,
  obj_type TEXT NOT NULL CHECK (obj_type IN ('schema', 'policy')),
  version TEXT,
  content TEXT NOT NULL,
  description TEXT,
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
  policy_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schema_policy_obj_type ON schema_policy(obj_type);
CREATE INDEX IF NOT EXISTS idx_schema_policy_status ON schema_policy(status);
CREATE INDEX IF NOT EXISTS idx_schema_policy_version ON schema_policy(version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_policy_unique_schema ON schema_policy(obj_type) WHERE obj_type = 'schema';
CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_policy_policy_id ON schema_policy(policy_id) WHERE obj_type = 'policy' AND policy_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  auth_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  absolute_expires_at TEXT,
  used_at TEXT,
  device_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  FOREIGN KEY (auth_id) REFERENCES auth(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_auth_id ON refresh_tokens(auth_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS entities (
  etype TEXT NOT NULL,
  eid TEXT NOT NULL,
  ejson TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (etype, eid)
);

CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_etype ON entities(etype);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities(created_at);

CREATE TABLE IF NOT EXISTS model_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_cost_per_token REAL NOT NULL,
  output_cost_per_token REAL NOT NULL,
  cache_write_cost_per_token REAL,
  cache_read_cost_per_token REAL,
  max_input_tokens INTEGER,
  max_output_tokens INTEGER,
  supports_vision INTEGER DEFAULT 0,
  supports_function_calling INTEGER DEFAULT 0,
  supports_streaming INTEGER DEFAULT 1,
  supported_actions TEXT NOT NULL DEFAULT 'completion',
  effective_from TEXT NOT NULL DEFAULT (datetime('now')),
  effective_until TEXT,
  source_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, model, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider);
CREATE INDEX IF NOT EXISTS idx_model_pricing_provider_model ON model_pricing(provider, model);
CREATE INDEX IF NOT EXISTS idx_model_pricing_effective ON model_pricing(effective_from, effective_until);

CREATE TABLE IF NOT EXISTS model_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  canonical_model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  principal TEXT NOT NULL,
  principal_type TEXT NOT NULL,
  auth_id TEXT,
  auth_name TEXT,
  api_key_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('permit', 'forbid')),
  decision_reason TEXT,
  policies_evaluated TEXT,
  determining_policies TEXT,
  request_ip TEXT,
  user_agent TEXT,
  request_method TEXT,
  request_path TEXT,
  request_body_hash TEXT,
  cedar_context TEXT,
  entity_snapshot TEXT,
  request_timestamp TEXT NOT NULL,
  auth_start_time TEXT,
  auth_end_time TEXT,
  auth_duration_ms INTEGER,
  provider_request_id TEXT,
  cost_tracking_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_id ON audit_logs(auth_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key_id ON audit_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision ON audit_logs(decision);
CREATE INDEX IF NOT EXISTS idx_audit_logs_provider ON audit_logs(provider);
CREATE INDEX IF NOT EXISTS idx_audit_logs_model ON audit_logs(model);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_decision_time ON audit_logs(auth_id, decision, request_timestamp);

CREATE TABLE IF NOT EXISTS cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  execution_key TEXT NOT NULL,
  audit_log_id INTEGER,
  provider TEXT NOT NULL,
  provider_request_id TEXT,
  model_requested TEXT NOT NULL,
  model_used TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cached_tokens INTEGER DEFAULT 0,
  input_cost REAL NOT NULL,
  output_cost REAL NOT NULL,
  cache_savings REAL DEFAULT 0,
  total_cost REAL NOT NULL,
  pricing_id INTEGER,
  pricing_source TEXT DEFAULT 'database',
  input_rate_used REAL,
  output_rate_used REAL,
  request_timestamp TEXT NOT NULL,
  response_timestamp TEXT,
  latency_ms INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial', 'streaming')),
  error_code TEXT,
  error_message TEXT,
  action TEXT DEFAULT 'completion',
  num_images INTEGER,
  image_quality TEXT,
  image_size TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (execution_key) REFERENCES user_agent_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id) ON DELETE SET NULL,
  FOREIGN KEY (pricing_id) REFERENCES model_pricing(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_request_id ON cost_tracking(request_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_execution_key ON cost_tracking(execution_key);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_provider ON cost_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_model ON cost_tracking(model_used);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON cost_tracking(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_status ON cost_tracking(status);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_key_time ON cost_tracking(execution_key, request_timestamp);

CREATE TABLE IF NOT EXISTS image_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  quality TEXT NOT NULL,
  size TEXT NOT NULL,
  price_per_image REAL NOT NULL,
  max_images_per_request INTEGER DEFAULT 1,
  effective_from TEXT NOT NULL DEFAULT (datetime('now')),
  effective_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, model, quality, size)
);

CREATE INDEX IF NOT EXISTS idx_image_pricing_provider_model ON image_pricing(provider, model);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  expire INTEGER
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expire ON rate_limit_buckets(expire);

CREATE TABLE IF NOT EXISTS internal_entities (
  etype TEXT NOT NULL,
  eid TEXT NOT NULL,
  ejson TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (etype, eid)
);

CREATE INDEX IF NOT EXISTS idx_internal_entities_status ON internal_entities(status);
CREATE INDEX IF NOT EXISTS idx_internal_entities_etype ON internal_entities(etype);
CREATE INDEX IF NOT EXISTS idx_internal_entities_created_at ON internal_entities(created_at);

CREATE TABLE IF NOT EXISTS internal_schema_policy (
  id TEXT PRIMARY KEY,
  obj_type TEXT NOT NULL CHECK (obj_type IN ('schema', 'policy')),
  version TEXT,
  content TEXT NOT NULL,
  description TEXT,
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_obj_type ON internal_schema_policy(obj_type);
CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_status ON internal_schema_policy(status);
CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_version ON internal_schema_policy(version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_schema_policy_unique_schema ON internal_schema_policy(obj_type) WHERE obj_type = 'schema';

CREATE TABLE IF NOT EXISTS internal_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dashboard_user_id TEXT NOT NULL,
  dashboard_user_name TEXT,
  dashboard_user_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('permit', 'forbid')),
  decision_reason TEXT,
  auth_duration_ms INTEGER,
  request_timestamp TEXT NOT NULL,
  action_duration_ms INTEGER,
  outcome_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_timestamp ON internal_audit_logs(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_user ON internal_audit_logs(dashboard_user_id);
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_action ON internal_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_resource ON internal_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_decision ON internal_audit_logs(decision);
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_outcome ON internal_audit_logs(outcome_status);

