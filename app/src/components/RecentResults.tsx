"use client";

import type { MatchResult } from "@/lib/api";
import { Card } from "./ui";

interface RecentResultsProps {
  matches: MatchResult[];
  limit?: number;
}

export default function RecentResults({ matches, limit = 6 }: RecentResultsProps) {
  const recent = [...matches]
    .sort((a, b) => new Date(b.utc_date).getTime() - new Date(a.utc_date).getTime())
    .slice(0, limit);

  if (recent.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Recent Results</h2>
      <Card className="divide-y divide-border">
        {recent.map((m) => (
          <div key={m.match_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className="w-16 shrink-0 text-xs text-text-muted">
              {new Date(m.utc_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {m.home_team} {m.home_score ?? "–"}–{m.away_score ?? "–"} {m.away_team}
            </span>
            <span className="shrink-0 text-xs text-text-muted">
              {m.winner === "HOME_TEAM"
                ? m.home_team
                : m.winner === "AWAY_TEAM"
                  ? m.away_team
                  : "Draw"}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}
