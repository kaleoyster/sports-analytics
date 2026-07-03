from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from domains.members.models import Base


class Match(Base):
    __tablename__ = "matches"

    match_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    utc_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    stage: Mapped[str] = mapped_column(String(30), nullable=False)
    match_group: Mapped[str | None] = mapped_column(String(10))
    home_team: Mapped[str] = mapped_column(String(100), nullable=False)
    home_code: Mapped[str] = mapped_column(String(10), nullable=False)
    away_team: Mapped[str] = mapped_column(String(100), nullable=False)
    away_code: Mapped[str] = mapped_column(String(10), nullable=False)
    home_score: Mapped[int | None] = mapped_column(Integer)
    away_score: Mapped[int | None] = mapped_column(Integer)
    winner: Mapped[str | None] = mapped_column(String(15))
    pred_home_pct: Mapped[float | None] = mapped_column(Float)
    pred_draw_pct: Mapped[float | None] = mapped_column(Float)
    pred_away_pct: Mapped[float | None] = mapped_column(Float)
    pred_winner: Mapped[str | None] = mapped_column(String(10))
    pred_pct: Mapped[float | None] = mapped_column(Float)
    pred_locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pred_snapshot_version: Mapped[int | None] = mapped_column(Integer)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
