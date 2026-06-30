from fastapi import APIRouter
from domains.matches.schemas import MatchOut
from services.football_api import fetch_matches

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchOut])
async def list_matches(status: str | None = None):
    matches = await fetch_matches()
    if status:
        matches = [m for m in matches if m.status == status.upper()]
    return matches
