from fastapi import APIRouter
from domains.leaderboard.predictions import (
    compute_all_match_probabilities,
    compute_model_accuracy,
)
from domains.matches.schemas import MatchOut, MatchProbabilitiesOut, ModelAccuracyOut
from services.compute_cache import get_cached, matches_fingerprint
from services.football_api import fetch_matches

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchOut])
async def list_matches(status: str | None = None):
    matches = await fetch_matches()
    if status:
        matches = [m for m in matches if m.status == status.upper()]
    return matches


@router.get("/probabilities", response_model=list[MatchProbabilitiesOut])
async def list_match_probabilities():
    matches = await fetch_matches()
    fp = matches_fingerprint(matches)
    return get_cached(
        f"probabilities:{fp}",
        lambda: compute_all_match_probabilities(matches),
    )


@router.get("/accuracy", response_model=ModelAccuracyOut)
async def get_model_accuracy():
    matches = await fetch_matches()
    fp = matches_fingerprint(matches)
    return get_cached(
        f"accuracy:{fp}",
        lambda: compute_model_accuracy(matches),
    )
