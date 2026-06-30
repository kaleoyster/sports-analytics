from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import engine
from domains.members.models import Base
from domains.leagues.router import router as leagues_router
from domains.members.router import router as members_router
from domains.matches.router import router as matches_router
from domains.leaderboard.router import router as leaderboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="World Cup 2026 Family Leaderboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leagues_router)
app.include_router(members_router)
app.include_router(matches_router)
app.include_router(leaderboard_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/teams")
async def list_teams():
    from services.football_api import fetch_teams
    return await fetch_teams()
