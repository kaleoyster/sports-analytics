from pydantic import BaseModel


class ScoreLineItem(BaseModel):
    label: str
    points: int
    category: str  # "match" | "stage" | "loss"


class TeamScore(BaseModel):
    team_code: str
    team_name: str
    match_wins: int = 0
    match_draws: int = 0
    match_losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    goal_difference: int = 0
    match_points: int = 0
    stage_bonus: int = 0
    total_points: int = 0
    furthest_stage: str = "GROUP_STAGE"
    breakdown: list[ScoreLineItem] = []


class LeaderboardEntry(BaseModel):
    rank: int
    member_id: int
    member_name: str
    avatar_seed: str
    total_points: int
    total_goal_difference: int = 0
    teams: list[TeamScore]


class MemberPrediction(BaseModel):
    member_id: int
    member_name: str
    avatar_seed: str
    win_probability: float
    current_points: int
    projected_points_avg: float


class PredictionResult(BaseModel):
    simulations: int
    remaining_matches: int
    predictions: list[MemberPrediction]
