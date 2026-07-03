import type { MatchResult } from "@/lib/api";

/** Max duration we treat a match as possibly in progress after kickoff. */
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

const TERMINAL_STATUSES = new Set([
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
  "AWARDED",
]);

export function isApiLiveStatus(status: string): boolean {
  return status === "IN_PLAY" || status === "PAUSED";
}

/** True when kickoff has passed but the API still reports TIMED/SCHEDULED (free-tier delay). */
export function isKickoffPassed(status: string, utcDate: string, now = Date.now()): boolean {
  if (TERMINAL_STATUSES.has(status) || isApiLiveStatus(status)) return false;
  const kickoff = new Date(utcDate).getTime();
  const elapsed = now - kickoff;
  return elapsed > 0 && elapsed < LIVE_WINDOW_MS;
}

export function isLiveMatch(
  match: Pick<MatchResult, "status" | "utc_date">,
  now = Date.now()
): boolean {
  if (isApiLiveStatus(match.status)) return true;
  return isKickoffPassed(match.status, match.utc_date, now);
}

export function scoresDelayedByApi(
  match: Pick<MatchResult, "status" | "utc_date" | "home_score" | "away_score">
): boolean {
  return isKickoffPassed(match.status, match.utc_date) && match.home_score == null;
}

export function formatLiveScore(home: number | null, away: number | null): string {
  if (home == null || away == null) return "– –";
  return `${home} – ${away}`;
}
