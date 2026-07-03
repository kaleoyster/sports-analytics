import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db import async_session
from domains.matches.models import Match
from domains.matches.schemas import MatchOut
from services.bracket_order import sort_knockout_matches
from services.football_api import fetch_matches_from_api

logger = logging.getLogger(__name__)

_sync_lock = asyncio.Lock()


def _parse_utc_date(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _match_out_to_row(match: MatchOut, synced_at: datetime) -> dict:
    return {
        "match_id": match.match_id,
        "utc_date": _parse_utc_date(match.utc_date),
        "status": match.status,
        "stage": match.stage,
        "match_group": match.group,
        "home_team": match.home_team,
        "home_code": match.home_code,
        "away_team": match.away_team,
        "away_code": match.away_code,
        "home_score": match.home_score,
        "away_score": match.away_score,
        "winner": match.winner,
        "synced_at": synced_at,
    }


def _row_to_match_out(row: Match) -> MatchOut:
    return MatchOut(
        match_id=row.match_id,
        utc_date=row.utc_date.isoformat().replace("+00:00", "Z"),
        status=row.status,
        stage=row.stage,
        group=row.match_group,
        home_team=row.home_team,
        home_code=row.home_code,
        away_team=row.away_team,
        away_code=row.away_code,
        home_score=row.home_score,
        away_score=row.away_score,
        winner=row.winner,
    )


async def load_matches(session: AsyncSession) -> list[MatchOut]:
    result = await session.execute(select(Match).order_by(Match.utc_date))
    rows = result.scalars().all()
    return sort_knockout_matches([_row_to_match_out(row) for row in rows])


async def sync_matches() -> int:
    """Fetch the full match list from football-data.org and upsert into Postgres."""
    async with _sync_lock:
        matches = await fetch_matches_from_api()
        if not matches:
            return 0

        synced_at = datetime.now(timezone.utc)
        rows = [_match_out_to_row(m, synced_at) for m in matches]

        async with async_session() as session:
            stmt = insert(Match).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=[Match.match_id],
                set_={
                    "utc_date": stmt.excluded.utc_date,
                    "status": stmt.excluded.status,
                    "stage": stmt.excluded.stage,
                    "match_group": stmt.excluded.match_group,
                    "home_team": stmt.excluded.home_team,
                    "home_code": stmt.excluded.home_code,
                    "away_team": stmt.excluded.away_team,
                    "away_code": stmt.excluded.away_code,
                    "home_score": stmt.excluded.home_score,
                    "away_score": stmt.excluded.away_score,
                    "winner": stmt.excluded.winner,
                    "synced_at": stmt.excluded.synced_at,
                },
            )
            await session.execute(stmt)
            await session.commit()

        logger.info("Synced %d matches", len(rows))
        return len(rows)
