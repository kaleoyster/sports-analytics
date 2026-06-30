from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(60), unique=True, nullable=False, index=True)
    invite_code = Column(String(20), nullable=False)
    admin_token = Column(String(64), nullable=False)
    picks_locked = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime, server_default=func.now())

    members = relationship(
        "Member", back_populates="league", cascade="all, delete-orphan"
    )


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("league_id", "name", name="uq_member_league_name"),)

    id = Column(Integer, primary_key=True)
    league_id = Column(
        Integer, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False)
    avatar_seed = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    league = relationship("League", back_populates="members")
    teams = relationship("MemberTeam", back_populates="member", cascade="all, delete-orphan")


class MemberTeam(Base):
    __tablename__ = "member_teams"

    id = Column(Integer, primary_key=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    team_code = Column(String(10), nullable=False)
    team_name = Column(String(100), nullable=False)

    member = relationship("Member", back_populates="teams")
