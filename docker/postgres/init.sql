CREATE TABLE IF NOT EXISTS leagues (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    slug         VARCHAR(60) UNIQUE NOT NULL,
    invite_code  VARCHAR(20) NOT NULL,
    admin_token  VARCHAR(64) NOT NULL,
    picks_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_leagues_slug ON leagues (slug);

CREATE TABLE IF NOT EXISTS members (
    id          SERIAL PRIMARY KEY,
    league_id   INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    avatar_seed VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_member_league_name UNIQUE (league_id, name)
);

CREATE INDEX IF NOT EXISTS ix_members_league_id ON members (league_id);

CREATE TABLE IF NOT EXISTS member_teams (
    id          SERIAL PRIMARY KEY,
    member_id   INTEGER REFERENCES members(id) ON DELETE CASCADE,
    team_code   VARCHAR(10) NOT NULL,
    team_name   VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    match_id    INTEGER PRIMARY KEY,
    utc_date    TIMESTAMPTZ NOT NULL,
    status      VARCHAR(20) NOT NULL,
    stage       VARCHAR(30) NOT NULL,
    match_group VARCHAR(10),
    home_team   VARCHAR(100) NOT NULL,
    home_code   VARCHAR(10) NOT NULL,
    away_team   VARCHAR(100) NOT NULL,
    away_code   VARCHAR(10) NOT NULL,
    home_score  INTEGER,
    away_score  INTEGER,
    winner      VARCHAR(15),
    pred_home_pct REAL,
    pred_draw_pct REAL,
    pred_away_pct REAL,
    pred_winner VARCHAR(10),
    pred_pct    REAL,
    pred_locked_at TIMESTAMPTZ,
    pred_snapshot_version INTEGER,
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_matches_status ON matches (status);
CREATE INDEX IF NOT EXISTS ix_matches_utc_date ON matches (utc_date);
