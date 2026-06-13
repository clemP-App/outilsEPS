-- Synchronisation temporaire Outils EPS — MySQL OVH
-- À exécuter dans phpMyAdmin (onglet SQL) après création de la base.

CREATE TABLE IF NOT EXISTS backup_sync_sessions (
  id VARCHAR(64) PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,

  b_joined TINYINT(1) NOT NULL DEFAULT 0,
  a_uploaded TINYINT(1) NOT NULL DEFAULT 0,
  b_uploaded TINYINT(1) NOT NULL DEFAULT 0,

  a_payload LONGTEXT NULL,
  b_payload LONGTEXT NULL,
  a_payload_hash VARCHAR(64) NULL,
  b_payload_hash VARCHAR(64) NULL,

  decision_json LONGTEXT NULL,
  applied TINYINT(1) NOT NULL DEFAULT 0,

  INDEX idx_expires_at (expires_at),
  INDEX idx_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
