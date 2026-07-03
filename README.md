# World Cup 2026 — Family Leaderboard

Family members each pick 2 national teams. Points accrue from match results and knockout progress. Multiple leagues can run in parallel — shared match data, per-league members and rankings.

**No user accounts.** Join with an invite code; league creators get an admin token (stored in `localStorage`).

## Stack

| Layer | Tech | Host (prod) |
|-------|------|-------------|
| Frontend | Next.js, Tailwind | [Vercel](https://vercel.com) — `app/` |
| API | FastAPI, SQLAlchemy async | [Railway](https://railway.app) — `api/` |
| Database | Postgres | [Neon](https://neon.tech) |

Local: `docker compose up --build` → app `:3000`, API `:8000`, Postgres `:5432`.

## Data

| Stored in Postgres | Fetched from football-data.org |
|--------------------|------------------------------|
| Leagues, members, team picks | Match fixtures, scores, status |
| `matches` table (synced every 2 min) | Team list (join/admin pickers) |

Leaderboard points are computed on each request from picks + match data. Background sync upserts matches from the API; user requests read the DB.

**Live scores:** free football-data.org tier is delayed. The header ticker shows **Live** (API confirms) or **In progress** (kickoff passed, API lagging).

## Scoring

| Event | Pts | | Event | Pts |
|-------|-----|-|-------|-----|
| Win | 3 | | Round of 16 | +5 |
| Draw | 1 | | QF / SF | +3 / +5 |
| | | | Third place / Final | +2 / +8 |

Tiebreaker: combined goal difference across both teams.

## Local setup

1. Register at [football-data.org](https://www.football-data.org/client/register).
2. `cp docker/.env.example docker/.env` — add `FOOTBALL_API_KEY`.
3. `docker compose up --build` → http://localhost:3000

Without Docker: run Postgres, `pip install` + `uvicorn` in `api/`, `npm run dev` in `app/`. Tables are created on API startup.

Reset DB: `docker compose down -v && docker compose up --build`

## Production

### 1. Neon

Create a project, copy the connection string (`postgresql://…?sslmode=require` is fine).

### 2. Railway (API)

1. **New Project → GitHub repo** → root directory **`api`**
2. Variables:

| Variable | Value |
|----------|--------|
| `FOOTBALL_API_KEY` | football-data.org key |
| `DATABASE_URL` | Neon connection string (paste as-is) |
| `DATABASE_SSL` | `true` |
| `MATCH_SYNC_INTERVAL_SECONDS` | `120` (use `60` on match days) |

3. **Settings → Networking** → generate public domain (port: check deploy logs, usually `8080`)
4. Verify: `https://<api>.up.railway.app/health` → `{"status":"ok"}`

### 3. Vercel (frontend)

1. Import repo → root directory **`app`**
2. Variable:

| Variable | Value |
|----------|--------|
| `API_PROXY_TARGET` | `https://<api>.up.railway.app` |

The app proxies browser requests via `/api/*` → Railway (set in `next.config.js`). No need to set `NEXT_PUBLIC_API_URL` manually.

3. Deploy (redeploy with **clear cache** after env changes)
4. Verify: `https://<app>.vercel.app/api/health` → `{"status":"ok"}`

## API

| Method | Endpoint | Auth |
|--------|----------|------|
| `POST` | `/leagues` | — |
| `GET` | `/leagues/{slug}` | — |
| `GET/POST` | `/leagues/{slug}/members` | invite code on POST |
| `GET` | `/leagues/{slug}/leaderboard` | — |
| `GET` | `/matches`, `/teams` | — |
| `PATCH/DELETE` | `/leagues/{slug}/members/{id}` | admin token |
| `POST` | `/leagues/{slug}/lock` | admin token |

Headers: `X-Invite-Code`, `X-Admin-Token`. Docs at `/docs` when the API is running.
