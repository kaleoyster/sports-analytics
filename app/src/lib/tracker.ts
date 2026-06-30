import type { MatchResult } from "@/lib/api";

export interface TeamStatus {
  code: string;
  name: string;
  eliminated: boolean;
  eliminatedStage: string | null;
  eliminatedBy: string | null;
  currentStage: string;
}

export const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
};

const STAGE_ORDER = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

function stageRank(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

/**
 * Resolve which side won a match. Trusts the API `winner` field when it is
 * decisive (it already accounts for extra time / penalties), but falls back to
 * the final score when `winner` is missing or a draw with an uneven scoreline.
 */
export function matchWinnerSide(m: MatchResult): "HOME" | "AWAY" | null {
  if (m.winner === "HOME_TEAM") return "HOME";
  if (m.winner === "AWAY_TEAM") return "AWAY";
  if (
    m.home_score !== null &&
    m.home_score !== undefined &&
    m.away_score !== null &&
    m.away_score !== undefined &&
    m.home_score !== m.away_score
  ) {
    return m.home_score > m.away_score ? "HOME" : "AWAY";
  }
  return null;
}

export function analyzeTeam(
  code: string,
  name: string,
  matches: MatchResult[]
): TeamStatus {
  let eliminated = false;
  let eliminatedStage: string | null = null;
  let eliminatedBy: string | null = null;
  let currentStage = "GROUP_STAGE";

  const teamMatches = matches.filter(
    (m) =>
      m.status === "FINISHED" &&
      (m.home_code === code || m.away_code === code)
  );

  for (const m of teamMatches) {
    if (stageRank(m.stage) > stageRank(currentStage)) {
      currentStage = m.stage;
    }

    const isHome = m.home_code === code;
    const winnerSide = matchWinnerSide(m);
    const lost =
      (winnerSide === "HOME" && !isHome) ||
      (winnerSide === "AWAY" && isHome);

    if (lost && m.stage !== "GROUP_STAGE" && m.stage !== "THIRD_PLACE") {
      eliminated = true;
      eliminatedStage = m.stage;
      eliminatedBy = isHome ? m.away_team : m.home_team;
    }
  }

  return {
    code,
    name,
    eliminated,
    eliminatedStage,
    eliminatedBy,
    currentStage,
  };
}
