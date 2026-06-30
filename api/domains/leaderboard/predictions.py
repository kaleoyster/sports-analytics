import random
from copy import deepcopy

from domains.leaderboard.scoring import build_leaderboard
from domains.leaderboard.schemas import MemberPrediction, PredictionResult
from domains.matches.schemas import MatchOut

FINISHED = "FINISHED"
UNPLAYED = {"SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "SUSPENDED"}
KNOCKOUT_STAGES = {
    "LAST_32",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "THIRD_PLACE",
    "FINAL",
}
SIMULATIONS = 2000


def _team_record(code: str, matches: list[MatchOut]) -> tuple[int, int, int, int]:
    """Returns wins, draws, losses, goal_difference from finished matches."""
    if not code:
        return 0, 0, 0, 0

    wins = draws = losses = 0
    goals_for = goals_against = 0

    for m in matches:
        if m.status != FINISHED:
            continue
        is_home = m.home_code == code
        is_away = m.away_code == code
        if not is_home and not is_away:
            continue

        if m.home_score is not None and m.away_score is not None:
            if is_home:
                goals_for += m.home_score
                goals_against += m.away_score
            else:
                goals_for += m.away_score
                goals_against += m.home_score

        if m.winner == "HOME_TEAM" and is_home:
            wins += 1
        elif m.winner == "AWAY_TEAM" and is_away:
            wins += 1
        elif m.winner == "DRAW":
            draws += 1
        else:
            losses += 1

    return wins, draws, losses, goals_for - goals_against


def _team_strength(code: str, matches: list[MatchOut]) -> float:
    wins, draws, losses, gd = _team_record(code, matches)
    games = wins + draws + losses
    if games == 0:
        return 1.0
    points_rate = (wins * 3 + draws) / games
    return max(0.3, points_rate + gd * 0.05)


def _is_eliminated(code: str, matches: list[MatchOut]) -> bool:
    if not code:
        return True

    for m in matches:
        if m.status != FINISHED or m.stage not in KNOCKOUT_STAGES:
            continue
        is_home = m.home_code == code
        is_away = m.away_code == code
        if not is_home and not is_away:
            continue
        if m.winner == "HOME_TEAM" and is_away:
            return True
        if m.winner == "AWAY_TEAM" and is_home:
            return True
    return False


def _simulate_match(m: MatchOut, matches: list[MatchOut]) -> MatchOut:
    home = m.home_code
    away = m.away_code
    if not home or not away:
        return m

    if _is_eliminated(home, matches) or _is_eliminated(away, matches):
        return m

    sh = _team_strength(home, matches)
    sa = _team_strength(away, matches)
    draw_weight = 0.35 if m.stage == "GROUP_STAGE" else 0.05
    total = sh + sa + draw_weight
    roll = random.random() * total

    sim = deepcopy(m)
    sim.status = FINISHED

    if roll < sh:
        sim.home_score = random.choice([1, 2, 2, 3])
        sim.away_score = random.randint(0, sim.home_score - 1) if sim.home_score > 0 else 0
        sim.winner = "HOME_TEAM"
    elif roll < sh + draw_weight:
        goals = random.choice([0, 1, 1, 2])
        sim.home_score = goals
        sim.away_score = goals
        sim.winner = "DRAW"
    else:
        sim.away_score = random.choice([1, 2, 2, 3])
        sim.home_score = random.randint(0, sim.away_score - 1) if sim.away_score > 0 else 0
        sim.winner = "AWAY_TEAM"

    return sim


def _simulate_remaining(matches: list[MatchOut]) -> list[MatchOut]:
    sim_matches = deepcopy(matches)
    for i, m in enumerate(sim_matches):
        if m.status in UNPLAYED and m.home_code and m.away_code:
            sim_matches[i] = _simulate_match(m, sim_matches)
    return sim_matches


def _leaderboard_winner(
    members: list[dict], matches: list[MatchOut]
) -> tuple[int, int]:
    """Returns (member_id, total_points) for the simulation winner."""
    entries = build_leaderboard(members, matches)
    if not entries:
        return -1, 0

    top = entries[0]
    top_key = (top.total_points, top.total_goal_difference)
    leaders = [
        e
        for e in entries
        if (e.total_points, e.total_goal_difference) == top_key
    ]
    return random.choice(leaders).member_id, top.total_points


def simulate_predictions(
    members: list[dict], matches: list[MatchOut]
) -> PredictionResult:
    if not members:
        return PredictionResult(
            simulations=0,
            remaining_matches=0,
            predictions=[],
        )

    remaining = sum(
        1
        for m in matches
        if m.status in UNPLAYED and m.home_code and m.away_code
    )

    if remaining == 0:
        current = build_leaderboard(members, matches)
        predictions = [
            MemberPrediction(
                member_id=e.member_id,
                member_name=e.member_name,
                avatar_seed=e.avatar_seed,
                win_probability=100.0 if e.rank == 1 else 0.0,
                current_points=e.total_points,
                projected_points_avg=float(e.total_points),
            )
            for e in current
        ]
        # Split 100% among tied leaders
        leaders = [p for p in predictions if p.win_probability == 100.0]
        if len(leaders) > 1:
            share = 100.0 / len(leaders)
            for p in predictions:
                p.win_probability = share if p in leaders else 0.0
        return PredictionResult(
            simulations=0,
            remaining_matches=0,
            predictions=predictions,
        )

    win_counts: dict[int, int] = {m["id"]: 0 for m in members}
    projected_totals: dict[int, list[int]] = {m["id"]: [] for m in members}
    current_board = build_leaderboard(members, matches)
    current_points = {e.member_id: e.total_points for e in current_board}

    for _ in range(SIMULATIONS):
        sim_matches = _simulate_remaining(matches)
        winner_id, _ = _leaderboard_winner(members, sim_matches)
        if winner_id >= 0:
            win_counts[winner_id] += 1

        sim_board = build_leaderboard(members, sim_matches)
        for entry in sim_board:
            projected_totals[entry.member_id].append(entry.total_points)

    predictions = []
    for member in members:
        mid = member["id"]
        wins = win_counts[mid]
        avg_projected = (
            sum(projected_totals[mid]) / len(projected_totals[mid])
            if projected_totals[mid]
            else float(current_points.get(mid, 0))
        )
        predictions.append(
            MemberPrediction(
                member_id=mid,
                member_name=member["name"],
                avatar_seed=member["avatar_seed"],
                win_probability=round(wins / SIMULATIONS * 100, 1),
                current_points=current_points.get(mid, 0),
                projected_points_avg=round(avg_projected, 1),
            )
        )

    predictions.sort(
        key=lambda p: (p.win_probability, p.projected_points_avg),
        reverse=True,
    )

    return PredictionResult(
        simulations=SIMULATIONS,
        remaining_matches=remaining,
        predictions=predictions,
    )
