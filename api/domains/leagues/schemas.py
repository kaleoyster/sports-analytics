from datetime import datetime

from pydantic import BaseModel


class LeagueCreate(BaseModel):
    name: str


class LeagueOut(BaseModel):
    """Public league info — never exposes invite_code or admin_token."""

    id: int
    name: str
    slug: str
    picks_locked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LeagueAdminOut(LeagueOut):
    """Returned to the admin — includes the shareable invite code."""

    invite_code: str


class LeagueCreated(LeagueAdminOut):
    """Returned once on creation — also includes the admin token to keep safe."""

    admin_token: str


class LockUpdate(BaseModel):
    locked: bool
