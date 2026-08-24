PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS merchant_state (
  merchant_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  terminal_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (merchant_id, entity)
);

CREATE TABLE IF NOT EXISTS merchant_events (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_merchant_events_merchant_created ON merchant_events(merchant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  permissions TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
