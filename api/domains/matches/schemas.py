from pydantic import BaseModel


class MatchOut(BaseModel):
    match_id: int
    utc_date: str
    status: str
    stage: str
    group: str | None = None
    home_team: str
    home_code: str
    away_team: str
    away_code: str
    home_score: int | None = None
    away_score: int | None = None
    winner: str | None = None
