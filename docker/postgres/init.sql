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
