import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db import async_session
from domains.leaderboard.predictions import (
    PREDICTION_SNAPSHOT_VERSION,
    compute_pre_kickoff_probabilities,
)
from domains.matches.models import Match
from domains.matches.schemas import MatchOut
from services.bracket_order import sort_knockout_matches
from services.compute_cache import invalidate_compute_cache
from services.football_api import fetch_matches_from_api

logger = logging.getLogger(__name__)

_sync_lock = asyncio.Lock()

UNPLAYED = {"SCHEDULED", "TIMED"}
PLAYED = {"IN_PLAY", "PAUSED", "FINISHED", "SUSPENDED"}


def _parse_utc_date(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _prediction_fields_from_row(row: Match) -> dict:
    if row.pred_home_pct is None or row.pred_winner is None:
        return {
            "pre_kickoff_locked": bool(row.pred_locked_at),
            "pred_snapshot_version": row.pred_snapshot_version,
        }
    return {
        "pre_kickoff_home_pct": row.pred_home_pct,
        "pre_kickoff_draw_pct": row.pred_draw_pct,
        "pre_kickoff_away_pct": row.pred_away_pct,
        "pre_kickoff_predicted_winner": row.pred_winner,
        "pre_kickoff_predicted_pct": row.pred_pct,
        "pre_kickoff_locked": bool(row.pred_locked_at),
        "pred_snapshot_version": row.pred_snapshot_version,
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
        **_prediction_fields_from_row(row),
    )


def _prediction_update_from_probs(preds: dict[str, float | str]) -> dict:
    return {
        "pre_kickoff_home_pct": float(preds["home_win_pct"]),
        "pre_kickoff_draw_pct": float(preds["draw_pct"]),
        "pre_kickoff_away_pct": float(preds["away_win_pct"]),
        "pre_kickoff_predicted_winner": str(preds["predicted_winner"]),
        "pre_kickoff_predicted_pct": float(preds["predicted_pct"]),
    }


def _copy_predictions(src: MatchOut) -> dict:
    return {
        "pre_kickoff_home_pct": src.pre_kickoff_home_pct,
        "pre_kickoff_draw_pct": src.pre_kickoff_draw_pct,
        "pre_kickoff_away_pct": src.pre_kickoff_away_pct,
        "pre_kickoff_predicted_winner": src.pre_kickoff_predicted_winner,
        "pre_kickoff_predicted_pct": src.pre_kickoff_predicted_pct,
    }


def _is_prediction_locked(old: MatchOut | None) -> bool:
    if not old or not old.pre_kickoff_locked:
        return False
    return old.pred_snapshot_version == PREDICTION_SNAPSHOT_VERSION


def _match_out_to_row(
    match: MatchOut,
    synced_at: datetime,
    *,
    lock_predictions: bool = False,
) -> dict:
    row = {
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
        "pred_home_pct": None,
        "pred_draw_pct": None,
        "pred_away_pct": None,
        "pred_winner": None,
        "pred_pct": None,
        "pred_locked_at": None,
        "pred_snapshot_version": None,
        "synced_at": synced_at,
    }
    if match.pre_kickoff_home_pct is not None and match.pre_kickoff_predicted_winner:
        row.update(
            {
                "pred_home_pct": match.pre_kickoff_home_pct,
                "pred_draw_pct": match.pre_kickoff_draw_pct,
                "pred_away_pct": match.pre_kickoff_away_pct,
                "pred_winner": match.pre_kickoff_predicted_winner,
                "pred_pct": match.pre_kickoff_predicted_pct,
            }
        )
        if lock_predictions:
            row["pred_locked_at"] = synced_at
            row["pred_snapshot_version"] = PREDICTION_SNAPSHOT_VERSION
    return row


def _apply_pre_kickoff_predictions(
    api_matches: list[MatchOut], existing: list[MatchOut]
) -> tuple[list[MatchOut], set[int]]:
    existing_by_id = {m.match_id: m for m in existing}
    enriched: list[MatchOut] = []
    newly_locked: set[int] = set()

    for match in api_matches:
        old = existing_by_id.get(match.match_id)

        if old and _is_prediction_locked(old):
            enriched.append(
                match.model_copy(
                    update={
                        **_copy_predictions(old),
                        "pre_kickoff_locked": True,
                    }
                )
            )
            continue

        if match.status in UNPLAYED:
            preds = compute_pre_kickoff_probabilities(match, existing)
            if preds:
                enriched.append(
                    match.model_copy(
                        update={
                            **_prediction_update_from_probs(preds),
                            "pre_kickoff_locked": False,
                        }
                    )
                )
            else:
                enriched.append(match)
            continue

        # Kickoff passed — freeze the last pre-kickoff line (never live in-game odds).
        if old and old.pre_kickoff_predicted_winner and old.status in UNPLAYED:
            enriched.append(
                match.model_copy(
                    update={
                        **_copy_predictions(old),
                        "pre_kickoff_locked": True,
                    }
                )
            )
            newly_locked.add(match.match_id)
            continue

        preds = compute_pre_kickoff_probabilities(match, existing)
        if preds:
            enriched.append(
                match.model_copy(
                    update={
                        **_prediction_update_from_probs(preds),
                        "pre_kickoff_locked": True,
                    }
                )
            )
            newly_locked.add(match.match_id)
            logger.info(
                "Locked pre-kickoff prediction for match %s: %s %.1f%%",
                match.match_id,
                preds["predicted_winner"],
                preds["predicted_pct"],
            )
        else:
            enriched.append(match)

    return enriched, newly_locked


async def load_matches(session: AsyncSession) -> list[MatchOut]:
    result = await session.execute(select(Match).order_by(Match.utc_date))
    rows = result.scalars().all()
    return sort_knockout_matches([_row_to_match_out(row) for row in rows])


async def sync_matches() -> int:
    """Fetch the full match list from football-data.org and upsert into Postgres."""
    async with _sync_lock:
        async with async_session() as session:
            existing = await load_matches(session)

        api_matches = await fetch_matches_from_api()
        if not api_matches:
            return 0

        synced_at = datetime.now(timezone.utc)
        matches, newly_locked = _apply_pre_kickoff_predictions(api_matches, existing)
        rows = [
            _match_out_to_row(
                m, synced_at, lock_predictions=m.match_id in newly_locked
            )
            for m in matches
        ]

        async with async_session() as session:
            locked_current = (Match.pred_locked_at.isnot(None)) & (
                Match.pred_snapshot_version == PREDICTION_SNAPSHOT_VERSION
            )
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
                    "pred_home_pct": case(
                        (locked_current, Match.pred_home_pct),
                        else_=stmt.excluded.pred_home_pct,
                    ),
                    "pred_draw_pct": case(
                        (locked_current, Match.pred_draw_pct),
                        else_=stmt.excluded.pred_draw_pct,
                    ),
                    "pred_away_pct": case(
                        (locked_current, Match.pred_away_pct),
                        else_=stmt.excluded.pred_away_pct,
                    ),
                    "pred_winner": case(
                        (locked_current, Match.pred_winner),
                        else_=stmt.excluded.pred_winner,
                    ),
                    "pred_pct": case(
                        (locked_current, Match.pred_pct),
                        else_=stmt.excluded.pred_pct,
                    ),
                    "pred_locked_at": case(
                        (locked_current, Match.pred_locked_at),
                        else_=func.coalesce(
                            stmt.excluded.pred_locked_at, Match.pred_locked_at
                        ),
                    ),
                    "pred_snapshot_version": case(
                        (locked_current, Match.pred_snapshot_version),
                        else_=func.coalesce(
                            stmt.excluded.pred_snapshot_version,
                            Match.pred_snapshot_version,
                        ),
                    ),
                    "synced_at": stmt.excluded.synced_at,
                },
            )
            await session.execute(stmt)
            await session.commit()

        invalidate_compute_cache()
        logger.info("Synced %d matches", len(rows))
        return len(rows)
