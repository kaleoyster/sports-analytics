from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
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
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
