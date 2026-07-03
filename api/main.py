from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import engine
from domains.members.models import Base
from domains.matches import models as match_models  # noqa: F401 — register Match table
from domains.leagues.router import router as leagues_router
from domains.members.router import router as members_router
from domains.matches.router import router as matches_router
from domains.leaderboard.router import router as leaderboard_router
from services.match_sync import run_match_sync_loop
from services.schema_migrations import ensure_match_prediction_columns


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_match_prediction_columns(engine)

    sync_task = asyncio.create_task(run_match_sync_loop())
    try:
        yield
    finally:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass


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
