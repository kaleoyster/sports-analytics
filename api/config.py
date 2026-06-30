from pydantic import field_validator
from pydantic_settings import BaseSettings


def _normalize_database_url(url: str) -> str:
    """Accept postgres:// URLs from Neon, Supabase, Railway, etc."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    football_api_key: str = ""
    football_api_base: str = "https://api.football-data.org/v4"
    competition_code: str = "WC"
    database_url: str = "postgresql+asyncpg://wc2026:wc2026pass@localhost:5432/wc2026"
    database_ssl: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        return _normalize_database_url(v)


settings = Settings()
