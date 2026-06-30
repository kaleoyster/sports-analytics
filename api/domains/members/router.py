from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from domains.leagues.deps import get_league, require_admin, require_invite
from domains.members.models import League, Member, MemberTeam
from domains.members.schemas import MemberCreate, MemberOut, MemberUpdate
from services.football_api import fetch_teams

router = APIRouter(prefix="/leagues/{slug}/members", tags=["members"])


async def _team_name_map() -> dict[str, str]:
    try:
        all_teams = await fetch_teams()
    except Exception:
        all_teams = []
    return {t["code"]: t["name"] for t in all_teams}


@router.get("", response_model=list[MemberOut])
async def list_members(
    league: League = Depends(get_league),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Member)
        .where(Member.league_id == league.id)
        .options(selectinload(Member.teams))
        .order_by(Member.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=MemberOut, status_code=201)
async def create_member(
    body: MemberCreate,
    league: League = Depends(require_invite),
    db: AsyncSession = Depends(get_db),
):
    if league.picks_locked:
        raise HTTPException(423, "Picks are locked for this league")
    if len(body.team_codes) != 2:
        raise HTTPException(400, "Exactly 2 team codes required")

    existing = await db.execute(
        select(Member).where(Member.league_id == league.id, Member.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"'{body.name}' already exists in this league")

    team_map = await _team_name_map()
    seed = body.avatar_seed or body.name
    member = Member(league_id=league.id, name=body.name, avatar_seed=seed)
    for code in body.team_codes:
        uc = code.upper()
        member.teams.append(MemberTeam(team_code=uc, team_name=team_map.get(uc, uc)))

    db.add(member)
    await db.commit()
    await db.refresh(member, attribute_names=["teams"])
    return member


async def _get_member(member_id: int, league: League, db: AsyncSession) -> Member:
    result = await db.execute(
        select(Member)
        .where(Member.id == member_id, Member.league_id == league.id)
        .options(selectinload(Member.teams))
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Member not found")
    return member


@router.patch("/{member_id}", response_model=MemberOut)
async def update_member(
    member_id: int,
    body: MemberUpdate,
    league: League = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member(member_id, league, db)

    if body.name is not None:
        member.name = body.name
    if body.avatar_seed is not None:
        member.avatar_seed = body.avatar_seed or member.name

    if body.team_codes is not None:
        if league.picks_locked:
            raise HTTPException(423, "Picks are locked for this league")
        if len(body.team_codes) != 2:
            raise HTTPException(400, "Exactly 2 team codes required")
        team_map = await _team_name_map()
        member.teams.clear()
        for code in body.team_codes:
            uc = code.upper()
            member.teams.append(
                MemberTeam(team_code=uc, team_name=team_map.get(uc, uc))
            )

    await db.commit()
    await db.refresh(member, attribute_names=["teams"])
    return member


@router.delete("/{member_id}", status_code=204)
async def delete_member(
    member_id: int,
    league: League = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member(member_id, league, db)
    await db.delete(member)
    await db.commit()
