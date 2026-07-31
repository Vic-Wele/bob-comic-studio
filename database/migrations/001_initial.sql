-- Migration 001: Initial schema creation
-- Applied: see database/schemas/001_initial.sql
-- Run: psql $DATABASE_URL -f database/schemas/001_initial.sql
-- Run: psql $DATABASE_URL -f database/seed/demo_data.sql  (dev only)

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(50)  PRIMARY KEY,
    applied_at  TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial')
ON CONFLICT DO NOTHING;
