from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

_MATCH_PREDICTION_COLUMNS = [
    ("pred_home_pct", "REAL"),
    ("pred_draw_pct", "REAL"),
    ("pred_away_pct", "REAL"),
    ("pred_winner", "VARCHAR(10)"),
    ("pred_pct", "REAL"),
    ("pred_locked_at", "TIMESTAMPTZ"),
    ("pred_snapshot_version", "INTEGER"),
]


async def ensure_match_prediction_columns(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        for name, col_type in _MATCH_PREDICTION_COLUMNS:
            await conn.execute(
                text(f"ALTER TABLE matches ADD COLUMN IF NOT EXISTS {name} {col_type}")
            )
