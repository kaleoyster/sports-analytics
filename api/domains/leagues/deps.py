import re
import secrets
import string

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from domains.members.models import League

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    base = _SLUG_RE.sub("-", name.lower()).strip("-")
    return base or "league"


def generate_slug(name: str) -> str:
    """Slug from the name plus a short random suffix to avoid collisions."""
    suffix = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    return f"{slugify(name)[:40]}-{suffix}"


def generate_invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def generate_admin_token() -> str:
    return secrets.token_urlsafe(32)


async def get_league(slug: str, db: AsyncSession = Depends(get_db)) -> League:
    result = await db.execute(select(League).where(League.slug == slug))
    league = result.scalar_one_or_none()
    if not league:
        raise HTTPException(404, "League not found")
    return league


async def require_admin(
    slug: str,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(default=None),
) -> League:
    league = await get_league(slug, db)
    if not x_admin_token or not secrets.compare_digest(x_admin_token, league.admin_token):
        raise HTTPException(403, "Admin token required or invalid")
    return league


async def require_invite(
    slug: str,
    db: AsyncSession = Depends(get_db),
    x_invite_code: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> League:
    """Allow either a valid invite code or the admin token to add members."""
    league = await get_league(slug, db)
    is_admin = bool(x_admin_token) and secrets.compare_digest(
        x_admin_token, league.admin_token
    )
    has_invite = bool(x_invite_code) and secrets.compare_digest(
        x_invite_code.upper(), league.invite_code
    )
    if not (is_admin or has_invite):
        raise HTTPException(403, "Valid invite code required")
    return league
