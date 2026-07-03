"""Official FIFA World Cup 2026 knockout bracket tree order (Google bracket)."""

from __future__ import annotations

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
