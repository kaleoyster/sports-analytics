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


class MatchProbabilitiesOut(BaseModel):
    match_id: int
    home_win_pct: float
    draw_pct: float
    away_win_pct: float
    penalties_pct: float = 0.0


class MatchPredictionRecord(BaseModel):
    match_id: int
    utc_date: str
    stage: str
    home_code: str
    away_code: str
    home_team: str
    away_team: str
    predicted_winner: str  # "HOME", "AWAY", or "DRAW"
    predicted_pct: float
    actual_winner: str  # "HOME", "AWAY", or "DRAW"
    correct: bool
    home_win_pct: float
    draw_pct: float
    away_win_pct: float
    home_score: int
    away_score: int


class ModelAccuracyOut(BaseModel):
    total: int
    correct: int
    incorrect: int
    accuracy_pct: float
    records: list[MatchPredictionRecord]
