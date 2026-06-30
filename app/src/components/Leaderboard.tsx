"use client";

import { useMemo, useState } from "react";
import type { LeaderboardEntry, LeaderboardSort, MatchResult } from "@/lib/api";
import MemberCard from "./MemberCard";
import { Card } from "./ui";

export type { LeaderboardSort };

const SORT_OPTIONS: { value: LeaderboardSort; label: string }[] = [
  { value: "points", label: "Points" },
  { value: "goals_for", label: "Goals scored" },
  { value: "goals_against", label: "Goals conceded" },
];

function goalsFor(entry: LeaderboardEntry): number {
  return entry.teams.reduce((sum, t) => sum + t.goals_for, 0);
}

function goalsAgainst(entry: LeaderboardEntry): number {
  return entry.teams.reduce((sum, t) => sum + t.goals_against, 0);
}

function sortEntries(entries: LeaderboardEntry[], sortBy: LeaderboardSort): LeaderboardEntry[] {
  const sorted = [...entries];

  if (sortBy === "points") {
    sorted.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return b.total_goal_difference - a.total_goal_difference;
    });
    return sorted;
  }

  if (sortBy === "goals_for") {
    sorted.sort((a, b) => {
      const diff = goalsFor(b) - goalsFor(a);
      if (diff !== 0) return diff;
      return b.total_points - a.total_points;
    });
    return sorted;
  }

  sorted.sort((a, b) => {
    const diff = goalsAgainst(a) - goalsAgainst(b);
    if (diff !== 0) return diff;
    return b.total_points - a.total_points;
  });
  return sorted;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  winChanceByMember?: Map<number, number>;
  matches?: MatchResult[];
}

export default function Leaderboard({
  entries,
  winChanceByMember,
  matches = [],
}: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<LeaderboardSort>("points");

  const sortedEntries = useMemo(
    () => sortEntries(entries, sortBy),
    [entries, sortBy]
  );

  if (entries.length === 0) {
    return (
      <Card className="border-dashed p-12 text-center text-text-muted">
        <p className="text-lg">No members yet</p>
        <p className="mt-1 text-sm">Share the invite link to get started.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          Click a row for breakdown. Win % is projected chance to finish first.
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="leaderboard-sort" className="text-sm text-text-muted shrink-0">
            Sort by
          </label>
          <select
            id="leaderboard-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as LeaderboardSort)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sortBy !== "points" && (
        <p className="text-xs text-text-muted">
          {sortBy === "goals_for"
            ? "Ranked by combined goals scored across both teams (higher is better)."
            : "Ranked by combined goals conceded across both teams (lower is better)."}
        </p>
      )}

      {sortedEntries.map((entry, index) => (
        <MemberCard
          key={entry.member_id}
          entry={entry}
          displayRank={sortBy === "points" ? entry.rank : index + 1}
          sortBy={sortBy}
          goalsFor={goalsFor(entry)}
          goalsAgainst={goalsAgainst(entry)}
          officialRank={entry.rank}
          winProbability={winChanceByMember?.get(entry.member_id)}
          matches={matches}
        />
      ))}
    </div>
  );
}
