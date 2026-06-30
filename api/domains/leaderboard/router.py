from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from domains.leaderboard.schemas import LeaderboardEntry, PredictionResult
from domains.leaderboard.scoring import build_leaderboard
from domains.leaderboard.predictions import simulate_predictions
from domains.leagues.deps import get_league
from domains.members.models import League, Member
from services.football_api import fetch_matches

router = APIRouter(prefix="/leagues/{slug}/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    league: League = Depends(get_league),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Member)
        .where(Member.league_id == league.id)
        .options(selectinload(Member.teams))
    )
    db_members = result.scalars().all()

    members = [
        {
            "id": m.id,
            "name": m.name,
            "avatar_seed": m.avatar_seed,
            "team_codes": [t.team_code for t in m.teams],
        }
        for m in db_members
    ]

    matches = await fetch_matches()
    return build_leaderboard(members, matches)


@router.get("/predictions", response_model=PredictionResult)
async def get_predictions(
    league: League = Depends(get_league),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Member)
        .where(Member.league_id == league.id)
        .options(selectinload(Member.teams))
    )
    db_members = result.scalars().all()

    members = [
        {
            "id": m.id,
            "name": m.name,
            "avatar_seed": m.avatar_seed,
            "team_codes": [t.team_code for t in m.teams],
        }
        for m in db_members
    ]

    matches = await fetch_matches()
    return simulate_predictions(members, matches)
