import time
import logging
import httpx
from config import settings
from domains.matches.schemas import MatchOut

logger = logging.getLogger(__name__)

_HEADERS = {"X-Auth-Token": settings.football_api_key}
_BASE = settings.football_api_base
_COMP = settings.competition_code

CACHE_TTL = 120  # seconds

_cache: dict[str, tuple[float, object]] = {}


async def _get(path: str, params: dict | None = None) -> dict:
    cache_key = f"{path}:{params}"
    now = time.time()

    cached = _cache.get(cache_key)
    if cached and (now - cached[0]) < CACHE_TTL:
        return cached[1]  # type: ignore

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(
                f"{_BASE}{path}", headers=_HEADERS, params=params
            )
            resp.raise_for_status()
            data = resp.json()
            _cache[cache_key] = (now, data)
            return data
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Rate limited by football-data.org, returning cached data if available")
                if cached:
                    return cached[1]  # type: ignore
            raise


def _team_info(team: dict | None) -> tuple[str, str]:
    if not team:
        return "TBD", ""
    return team.get("name") or "TBD", team.get("tla") or ""


async def fetch_matches() -> list[MatchOut]:
    data = await _get(f"/competitions/{_COMP}/matches")
    results: list[MatchOut] = []
    for m in data.get("matches", []):
        score = m.get("score", {})
        ft = score.get("fullTime") or {}
        home_team, home_code = _team_info(m.get("homeTeam"))
        away_team, away_code = _team_info(m.get("awayTeam"))
        results.append(
            MatchOut(
                match_id=m["id"],
                utc_date=m["utcDate"],
                status=m["status"],
                stage=m.get("stage", "GROUP_STAGE"),
                group=m.get("group"),
                home_team=home_team,
                home_code=home_code,
                away_team=away_team,
                away_code=away_code,
                home_score=ft.get("home"),
                away_score=ft.get("away"),
                winner=score.get("winner"),
            )
        )
    return results


async def fetch_teams() -> list[dict]:
    data = await _get(f"/competitions/{_COMP}/teams")
    return [
        {"id": t["id"], "name": t["name"], "code": t.get("tla", "")}
        for t in data.get("teams", [])
        if t.get("tla")
    ]
