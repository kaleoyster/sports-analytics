from pydantic import BaseModel
from datetime import datetime


class TeamOut(BaseModel):
    team_code: str
    team_name: str

    model_config = {"from_attributes": True}


class MemberOut(BaseModel):
    id: int
    name: str
    avatar_seed: str
    created_at: datetime
    teams: list[TeamOut]

    model_config = {"from_attributes": True}


class MemberCreate(BaseModel):
    name: str
    avatar_seed: str = ""
    team_codes: list[str]


class MemberUpdate(BaseModel):
    name: str | None = None
    avatar_seed: str | None = None
    team_codes: list[str] | None = None
