-- ─────────────────────────────────────────────────────────────────────────────
-- Bob Comic Studio — Initial Schema
-- Database: PostgreSQL 15+
-- ─────────────────────────────────────────────────────────────────────────────

-- Projects (top-level container for a comic)
CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT         DEFAULT '',
    genre       VARCHAR(100) DEFAULT '',
    status      VARCHAR(50)  DEFAULT 'draft'  CHECK (status IN ('draft','active','published')),
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    role         VARCHAR(100) DEFAULT '',
    backstory    TEXT         DEFAULT '',
    personality  TEXT         DEFAULT '',
    appearance   TEXT         DEFAULT '',
    abilities    TEXT         DEFAULT '',
    arc          TEXT         DEFAULT '',
    ai_generated BOOLEAN      DEFAULT FALSE,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Worlds / Settings
CREATE TABLE IF NOT EXISTS worlds (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(100) DEFAULT '',
    overview     TEXT         DEFAULT '',
    geography    TEXT         DEFAULT '',
    factions     TEXT         DEFAULT '',   -- JSON
    timeline     TEXT         DEFAULT '',   -- JSON
    rules        TEXT         DEFAULT '',   -- JSON
    ai_generated BOOLEAN      DEFAULT FALSE,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Plots
CREATE TABLE IF NOT EXISTS plots (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    premise      TEXT    DEFAULT '',
    act_one      TEXT    DEFAULT '',   -- JSON beats array
    act_two      TEXT    DEFAULT '',
    act_three    TEXT    DEFAULT '',
    panels       TEXT    DEFAULT '',   -- JSON panel script array
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- CanonGuard Issues
CREATE TABLE IF NOT EXISTS issues (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    severity    VARCHAR(20)  DEFAULT 'warning' CHECK (severity IN ('critical','warning','info')),
    category    VARCHAR(100) DEFAULT '',
    description TEXT         DEFAULT '',
    location    VARCHAR(255) DEFAULT '',
    suggestion  TEXT         DEFAULT '',
    resolved    BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Director conversation history
CREATE TABLE IF NOT EXISTS director_messages (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role        VARCHAR(20) CHECK (role IN ('user','assistant')),
    content     TEXT        DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_characters_project   ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_worlds_project       ON worlds(project_id);
CREATE INDEX IF NOT EXISTS idx_plots_project        ON plots(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_project       ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_severity      ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_director_project     ON director_messages(project_id);
