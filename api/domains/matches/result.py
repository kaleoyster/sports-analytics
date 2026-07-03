from domains.matches.schemas import MatchOut


def infer_winner_from_score(score: dict) -> str | None:
    """Infer HOME_TEAM / AWAY_TEAM / DRAW from football-data.org score node."""
    winner = score.get("winner")
    if winner in ("HOME_TEAM", "AWAY_TEAM", "DRAW"):
        return winner

    ft = score.get("fullTime") or {}
    home = ft.get("home")
    away = ft.get("away")
    if home is not None and away is not None:
        if home > away:
            return "HOME_TEAM"
        if away > home:
            return "AWAY_TEAM"

    pens = score.get("penalties") or {}
    pen_home = pens.get("home")
    pen_away = pens.get("away")
    if pen_home is not None and pen_away is not None and pen_home != pen_away:
        return "HOME_TEAM" if pen_home > pen_away else "AWAY_TEAM"

    if home is not None and away is not None and home == away:
        return "DRAW"
    return None


def match_winner_side(m: MatchOut) -> str | None:
    """Return HOME, AWAY, or None for a draw.

    Trusts API winner when set, but falls back to the scoreline when winner is
    missing or inconsistent (e.g. penalty shootouts with null winner field).
    """
    if m.winner == "HOME_TEAM":
        return "HOME"
    if m.winner == "AWAY_TEAM":
        return "AWAY"
    if m.home_score is not None and m.away_score is not None:
        if m.home_score > m.away_score:
            return "HOME"
        if m.away_score > m.home_score:
            return "AWAY"
    return None
