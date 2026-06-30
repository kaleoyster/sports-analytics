from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from domains.leagues.deps import (
    generate_admin_token,
    generate_invite_code,
    generate_slug,
    get_league,
    require_admin,
)
from domains.leagues.schemas import (
    LeagueAdminOut,
    LeagueCreate,
    LeagueCreated,
    LeagueOut,
    LockUpdate,
)
from domains.members.models import League

router = APIRouter(prefix="/leagues", tags=["leagues"])


@router.post("", response_model=LeagueCreated, status_code=201)
async def create_league(body: LeagueCreate, db: AsyncSession = Depends(get_db)):
    name = body.name.strip() or "Our League"
    league = League(
        name=name,
        slug=generate_slug(name),
        invite_code=generate_invite_code(),
        admin_token=generate_admin_token(),
        picks_locked=False,
    )
    db.add(league)
    await db.commit()
    await db.refresh(league)
    return league


@router.get("/{slug}", response_model=LeagueOut)
async def get_league_public(league: League = Depends(get_league)):
    return league


@router.get("/{slug}/admin", response_model=LeagueAdminOut)
async def get_league_admin(league: League = Depends(require_admin)):
    """Admin view — exposes the invite code so it can be re-shared."""
    return league


@router.post("/{slug}/lock", response_model=LeagueOut)
async def set_lock(
    body: LockUpdate,
    league: League = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    league.picks_locked = body.locked
    await db.commit()
    await db.refresh(league)
    return league
