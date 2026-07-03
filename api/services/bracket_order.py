"""Official FIFA World Cup 2026 knockout bracket tree order (Google bracket)."""

from __future__ import annotations

from domains.matches.result import match_winner_side

CODE_ALIASES = {"JPN": "JAP", "PRY": "PAR", "ZAF": "RSA"}

NAME_TO_CODE = {
    "germany": "GER",
    "paraguay": "PAR",
    "france": "FRA",
    "sweden": "SWE",
    "south africa": "RSA",
    "canada": "CAN",
    "netherlands": "NED",
    "morocco": "MAR",
    "portugal": "POR",
    "croatia": "CRO",
    "spain": "ESP",
    "austria": "AUT",
    "usa": "USA",
    "united states": "USA",
    "bosnia and herzegovina": "BIH",
    "bosnia-herzegovina": "BIH",
    "belgium": "BEL",
    "senegal": "SEN",
    "brazil": "BRA",
    "japan": "JAP",
    "côte d'ivoire": "CIV",
    "cote d'ivoire": "CIV",
    "ivory coast": "CIV",
    "norway": "NOR",
    "mexico": "MEX",
    "ecuador": "ECU",
    "england": "ENG",
    "dr congo": "COD",
    "congo dr": "COD",
    "argentina": "ARG",
    "cape verde": "CPV",
    "cabo verde": "CPV",
    "australia": "AUS",
    "egypt": "EGY",
    "switzerland": "SUI",
    "algeria": "ALG",
    "colombia": "COL",
    "ghana": "GHA",
}

# Round of 32 top -> bottom (slots 0-15), Google bracket order.
R32_BRACKET_FIXTURES: list[tuple[str, str]] = [
    ("RSA", "CAN"),  # 0
    ("NED", "MAR"),  # 1
    ("GER", "PAR"),  # 2
    ("FRA", "SWE"),  # 3
    ("BEL", "SEN"),  # 4
    ("USA", "BIH"),  # 5
    ("ESP", "AUT"),  # 6
    ("POR", "CRO"),  # 7
    ("BRA", "JAP"),  # 8
    ("CIV", "NOR"),  # 9
    ("MEX", "ECU"),  # 10
    ("ENG", "COD"),  # 11
    ("SUI", "ALG"),  # 12
    ("COL", "GHA"),  # 13
    ("AUS", "EGY"),  # 14
    ("ARG", "CPV"),  # 15
]

# Chronological rank -> bracket slot for later rounds (teams still TBD).
R16_CHRONO_TO_SLOT = [0, 1, 4, 5, 3, 2, 7, 6]
QF_CHRONO_TO_SLOT = [0, 1, 2, 3]
SF_CHRONO_TO_SLOT = [0, 1]

R16_FEEDERS: list[tuple[int, int]] = [
    (0, 1), (2, 3), (4, 5), (6, 7), (8, 9), (10, 11), (12, 13), (14, 15),
]
QF_FEEDERS: list[tuple[int, int]] = [(0, 1), (2, 3), (4, 5), (6, 7)]
SF_FEEDERS: list[tuple[int, int]] = [(0, 1), (2, 3)]

STAGE_ORDER = {
    "GROUP_STAGE": 0,
    "LAST_32": 1,
    "LAST_16": 2,
    "QUARTER_FINALS": 3,
    "SEMI_FINALS": 4,
    "THIRD_PLACE": 5,
    "FINAL": 6,
}

KNOCKOUT_STAGES = set(STAGE_ORDER) - {"GROUP_STAGE"}


def _norm(code: str) -> str:
    c = (code or "").strip().upper()
    return CODE_ALIASES.get(c, c)


def _code_from_team(code: str, name: str) -> str:
    if code and code.strip():
        return _norm(code)
    key = (name or "").strip().lower()
    if key in NAME_TO_CODE:
        return NAME_TO_CODE[key]
    for hint, bracket_code in NAME_TO_CODE.items():
        if key and hint in key:
            return bracket_code
    return ""


def _pair_key(a: str, b: str) -> str:
    x, y = _norm(a), _norm(b)
    if not x or not y:
        return ""
    return f"{x}-{y}" if x < y else f"{y}-{x}"


def _r32_slot_index(match) -> int:
    home = _code_from_team(match.home_code, match.home_team)
    away = _code_from_team(match.away_code, match.away_team)
    key = _pair_key(home, away)
    if key:
        for i, (h, a) in enumerate(R32_BRACKET_FIXTURES):
            if _pair_key(h, a) == key:
                return i

    slots = set()
    for i, (h, a) in enumerate(R32_BRACKET_FIXTURES):
        if home and home in (_norm(h), _norm(a)):
            slots.add(i)
        if away and away in (_norm(h), _norm(a)):
            slots.add(i)
    if len(slots) == 1:
        return next(iter(slots))
    return 10**9


def _chrono_rank(match, matches: list) -> int:
    siblings = sorted(
        (m for m in matches if m.stage == match.stage),
        key=lambda m: (m.utc_date, m.match_id),
    )
    for i, m in enumerate(siblings):
        if m.match_id == match.match_id:
            return i
    return 10**9


def _slot_from_chrono(match, matches: list, mapping: list[int]) -> int:
    rank = _chrono_rank(match, matches)
    if 0 <= rank < len(mapping):
        return mapping[rank]
    return rank


def _bracket_sort_key(match, matches: list) -> int:
    stage = match.stage
    if stage == "LAST_32":
        return _r32_slot_index(match)
    if stage == "LAST_16":
        return _slot_from_chrono(match, matches, R16_CHRONO_TO_SLOT)
    if stage == "QUARTER_FINALS":
        return _slot_from_chrono(match, matches, QF_CHRONO_TO_SLOT)
    if stage == "SEMI_FINALS":
        return _slot_from_chrono(match, matches, SF_CHRONO_TO_SLOT)
    if stage == "FINAL":
        return 0
    if stage == "THIRD_PLACE":
        return 1
    return 10**9


def sort_knockout_matches(matches: list) -> list:
    """Return matches with knockout rounds in official bracket-tree order."""

    def sort_key(m):
        stage = STAGE_ORDER.get(m.stage, 99)
        bracket = _bracket_sort_key(m, matches) if m.stage in KNOCKOUT_STAGES else 0
        return (stage, bracket, m.utc_date)

    return sorted(matches, key=sort_key)


def _sort_stage_matches(matches: list, stage: str) -> list:
    pool = [m for m in matches if m.stage == stage]
    return sorted(pool, key=lambda m: (_bracket_sort_key(m, matches), m.utc_date, m.match_id))


def _match_winner_info(match) -> dict[str, str] | None:
    if match.status != "FINISHED":
        return None
    side = match_winner_side(match)
    if not side:
        return None
    if side == "HOME":
        return {"code": match.home_code, "name": match.home_team}
    return {"code": match.away_code, "name": match.away_team}


def _is_tbd(code: str, name: str) -> bool:
    c = (code or "").strip()
    n = (name or "").strip().upper()
    return not c or c == "TBD" or n == "TBD" or n == ""


def fill_inferred_winners(matches: list) -> list:
    """Fill TBD slots in later knockout rounds from feeder-round winners."""
    slot_winners: dict[str, dict[str, str]] = {}

    for stage in ("LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS"):
        for slot_idx, m in enumerate(_sort_stage_matches(matches, stage)):
            winner = _match_winner_info(m)
            if winner:
                slot_winners[f"{stage}:{slot_idx}"] = winner

    def feeder_winners(
        stage: str, slot_idx: int, feeders: list[tuple[int, int]], feeder_stage: str
    ) -> tuple[dict[str, str] | None, dict[str, str] | None]:
        if slot_idx >= len(feeders):
            return None, None
        a, b = feeders[slot_idx]
        return slot_winners.get(f"{feeder_stage}:{a}"), slot_winners.get(f"{feeder_stage}:{b}")

    result = []
    for m in matches:
        feeders: list[tuple[int, int]] | None = None
        feeder_stage = ""

        if m.stage == "LAST_16":
            feeders, feeder_stage = R16_FEEDERS, "LAST_32"
        elif m.stage == "QUARTER_FINALS":
            feeders, feeder_stage = QF_FEEDERS, "LAST_16"
        elif m.stage == "SEMI_FINALS":
            feeders, feeder_stage = SF_FEEDERS, "QUARTER_FINALS"
        elif m.stage in ("FINAL", "THIRD_PLACE"):
            feeders, feeder_stage = [(0, 1)], "SEMI_FINALS"

        if not feeders:
            result.append(m)
            continue

        stage_matches = _sort_stage_matches(matches, m.stage)
        try:
            slot_idx = next(i for i, x in enumerate(stage_matches) if x.match_id == m.match_id)
        except StopIteration:
            result.append(m)
            continue

        w1, w2 = feeder_winners(m.stage, slot_idx, feeders, feeder_stage)
        updates: dict[str, str] = {}
        if w1 and _is_tbd(m.home_code, m.home_team):
            updates["home_code"] = w1["code"]
            updates["home_team"] = w1["name"]
        if w2 and _is_tbd(m.away_code, m.away_team):
            updates["away_code"] = w2["code"]
            updates["away_team"] = w2["name"]

        if updates and hasattr(m, "model_copy"):
            result.append(m.model_copy(update=updates))
        elif updates:
            result.append(type(m)(**{**m.__dict__, **updates}))
        else:
            result.append(m)

    return result
