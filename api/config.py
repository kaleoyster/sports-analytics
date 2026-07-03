from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import field_validator
from pydantic_settings import BaseSettings

# libpq-style params Neon/Supabase append — asyncpg rejects these in the URL
_STRIP_QUERY_PARAMS = frozenset(
    {"sslmode", "channel_binding", "sslcert", "sslkey", "sslrootcert"}
)


def _normalize_database_url(url: str) -> str:
    """Accept postgres:// URLs from Neon, Supabase, Railway, etc."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    if not parsed.query:
        return url

    params = parse_qs(parsed.query, keep_blank_values=True)
    filtered = {k: v for k, v in params.items() if k.lower() not in _STRIP_QUERY_PARAMS}
    return urlunparse(parsed._replace(query=urlencode(filtered, doseq=True)))


class Settings(BaseSettings):
    football_api_key: str = ""
    football_api_base: str = "https://api.football-data.org/v4"
    competition_code: str = "WC"
    database_url: str = "postgresql+asyncpg://wc2026:wc2026pass@localhost:5432/wc2026"
    database_ssl: bool = False
    match_sync_interval_seconds: int = 120
    compute_cache_ttl_seconds: int = 120

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        return _normalize_database_url(v)


settings = Settings()
