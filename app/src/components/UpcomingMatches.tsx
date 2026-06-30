"use client";

import type { MatchResult, MemberOut } from "@/lib/api";
import { memberStakes, type MemberStake } from "@/lib/bracket";
import { STAGE_LABELS } from "@/lib/tracker";
import TeamFlag from "./TeamFlag";
import { Card } from "./ui";

interface UpcomingMatchesProps {
  matches: MatchResult[];
  members: MemberOut[];
  limit?: number;
}

function Fixture({
  match,
  stakes,
}: {
  match: MatchResult;
  stakes: MemberStake[];
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-16 shrink-0">
        <p className="text-xs font-medium leading-tight">
          {new Date(match.utc_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>
        <p className="text-[11px] text-text-muted">
          {new Date(match.utc_date).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5 sm:gap-y-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamFlag code={match.home_code} teamName={match.home_team} size={15} />
            <span className="truncate">{match.home_team}</span>
          </div>
          <span className="hidden text-xs text-text-muted sm:inline">v</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamFlag code={match.away_code} teamName={match.away_team} size={15} />
            <span className="truncate">{match.away_team}</span>
          </div>
        </div>
        {STAGE_LABELS[match.stage] && match.stage !== "GROUP_STAGE" && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
            {STAGE_LABELS[match.stage]}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center -space-x-1.5">
        {stakes.map((s) => (
          <img
            key={s.id}
            src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(s.avatar_seed)}`}
            alt={s.name}
            title={`${s.name} · ${s.pickedHome ? match.home_team : match.away_team}`}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full ring-2 ring-surface"
          />
        ))}
      </div>
    </div>
  );
}

export default function UpcomingMatches({
  matches,
  members,
  limit = 2,
}: UpcomingMatchesProps) {
  const upcoming = matches
    .filter((m) => m.status !== "FINISHED")
    .map((m) => ({ match: m, stakes: memberStakes(m, members) }))
    .filter((x) => x.stakes.length > 0)
    .sort(
      (a, b) =>
        new Date(a.match.utc_date).getTime() - new Date(b.match.utc_date).getTime()
    )
    .slice(0, limit);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-text-muted">Next games</h2>
      <Card className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        {upcoming.map(({ match, stakes }) => (
          <Fixture key={match.match_id} match={match} stakes={stakes} />
        ))}
      </Card>
    </section>
  );
}
