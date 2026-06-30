# World Cup 2026 — Family Leaderboard

Each family member picks 2 national teams. Points accumulate as the tournament progresses based on match results and how far each team advances. A live leaderboard tracks who's winning.

Multiple families can run their own leagues side by side — each league has its own members, picks, and rankings. Match data is shared globally (from football-data.org); only member picks and scores are per-league.

## Architecture

```
app/          Next.js frontend (React, Tailwind)
api/          FastAPI backend (Python, SQLAlchemy async, asyncpg)
docker/       Postgres init scripts, env config
```

```
docker compose up → Postgres :5432 + FastAPI :8000 + Next.js :3000
```

### Backend domains

```
api/domains/
  leagues/      League CRUD, invite codes, admin auth, lock control
  members/      Members + team picks (scoped per league)
  matches/      Tournament match data (global, cached from API)
  leaderboard/  Scoring engine + rankings (scoped per league)
```

## Leagues & access

Each league is a separate family or group competition.

| Concept | Purpose |
|---------|---------|
| **Slug** | URL identifier — e.g. `/l/smith-family-a1b2` |
| **Invite code** | 6-character code family members use to join |
| **Admin token** | Secret token for the league creator — edit/remove members, lock picks |
| **Picks locked** | When locked, no new joins and no team changes |

**No user accounts.** Viewing is open; joining requires an invite code; admin actions require the admin token (stored in the browser's `localStorage` after league creation).

### Typical flow

1. **Create a league** at http://localhost:3000 — you become admin and receive an invite link + admin token.
2. **Share the invite link** with family (`/l/{slug}/join?code=XXXXXX`).
3. **Members join** — name, avatar, pick 2 teams.
4. **Lock picks** when the tournament starts (Admin → Lock picks).
5. **Track the competition** — leaderboard, bracket, elimination tracker, head-to-head, timeline.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing — create a league or open an existing one |
| `/l/{slug}` | Leaderboard + recent results |
| `/l/{slug}/join` | Join with invite code |
| `/l/{slug}/bracket` | Knockout bracket with member avatars on matches |
| `/l/{slug}/tracker` | Who's still alive vs eliminated |
| `/l/{slug}/compare` | Head-to-head comparison |
| `/l/{slug}/timeline` | Chronological point-earning feed |
| `/l/{slug}/admin` | Invite link, lock/unlock, edit/remove members |

## Scoring

| Event              | Points |
|--------------------|--------|
| Match win          | 3      |
| Match draw         | 1      |
| Round of 16        | +5     |
| Quarter-finals     | +3     |
| Semi-finals        | +5     |
| Third-place match  | +2     |
| Final              | +8     |

**Tiebreaker:** If two players have the same points, combined goal difference across their 2 teams decides rank. Players only share a rank when points and goal difference are both equal.

Click any leaderboard row to see match-by-match points plus team stats (W-D-L, goals scored/conceded, goal difference).

## Setup

### 1. Get a football-data.org API key

Register (free) at [football-data.org](https://www.football-data.org/client/register).

```bash
cp docker/.env.example docker/.env
# edit docker/.env — paste your FOOTBALL_API_KEY
```

### 2. Run

```bash
docker compose up --build
```

| Service       | URL                          |
|---------------|------------------------------|
| App           | http://localhost:3000         |
| API docs      | http://localhost:8000/docs    |
| Postgres      | localhost:5432               |

### 3. Create a league and add members

1. Open http://localhost:3000 and **Create league** (e.g. "Smith Family").
2. You'll land on the admin page — copy the **invite link** and share it.
3. Family members open the link, enter the invite code (pre-filled), pick 2 teams, and join.

Or via the API:

```bash
# Create a league
curl -X POST http://localhost:8000/leagues \
  -H "Content-Type: application/json" \
  -d '{"name": "Smith Family"}'
# → returns slug, invite_code, admin_token (save the admin token)

# Join a member (invite code required)
curl -X POST http://localhost:8000/leagues/smith-family-a1b2/members \
  -H "Content-Type: application/json" \
  -H "X-Invite-Code: ABC123" \
  -d '{"name": "Kale", "avatar_seed": "Kale", "team_codes": ["USA", "ARG"]}'

# Lock picks (admin token required)
curl -X POST http://localhost:8000/leagues/smith-family-a1b2/lock \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: <your-admin-token>" \
  -d '{"locked": true}'
```

### Resetting the database

Schema is applied via `docker/postgres/init.sql` on first volume creation. To wipe and start fresh:

```bash
docker compose down -v
docker compose up --build
```

## API overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/leagues` | — | Create league |
| `GET` | `/leagues/{slug}` | — | Public league info |
| `GET` | `/leagues/{slug}/admin` | Admin token | League info + invite code |
| `POST` | `/leagues/{slug}/lock` | Admin token | Lock or unlock picks |
| `GET` | `/leagues/{slug}/members` | — | List members |
| `POST` | `/leagues/{slug}/members` | Invite code | Add member |
| `PATCH` | `/leagues/{slug}/members/{id}` | Admin token | Edit member teams |
| `DELETE` | `/leagues/{slug}/members/{id}` | Admin token | Remove member |
| `GET` | `/leagues/{slug}/leaderboard` | — | Rankings |
| `GET` | `/matches` | — | Tournament matches (global) |
| `GET` | `/teams` | — | National teams (global) |

Auth headers: `X-Invite-Code` for joining, `X-Admin-Token` for admin actions.

## Local dev (without Docker)

```bash
# API
cd api
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd app
npm install
npm run dev
```

Requires a running Postgres instance — set `DATABASE_URL` in your environment. Run `docker/postgres/init.sql` against the database, or let the API create tables on startup (if the DB is empty).

## Production deployment

Split across three services:

| Service   | Host                          | Directory |
|-----------|-------------------------------|-----------|
| Frontend  | [Vercel](https://vercel.com)  | `app/`    |
| API       | [Railway](https://railway.app) | `api/`   |
| Database  | [Neon](https://neon.tech)     | —         |

### 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string (starts with `postgresql://`).
3. Run `docker/postgres/init.sql` against the database, or deploy the API once on an empty DB so tables are created on startup.

### 2. API (Railway)

1. Create a new Railway project → **Deploy from GitHub repo**.
2. Set the **root directory** to `api`.
3. Railway detects `railway.toml` and builds from the Dockerfile.
4. Add environment variables:

| Variable           | Value                              |
|--------------------|------------------------------------|
| `FOOTBALL_API_KEY` | Your [football-data.org](https://www.football-data.org) key |
| `DATABASE_URL`     | Neon connection string             |
| `DATABASE_SSL`     | `true`                             |

5. Generate a public domain under **Settings → Networking**.
6. Verify: `https://<your-api>.up.railway.app/health` returns `{"status":"ok"}`.

### 3. Frontend (Vercel)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Set the **root directory** to `app`.
3. Add environment variable:

| Variable               | Value                          |
|------------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL`  | `https://<your-api>.up.railway.app` |

4. Deploy. Vercel assigns a `*.vercel.app` URL.

### Alternatives

- **API**: [Render](https://render.com) or [Fly.io](https://fly.io) work the same way — deploy `api/` with the Dockerfile and the same env vars.
- **Database**: [Supabase](https://supabase.com) or [Vercel Postgres](https://vercel.com/storage/postgres) also work — set `DATABASE_SSL=true` for any remote Postgres host.


## Challenges / TODO:

  1. Invitation codes are difficult to remember.
    - Is there a better way to remember the users and how they belong to which league.
      - Like automagically.
      - Will this work on a phone interface.
      - Is there something like a QR code that can be scanned to join the league.
      - Or remember user

  2. The site doesn't show all the the current leagues
    - user can select which leagues to join.
      - request the admin to add the member to the league.
    - Or some better way.

  3. Analytics:
    - Based on the data, we can show the analytics of the league, plus predictions of the member who is most likely to win.
      - this can be done using machine learning or some other analytics tool.
      - We might need more data.
        - Subs.
        - Yellow cards.
        - Red cards.
        - Penalties.
        - Corners.
        - Fouls.
        - Offsides.
        - Possession.
        - Shots on target.
        - Shots off target.
        - Shots blocked.

  4. We can perhaps redo the theme of the site.
    - More lighter colors.
    - More modern look and feel.
    - More interactive elements.


# 

1.  We can make the UI smarter and compact.
  - Predictions
  - Tracker
    - Red and Green
      - Green means the team is still in the tournament.
      - Red means the team is eliminated.
  - Timeline could be underneath the rankings
  - Then the recent results 
  - You think the brackers and the tracker can be combined into a single page.

