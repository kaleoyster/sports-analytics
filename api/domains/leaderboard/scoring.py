from domains.leaderboard.schemas import TeamScore, LeaderboardEntry, ScoreLineItem
from domains.matches.schemas import MatchOut

STAGE_BONUS = {
    "LAST_16": 5,
    "QUARTER_FINALS": 3,
    "SEMI_FINALS": 5,
    "THIRD_PLACE": 2,
    "FINAL": 8,
}

STAGE_LABELS = {
    "LAST_16": "Round of 16",
    "QUARTER_FINALS": "Quarter-finals",
    "SEMI_FINALS": "Semi-finals",
    "THIRD_PLACE": "Third-place match",
    "FINAL": "Final",
}

STAGE_ORDER = [
    "GROUP_STAGE",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "THIRD_PLACE",
    "FINAL",
]


def _stage_rank(stage: str) -> int:
    try:
        return STAGE_ORDER.index(stage)
    except ValueError:
        return 0


def _stage_name(stage: str) -> str:
    if stage == "GROUP_STAGE":
        return "Group stage"
    return STAGE_LABELS.get(stage, stage.replace("_", " ").title())


def _format_score(home: int | None, away: int | None) -> str:
    h = home if home is not None else "–"
    a = away if away is not None else "–"
    return f"{h}-{a}"


def _score_team(team_code: str, matches: list[MatchOut]) -> TeamScore:
    wins = draws = losses = match_points = stage_bonus = 0
    goals_for = goals_against = 0
    furthest = "GROUP_STAGE"
    seen_stages: set[str] = set()
    team_name = team_code
    breakdown: list[ScoreLineItem] = []

    for m in matches:
        if m.status != "FINISHED":
            continue

        is_home = m.home_code == team_code
        is_away = m.away_code == team_code
        if not is_home and not is_away:
            continue

        opponent = m.away_team if is_home else m.home_team
        if is_home:
            team_name = m.home_team
        else:
            team_name = m.away_team

        if m.home_score is not None and m.away_score is not None:
            if is_home:
                goals_for += m.home_score
                goals_against += m.away_score
            else:
                goals_for += m.away_score
                goals_against += m.home_score

        score = _format_score(m.home_score, m.away_score)
        stage_label = _stage_name(m.stage)

        if _stage_rank(m.stage) > _stage_rank(furthest):
            furthest = m.stage

        if m.winner == "HOME_TEAM" and is_home:
            wins += 1
            match_points += 3
            breakdown.append(
                ScoreLineItem(
                    label=f"Win vs {opponent} ({score}) — {stage_label}",
                    points=3,
                    category="match",
                )
            )
        elif m.winner == "AWAY_TEAM" and is_away:
            wins += 1
            match_points += 3
            breakdown.append(
                ScoreLineItem(
                    label=f"Win vs {opponent} ({score}) — {stage_label}",
                    points=3,
                    category="match",
                )
            )
        elif m.winner == "DRAW":
            draws += 1
            match_points += 1
            breakdown.append(
                ScoreLineItem(
                    label=f"Draw vs {opponent} ({score}) — {stage_label}",
                    points=1,
                    category="match",
                )
            )
        else:
            losses += 1
            breakdown.append(
                ScoreLineItem(
                    label=f"Loss vs {opponent} ({score}) — {stage_label}",
                    points=0,
                    category="loss",
                )
            )

        if m.stage != "GROUP_STAGE" and m.stage not in seen_stages:
            bonus = STAGE_BONUS.get(m.stage, 0)
            if bonus:
                stage_bonus += bonus
                breakdown.append(
                    ScoreLineItem(
                        label=f"Reached {_stage_name(m.stage)}",
                        points=bonus,
                        category="stage",
                    )
                )
            seen_stages.add(m.stage)

    goal_difference = goals_for - goals_against

    return TeamScore(
        team_code=team_code,
        team_name=team_name,
        match_wins=wins,
        match_draws=draws,
        match_losses=losses,
        goals_for=goals_for,
        goals_against=goals_against,
        goal_difference=goal_difference,
        match_points=match_points,
        stage_bonus=stage_bonus,
        total_points=match_points + stage_bonus,
        furthest_stage=furthest,
        breakdown=breakdown,
    )


def _entry_sort_key(entry: LeaderboardEntry) -> tuple[int, int]:
    return (entry.total_points, entry.total_goal_difference)


def build_leaderboard(
    members: list[dict], matches: list[MatchOut]
) -> list[LeaderboardEntry]:
    """members: list of dicts with keys name, avatar_seed, team_codes"""
    entries: list[LeaderboardEntry] = []

    for member in members:
        team_scores = [_score_team(code, matches) for code in member["team_codes"]]
        total = sum(ts.total_points for ts in team_scores)
        total_gd = sum(ts.goal_difference for ts in team_scores)
        entries.append(
            LeaderboardEntry(
                rank=0,
                member_id=member["id"],
                member_name=member["name"],
                avatar_seed=member["avatar_seed"],
                total_points=total,
                total_goal_difference=total_gd,
                teams=team_scores,
            )
        )

    entries.sort(key=_entry_sort_key, reverse=True)
    for i, entry in enumerate(entries):
        if i == 0:
            entry.rank = 1
        elif _entry_sort_key(entry) == _entry_sort_key(entries[i - 1]):
            entry.rank = entries[i - 1].rank
        else:
            entry.rank = i + 1

    return entries
