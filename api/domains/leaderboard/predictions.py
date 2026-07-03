import random
from copy import deepcopy

from domains.leaderboard.scoring import build_leaderboard
from domains.leaderboard.schemas import MemberPrediction, PredictionResult
from domains.matches.result import match_winner_side
from domains.matches.schemas import MatchOut

PREDICTION_SNAPSHOT_VERSION = 2

FINISHED = "FINISHED"
UNPLAYED = {"SCHEDULED", "TIMED"}
PLAYED = {"IN_PLAY", "PAUSED", "FINISHED", "SUSPENDED"}
LIVE_STATUSES = {"IN_PLAY", "PAUSED"}
KNOCKOUT_STAGES = {
    "LAST_32",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "THIRD_PLACE",
    "FINAL",
}
SIMULATIONS = 2000

# Prior strength based on FIFA ranking + World Cup knockout pedigree.
# Regional trophies (Gold Cup, etc.) count less than WC depth.
# Scale: ~2.6–3.0 elite, ~2.0–2.4 strong WC pedigree, ~1.3–1.7 solid,
#         ~1.0–1.2 mid, ~0.6–0.9 underdogs.
_PRIOR_STRENGTH: dict[str, float] = {
    # Elite — FIFA WC winners with deep knockout history
    "ARG": 3.0,   # Rank 1, 3 WCs, reigning champion
    "FRA": 2.9,   # Rank 2, 2 WCs, WC final 2022
    "BRA": 2.8,   # Rank 5, 5 WCs (record holder)
    "ESP": 2.7,   # Rank 3, 1 WC, 4 Euros
    "ENG": 2.6,   # Rank 4, 1 WC, WC semi 2018
    # Strong — consistent WC QF+ or deep runs
    "GER": 2.4,   # 4 WCs, WC pedigree (not in doc but historically elite)
    "NED": 2.3,   # 3 WC finals, never won but always deep
    "POR": 2.2,   # Rank 8, Euro winner, WC semi 2006
    "CRO": 2.1,   # Rank 13, WC final 2018, 3rd 2022 — no trophies but WC depth
    "BEL": 2.0,   # Rank 10, WC 3rd 2018
    "MAR": 2.0,   # Rank 6, WC semi 2022 (historic run)
    # Solid — decent ranking, some WC/continental presence
    "COL": 1.7,   # Rank 11, Copa winner, WC QF 2014
    "SUI": 1.6,   # Rank 16, WC R16 regular, QF Euro 2020
    "JAP": 1.5,   # WC R16 2022, 4 Asian Cups
    "SEN": 1.5,   # AFCON 2021 winner, WC QF 2002
    "ECU": 1.4,   # WC R16 regular
    "SWE": 1.4,   # WC QF 2018
    "AUT": 1.3,   # Decent Euro pedigree
    # Mid — high FIFA rank but never deep in WC knockouts
    "MEX": 1.4,   # Rank 9, 12 Gold Cups but NEVER past WC QF (R16 curse)
    "USA": 1.3,   # Rank 15, 7 Gold Cups but NEVER past WC QF
    "NOR": 1.2,   # Rank 21, no major tournament success
    "AUS": 1.2,   # Rank 28, WC R16 2022
    "ALG": 1.1,   # Rank 29, 2 AFCONs, WC R16 2014
    "CAN": 1.0,   # Rank 30, limited WC history
    "CIV": 1.1,   # 2 AFCONs, WC group exits
    "EGY": 1.0,   # 7 AFCONs but poor WC record
    "GHA": 1.0,   # Rank 65, WC QF 2010 but declined since
    # Underdogs — low ranking, minimal WC knockout experience
    "PAR": 0.9,   # Rank 34, WC QF 2010 best
    "RSA": 0.8,   # Rank 54, hosted 2010 but group exit
    "COD": 0.7,   # Rank 41, 2 AFCONs but no WC depth
    "BIH": 0.7,   # Rank 61, one WC appearance (2014 group exit)
    "CPV": 0.6,   # Rank 64, first WC ever, regional cup only
}
_DEFAULT_PRIOR = 1.0

# After this many tournament games, current form fully overrides the prior.
_FORM_GAMES_FULL = 4


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

        side = match_winner_side(m)
        if side == "HOME" and is_home:
            wins += 1
        elif side == "AWAY" and is_away:
            wins += 1
        elif side is None:
            draws += 1
        else:
            losses += 1

    return wins, draws, losses, goals_for - goals_against


def _team_strength(code: str, matches: list[MatchOut]) -> float:
    prior = _PRIOR_STRENGTH.get(code, _DEFAULT_PRIOR)
    wins, draws, losses, gd = _team_record(code, matches)
    games = wins + draws + losses
    if games == 0:
        return prior

    current_form = max(0.3, (wins * 3 + draws) / games + gd * 0.05)

    # Blend: prior dominates early, current form grows but prior never drops below 20%
    form_weight = min(games / _FORM_GAMES_FULL, 1.0) * 0.8
    return prior * (1 - form_weight) + current_form * form_weight


def _is_knockout(stage: str) -> bool:
    return stage != "GROUP_STAGE"


def _knockout_regulation_draw_prob(sh: float, sa: float) -> float:
    """Closer teams are more likely to be level after 90 minutes (+ extra time)."""
    closeness = min(sh, sa) / max(sh, sa, 0.3)
    return 0.2 * closeness


def _score_for_winner(winner_strength: float, loser_strength: float) -> tuple[int, int]:
    """Bigger strength gaps produce larger winning margins."""
    ratio = winner_strength / max(loser_strength, 0.3)
    if ratio >= 3.0:
        winner_goals = random.choice([2, 3, 3, 4, 4])
        loser_goals = random.randint(0, max(0, winner_goals - 2))
    elif ratio >= 2.0:
        winner_goals = random.choice([2, 2, 3, 3])
        loser_goals = random.randint(0, winner_goals - 1)
    elif ratio >= 1.4:
        winner_goals = random.choice([1, 2, 2, 3])
        loser_goals = random.randint(0, winner_goals - 1)
    else:
        winner_goals = random.choice([1, 1, 2, 2])
        loser_goals = random.randint(0, winner_goals - 1)
    return winner_goals, loser_goals


def _resolve_penalties(home_strength: float, away_strength: float) -> str:
    """After extra time; winner decided on penalties (strength-weighted)."""
    total = home_strength + away_strength
    return "HOME_TEAM" if random.random() * total < home_strength else "AWAY_TEAM"


def _adjust_for_live_score(
    home_win: float,
    draw: float,
    away_win: float,
    home_score: int | None,
    away_score: int | None,
    knockout: bool,
) -> tuple[float, float, float]:
    """Boost the team that is ahead when a match is in progress."""
    if home_score is None or away_score is None:
        return home_win, draw, away_win

    diff = home_score - away_score
    if diff == 0:
        return home_win, draw, away_win

    lead_boost = min(0.45, 0.12 + abs(diff) * 0.12)
    if diff > 0:
        home_win = min(0.98, home_win + lead_boost)
        away_win = max(0.02, away_win - lead_boost * 0.85)
        if not knockout:
            draw = max(0.02, draw - lead_boost * 0.15)
    else:
        away_win = min(0.98, away_win + lead_boost)
        home_win = max(0.02, home_win - lead_boost * 0.85)
        if not knockout:
            draw = max(0.02, draw - lead_boost * 0.15)

    total = home_win + draw + away_win
    return home_win / total, draw / total, away_win / total


def compute_match_probabilities(
    m: MatchOut, matches: list[MatchOut]
) -> dict[str, float] | None:
    """Win/draw/penalty probabilities for an unplayed or live match."""
    if m.status == FINISHED or not m.home_code or not m.away_code:
        return None
    if _is_eliminated(m.home_code, matches) or _is_eliminated(m.away_code, matches):
        return None

    sh = _team_strength(m.home_code, matches)
    sa = _team_strength(m.away_code, matches)
    knockout = _is_knockout(m.stage)
    draw_weight = _knockout_regulation_draw_prob(sh, sa) if knockout else 0.35
    total = sh + sa + draw_weight

    home_reg = sh / total
    tie_reg = draw_weight / total
    away_reg = sa / total

    if knockout:
        pen_home = sh / (sh + sa)
        pen_away = sa / (sh + sa)
        home_win = home_reg + tie_reg * pen_home
        away_win = away_reg + tie_reg * pen_away
        draw = 0.0
        penalties_pct = tie_reg * 100
    else:
        home_win = home_reg
        draw = tie_reg
        away_win = away_reg
        penalties_pct = 0.0

    if m.status in LIVE_STATUSES:
        home_win, draw, away_win = _adjust_for_live_score(
            home_win,
            draw,
            away_win,
            m.home_score,
            m.away_score,
            knockout,
        )
        if knockout:
            penalties_pct = tie_reg * 100

    return {
        "home_win_pct": round(home_win * 100, 1),
        "draw_pct": round(draw * 100, 1),
        "away_win_pct": round(away_win * 100, 1),
        "penalties_pct": round(penalties_pct, 1),
    }


def compute_all_match_probabilities(
    matches: list[MatchOut],
) -> list[dict[str, float | int]]:
    from services.bracket_order import fill_inferred_winners

    enriched = fill_inferred_winners(matches)
    results: list[dict[str, float | int]] = []
    for m in enriched:
        probs = compute_match_probabilities(m, matches)
        if probs:
            results.append({"match_id": m.match_id, **probs})
    return results


def _matches_before_kickoff(
    match: MatchOut, all_matches: list[MatchOut]
) -> list[MatchOut]:
    """Finished matches that were known before this fixture kicked off."""
    cutoff = match.utc_date
    mid = match.match_id
    return [
        m
        for m in all_matches
        if m.status == FINISHED
        and m.match_id != match.match_id
        and (m.utc_date < cutoff or (m.utc_date == cutoff and m.match_id < mid))
    ]


def _pre_match_strength(code: str, match: MatchOut, all_matches: list[MatchOut]) -> float:
    """Team strength using only matches finished before this one kicked off."""
    prior_matches = _matches_before_kickoff(match, all_matches)
    prior = _PRIOR_STRENGTH.get(code, _DEFAULT_PRIOR)
    wins, draws, losses, gd = _team_record(code, prior_matches)
    games = wins + draws + losses
    if games == 0:
        return prior
    current_form = max(0.3, (wins * 3 + draws) / games + gd * 0.05)
    form_weight = min(games / _FORM_GAMES_FULL, 1.0) * 0.8
    return prior * (1 - form_weight) + current_form * form_weight


def compute_pre_kickoff_probabilities(
    m: MatchOut, matches: list[MatchOut]
) -> dict[str, float | str] | None:
    """Same formula as the bracket prob bar before kickoff — no live-score boost."""
    if not m.home_code or not m.away_code:
        return None

    as_of = _matches_before_kickoff(m, matches)
    scheduled = m.model_copy(
        update={
            "status": "SCHEDULED",
            "home_score": None,
            "away_score": None,
            "winner": None,
        }
    )
    probs = compute_match_probabilities(scheduled, as_of)
    if not probs:
        return None

    home_pct = float(probs["home_win_pct"])
    draw_pct = float(probs["draw_pct"])
    away_pct = float(probs["away_win_pct"])

    if home_pct >= away_pct and home_pct >= draw_pct:
        predicted_winner = "HOME"
        predicted_pct = home_pct
    elif away_pct >= home_pct and away_pct >= draw_pct:
        predicted_winner = "AWAY"
        predicted_pct = away_pct
    else:
        predicted_winner = "DRAW"
        predicted_pct = draw_pct

    return {
        "home_win_pct": home_pct,
        "draw_pct": draw_pct,
        "away_win_pct": away_pct,
        "predicted_winner": predicted_winner,
        "predicted_pct": round(predicted_pct, 1),
    }


def compute_model_accuracy(matches: list[MatchOut]) -> dict:
    """Evaluate model predictions against finished match results."""
    finished = sorted(
        [m for m in matches if m.status == FINISHED and m.home_code and m.away_code],
        key=lambda m: m.utc_date,
    )

    records: list[dict] = []
    for m in finished:
        if (
            m.pre_kickoff_predicted_winner is not None
            and m.pre_kickoff_home_pct is not None
            and m.pre_kickoff_away_pct is not None
        ):
            predicted_winner = m.pre_kickoff_predicted_winner
            predicted_pct = m.pre_kickoff_predicted_pct or 0.0
            home_pct = m.pre_kickoff_home_pct
            draw_pct = m.pre_kickoff_draw_pct or 0.0
            away_pct = m.pre_kickoff_away_pct
        else:
            probs = compute_pre_kickoff_probabilities(m, matches)
            if not probs:
                continue
            predicted_winner = str(probs["predicted_winner"])
            predicted_pct = float(probs["predicted_pct"])
            home_pct = float(probs["home_win_pct"])
            draw_pct = float(probs["draw_pct"])
            away_pct = float(probs["away_win_pct"])

        side = match_winner_side(m)
        actual_winner = side if side else "DRAW"

        correct = predicted_winner == actual_winner

        records.append({
            "match_id": m.match_id,
            "utc_date": m.utc_date,
            "stage": m.stage,
            "home_code": m.home_code,
            "away_code": m.away_code,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "predicted_winner": predicted_winner,
            "predicted_pct": round(predicted_pct, 1),
            "actual_winner": actual_winner,
            "correct": correct,
            "home_win_pct": round(home_pct, 1),
            "draw_pct": round(draw_pct, 1),
            "away_win_pct": round(away_pct, 1),
            "home_score": m.home_score or 0,
            "away_score": m.away_score or 0,
        })

    correct_count = sum(1 for r in records if r["correct"])
    total_count = len(records)

    return {
        "total": total_count,
        "correct": correct_count,
        "incorrect": total_count - correct_count,
        "accuracy_pct": round(correct_count / total_count * 100, 1) if total_count > 0 else 0.0,
        "records": records,
    }


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
        side = match_winner_side(m)
        if side == "HOME" and is_away:
            return True
        if side == "AWAY" and is_home:
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
    knockout = _is_knockout(m.stage)
    draw_weight = (
        _knockout_regulation_draw_prob(sh, sa) if knockout else 0.35
    )
    total = sh + sa + draw_weight
    roll = random.random() * total

    sim = deepcopy(m)
    sim.status = FINISHED

    if roll < sh:
        winner_goals, loser_goals = _score_for_winner(sh, sa)
        sim.home_score = winner_goals
        sim.away_score = loser_goals
        sim.winner = "HOME_TEAM"
    elif roll < sh + draw_weight:
        if knockout:
            goals = random.choice([0, 1, 1, 2, 2])
            sim.home_score = goals
            sim.away_score = goals
            sim.winner = _resolve_penalties(sh, sa)
        else:
            goals = random.choice([0, 1, 1, 2])
            sim.home_score = goals
            sim.away_score = goals
            sim.winner = "DRAW"
    else:
        winner_goals, loser_goals = _score_for_winner(sa, sh)
        sim.away_score = winner_goals
        sim.home_score = loser_goals
        sim.winner = "AWAY_TEAM"

    return sim


def _simulate_remaining(matches: list[MatchOut]) -> list[MatchOut]:
    from services.bracket_order import fill_inferred_winners

    sim_matches = fill_inferred_winners(deepcopy(matches))
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
