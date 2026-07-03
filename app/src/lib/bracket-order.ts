import type { MatchResult } from "@/lib/api";

/** Normalize API team codes to FIFA / Google bracket codes */
const CODE_ALIASES: Record<string, string> = {
  JPN: "JAP",
  PRY: "PAR",
  ZAF: "RSA",
};

/** Resolve bracket code from team name when the API omits the TLA */
const NAME_TO_CODE: Record<string, string> = {
  germany: "GER",
  paraguay: "PAR",
  france: "FRA",
  sweden: "SWE",
  "south africa": "RSA",
  canada: "CAN",
  netherlands: "NED",
  morocco: "MAR",
  portugal: "POR",
  croatia: "CRO",
  spain: "ESP",
  austria: "AUT",
  usa: "USA",
  "united states": "USA",
  "bosnia and herzegovina": "BIH",
  "bosnia-herzegovina": "BIH",
  belgium: "BEL",
  senegal: "SEN",
  brazil: "BRA",
  japan: "JAP",
  "côte d'ivoire": "CIV",
  "cote d'ivoire": "CIV",
  "ivory coast": "CIV",
  norway: "NOR",
  mexico: "MEX",
  ecuador: "ECU",
  england: "ENG",
  "dr congo": "COD",
  "congo dr": "COD",
  argentina: "ARG",
  "cape verde": "CPV",
  "cabo verde": "CPV",
  australia: "AUS",
  egypt: "EGY",
  switzerland: "SUI",
  algeria: "ALG",
  colombia: "COL",
  ghana: "GHA",
};

function norm(code: string): string {
  const c = (code ?? "").trim().toUpperCase();
  return CODE_ALIASES[c] ?? c;
}

function codeFromTeam(code: string, name: string): string {
  if (code?.trim()) return norm(code);
  const key = (name ?? "").trim().toLowerCase();
  if (NAME_TO_CODE[key]) return NAME_TO_CODE[key];
  for (const [hint, bracketCode] of Object.entries(NAME_TO_CODE)) {
    if (key && key.includes(hint)) return bracketCode;
  }
  return "";
}

function pairKey(a: string, b: string): string {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return "";
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

/**
 * Round of 32 in bracket-tree order (top → bottom, slots 0–15).
 * Source: Google FIFA World Cup 2026 knockout bracket.
 */
export const R32_BRACKET_FIXTURES: ReadonlyArray<readonly [string, string]> = [
  ["RSA", "CAN"], // slot 0
  ["NED", "MAR"], // slot 1
  ["GER", "PAR"], // slot 2
  ["FRA", "SWE"], // slot 3
  ["BEL", "SEN"], // slot 4
  ["USA", "BIH"], // slot 5
  ["ESP", "AUT"], // slot 6
  ["POR", "CRO"], // slot 7
  ["BRA", "JAP"], // slot 8
  ["CIV", "NOR"], // slot 9
  ["MEX", "ECU"], // slot 10
  ["ENG", "COD"], // slot 11
  ["SUI", "ALG"], // slot 12
  ["COL", "GHA"], // slot 13
  ["AUS", "EGY"], // slot 14
  ["ARG", "CPV"], // slot 15
];

/**
 * Later rounds are placed by kickoff order, because the teams are still TBD.
 * Each array maps a stage's chronological rank → its bracket-tree slot.
 * Derived from the Google bracket schedule (Central Time).
 */
const R16_CHRONO_TO_SLOT = [0, 1, 4, 5, 3, 2, 7, 6];
const QF_CHRONO_TO_SLOT = [0, 1, 2, 3];
const SF_CHRONO_TO_SLOT = [0, 1];

function matchPairKey(match: MatchResult): string {
  return pairKey(
    codeFromTeam(match.home_code, match.home_team),
    codeFromTeam(match.away_code, match.away_team)
  );
}

function r32SlotIndex(match: MatchResult): number {
  const key = matchPairKey(match);
  if (key) {
    const byPair = R32_BRACKET_FIXTURES.findIndex(
      ([h, a]) => pairKey(h, a) === key
    );
    if (byPair >= 0) return byPair;
  }

  const home = codeFromTeam(match.home_code, match.home_team);
  const away = codeFromTeam(match.away_code, match.away_team);
  const slots = new Set<number>();
  for (let i = 0; i < R32_BRACKET_FIXTURES.length; i++) {
    const [h, a] = R32_BRACKET_FIXTURES[i];
    if (home && (home === norm(h) || home === norm(a))) slots.add(i);
    if (away && (away === norm(h) || away === norm(a))) slots.add(i);
  }
  if (slots.size === 1) return [...slots][0];
  return Number.MAX_SAFE_INTEGER;
}

function chronoRank(match: MatchResult, allMatches: MatchResult[]): number {
  const siblings = allMatches
    .filter((m) => m.stage === match.stage)
    .sort((a, b) => {
      const ta = new Date(a.utc_date).getTime();
      const tb = new Date(b.utc_date).getTime();
      if (ta !== tb) return ta - tb;
      return a.match_id - b.match_id;
    });
  return siblings.findIndex((m) => m.match_id === match.match_id);
}

function slotFromChrono(
  match: MatchResult,
  allMatches: MatchResult[],
  mapping: number[]
): number {
  const rank = chronoRank(match, allMatches);
  if (rank < 0 || rank >= mapping.length) return rank;
  return mapping[rank];
}

function bracketSortKey(match: MatchResult, allMatches: MatchResult[]): number {
  switch (match.stage) {
    case "LAST_32":
      return r32SlotIndex(match);
    case "LAST_16":
      return slotFromChrono(match, allMatches, R16_CHRONO_TO_SLOT);
    case "QUARTER_FINALS":
      return slotFromChrono(match, allMatches, QF_CHRONO_TO_SLOT);
    case "SEMI_FINALS":
      return slotFromChrono(match, allMatches, SF_CHRONO_TO_SLOT);
    case "FINAL":
      return 0;
    case "THIRD_PLACE":
      return 1;
    default:
      return Number.MAX_SAFE_INTEGER;
  }
}

/** Sort knockout matches into official bracket-tree order. */
export function sortBracketMatches(
  matches: MatchResult[],
  stage?: string
): MatchResult[] {
  const pool = stage ? matches.filter((m) => m.stage === stage) : matches;
  return [...pool].sort((a, b) => {
    const ka = bracketSortKey(a, matches);
    const kb = bracketSortKey(b, matches);
    if (ka !== kb) return ka - kb;
    return new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime();
  });
}

// --- Infer winners into TBD slots ---

/** Which R32 bracket slots feed each later-round bracket slot */
const R16_FEEDERS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15],
];
const QF_FEEDERS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7],
];
const SF_FEEDERS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3],
];

function matchWinnerInfo(
  m: MatchResult
): { code: string; name: string } | null {
  if (m.status !== "FINISHED") return null;
  let side: "HOME" | "AWAY" | null = null;
  if (m.winner === "HOME_TEAM") side = "HOME";
  else if (m.winner === "AWAY_TEAM") side = "AWAY";
  else if (
    m.home_score !== null && m.away_score !== null &&
    m.home_score !== m.away_score
  ) {
    side = m.home_score > m.away_score ? "HOME" : "AWAY";
  }
  if (!side) return null;
  return side === "HOME"
    ? { code: m.home_code, name: m.home_team }
    : { code: m.away_code, name: m.away_team };
}

function isTbd(code: string, name: string): boolean {
  const c = (code ?? "").trim();
  const n = (name ?? "").trim().toUpperCase();
  return !c || c === "TBD" || n === "TBD" || n === "";
}

/**
 * Fill TBD team slots in later-round matches by looking at the winners
 * of their feeder matches. Returns a new array with patched copies.
 */
export function fillInferredWinners(matches: MatchResult[]): MatchResult[] {
  const sorted = sortBracketMatches(matches);

  const slotWinners = new Map<string, { code: string; name: string }>();

  function recordStageWinners(stage: string) {
    const stageMatches = sortBracketMatches(matches, stage);
    stageMatches.forEach((m, slotIdx) => {
      const w = matchWinnerInfo(m);
      if (w) slotWinners.set(`${stage}:${slotIdx}`, w);
    });
  }

  recordStageWinners("LAST_32");
  recordStageWinners("LAST_16");
  recordStageWinners("QUARTER_FINALS");
  recordStageWinners("SEMI_FINALS");

  function getFeederWinners(
    stage: string,
    slotIdx: number,
    feeders: ReadonlyArray<readonly [number, number]>,
    feederStage: string
  ): [{ code: string; name: string } | null, { code: string; name: string } | null] {
    if (slotIdx >= feeders.length) return [null, null];
    const [a, b] = feeders[slotIdx];
    return [
      slotWinners.get(`${feederStage}:${a}`) ?? null,
      slotWinners.get(`${feederStage}:${b}`) ?? null,
    ];
  }

  return sorted.map((m) => {
    let feeders: ReadonlyArray<readonly [number, number]> | null = null;
    let feederStage = "";

    if (m.stage === "LAST_16") {
      feeders = R16_FEEDERS;
      feederStage = "LAST_32";
    } else if (m.stage === "QUARTER_FINALS") {
      feeders = QF_FEEDERS;
      feederStage = "LAST_16";
    } else if (m.stage === "SEMI_FINALS") {
      feeders = SF_FEEDERS;
      feederStage = "QUARTER_FINALS";
    } else if (m.stage === "FINAL" || m.stage === "THIRD_PLACE") {
      feeders = [[0, 1]];
      feederStage = "SEMI_FINALS";
    }

    if (!feeders) return m;

    const stageMatches = sortBracketMatches(matches, m.stage);
    const slotIdx = stageMatches.findIndex((x) => x.match_id === m.match_id);
    if (slotIdx < 0) return m;

    const [w1, w2] = getFeederWinners(m.stage, slotIdx, feeders, feederStage);

    let patched = false;
    let home_code = m.home_code;
    let home_team = m.home_team;
    let away_code = m.away_code;
    let away_team = m.away_team;

    if (w1 && isTbd(m.home_code, m.home_team)) {
      home_code = w1.code;
      home_team = w1.name;
      patched = true;
    }
    if (w2 && isTbd(m.away_code, m.away_team)) {
      away_code = w2.code;
      away_team = w2.name;
      patched = true;
    }

    if (!patched) return m;
    return { ...m, home_code, home_team, away_code, away_team };
  });
}
