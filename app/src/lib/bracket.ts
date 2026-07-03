import type { MatchResult, MemberOut } from "@/lib/api";
import { sortBracketMatches, fillInferredWinners } from "@/lib/bracket-order";

export const BRACKET_STAGES = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
] as const;

export type BracketStage = (typeof BRACKET_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
};

/** Vertical space per leaf slot in the bracket tree (card height + gap) */
export const UNIT_HEIGHT = 124;

/** Natural match card height — cards never stretch beyond this */
export const CARD_HEIGHT = 112;

/** Layout widths — keep the full bracket viewable with less horizontal scroll */
export const COLUMN_WIDTH = 188;
export const CONNECTOR_WIDTH = 24;
export const FINAL_COLUMN_WIDTH = 192;

export interface MemberStake {
  id: number;
  name: string;
  avatar_seed: string;
  pickedHome: boolean;
  pickedAway: boolean;
}

export function sortMatches(matches: MatchResult[]): MatchResult[] {
  return [...matches].sort(
    (a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()
  );
}

export function matchesByStage(
  matches: MatchResult[],
  stage: string
): MatchResult[] {
  const stageMatches = matches.filter((m) => m.stage === stage);
  if (
    BRACKET_STAGES.includes(stage as BracketStage) ||
    stage === "THIRD_PLACE"
  ) {
    return sortBracketMatches(matches, stage);
  }
  return [...stageMatches].sort(
    (a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()
  );
}

export function memberStakes(
  match: MatchResult,
  members: MemberOut[]
): MemberStake[] {
  return members
    .filter((m) =>
      m.teams.some(
        (t) => t.team_code === match.home_code || t.team_code === match.away_code
      )
    )
    .map((m) => ({
      id: m.id,
      name: m.name,
      avatar_seed: m.avatar_seed,
      pickedHome: m.teams.some((t) => t.team_code === match.home_code),
      pickedAway: m.teams.some((t) => t.team_code === match.away_code),
    }));
}

export function splitHalf(matches: MatchResult[]): {
  left: MatchResult[];
  right: MatchResult[];
} {
  if (matches.length === 0) return { left: [], right: [] };
  const mid = Math.ceil(matches.length / 2);
  return {
    left: matches.slice(0, mid),
    right: matches.slice(mid),
  };
}

/** Leaf slots for the bracket tree (full width, not per-side). */
export function inferBaseSlots(
  r32: MatchResult[],
  _r32R: MatchResult[],
  r16: MatchResult[],
  _r16R: MatchResult[]
): number {
  if (r32.length > 0) return r32.length;
  if (r16.length > 0) return r16.length * 2;
  return 1;
}

export function fillRound(
  matches: MatchResult[],
  slotCount: number
): (MatchResult | null)[] {
  const filled: (MatchResult | null)[] = matches.map((m) => m);
  while (filled.length < slotCount) filled.push(null);
  return filled.slice(0, slotCount);
}

export function slotsForRound(baseSlots: number, roundIndex: number): number {
  return Math.max(1, baseSlots / 2 ** roundIndex);
}

export function bracketTotalHeight(baseSlots: number): number {
  return baseSlots * UNIT_HEIGHT;
}

/** Y coordinate of the vertical centre of a match card */
export function matchCenterY(
  roundIndex: number,
  matchIndex: number,
  baseSlots: number
): number {
  const span = 2 ** roundIndex * UNIT_HEIGHT;
  return matchIndex * span + span / 2;
}

/** Top offset for absolutely-positioned match card */
export function matchTop(
  roundIndex: number,
  matchIndex: number,
  baseSlots: number
): number {
  return matchCenterY(roundIndex, matchIndex, baseSlots) - CARD_HEIGHT / 2;
}
