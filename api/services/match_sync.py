import asyncio
import logging

from config import settings
from services.match_store import sync_matches

logger = logging.getLogger(__name__)


async def run_match_sync_loop() -> None:
    """Background task: refresh match data on a fixed interval."""
    interval = settings.match_sync_interval_seconds
    logger.info("Match sync loop started (every %ds)", interval)

    while True:
        try:
            await sync_matches()
        except Exception:
            logger.exception("Match sync failed")
        await asyncio.sleep(interval)
