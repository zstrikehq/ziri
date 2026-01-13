// Database schema definitions for SQLite

export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
`;

export const CREATE_API_KEYS_TABLE = `
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  key_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
`;

export const CREATE_PROVIDER_KEYS_TABLE = `
CREATE TABLE IF NOT EXISTS provider_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_name TEXT UNIQUE NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_name ON provider_keys(provider_name);
`;

export const CREATE_REFRESH_TOKENS_TABLE = `
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  used_at DATETIME DEFAULT NULL,
  absolute_expires_at DATETIME,
  device_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
`;

// Migration: Add new columns to existing refresh_tokens table
export const MIGRATE_REFRESH_TOKENS_TABLE = `
-- Add new columns if they don't exist (SQLite doesn't support IF NOT EXISTS for ALTER TABLE)
-- We'll check and add them in the migration function
`;

export const ALL_SCHEMAS = [
  CREATE_USERS_TABLE,
  CREATE_API_KEYS_TABLE,
  CREATE_PROVIDER_KEYS_TABLE,
  CREATE_REFRESH_TOKENS_TABLE
];
