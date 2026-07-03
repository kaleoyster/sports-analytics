"use client";

import { useState } from "react";
import type { MatchProbabilitiesMap, MatchResult, MemberOut } from "@/lib/api";
import { memberStakes, type MemberStake } from "@/lib/bracket";
import { MATCH_TIMEZONE } from "@/lib/datetime";
import { STAGE_LABELS } from "@/lib/tracker";
import MatchProbBar from "./MatchProbBar";
import TeamFlag from "./TeamFlag";
import { Card } from "./ui";

interface UpcomingMatchesProps {
  matches: MatchResult[];
  members: MemberOut[];
  probabilities?: MatchProbabilitiesMap;
}

function Fixture({
  match,
  stakes,
  probabilities,
  compact,
}: {
  match: MatchResult;
  stakes: MemberStake[];
  probabilities?: MatchProbabilitiesMap;
  compact?: boolean;
}) {
  const probs = probabilities?.get(match.match_id);
  return (
    <div
      className={`flex items-center gap-2 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
    >
      <div className="w-10 shrink-0">
        <p className="text-[10px] font-medium leading-tight">
          {new Date(match.utc_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            timeZone: MATCH_TIMEZONE,
          })}
        </p>
        <p className="text-[9px] text-text-muted">
          {new Date(match.utc_date).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: MATCH_TIMEZONE,
          })}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs sm:text-[13px]">
          <TeamFlag code={match.home_code} teamName={match.home_team} size={14} />
          <span className="truncate max-w-[3.5rem] sm:max-w-none">
            {match.home_code || match.home_team}
          </span>
          <span className="shrink-0 text-[10px] text-text-muted">v</span>
          <TeamFlag code={match.away_code} teamName={match.away_team} size={14} />
          <span className="truncate max-w-[3.5rem] sm:max-w-none">
            {match.away_code || match.away_team}
          </span>
          {probs && (
            <MatchProbBar
              probabilities={probs}
              homeCode={match.home_code || match.home_team}
              awayCode={match.away_code || match.away_team}
              hideLabels
              className="ml-auto"
            />
          )}
        </div>
        {STAGE_LABELS[match.stage] && match.stage !== "GROUP_STAGE" && (
          <p className="text-[8px] font-medium uppercase tracking-wide text-text-muted">
            {STAGE_LABELS[match.stage]}
          </p>
        )}
      </div>

      {stakes.length > 0 && (
        <div className="flex shrink-0 items-center -space-x-1">
          {stakes.slice(0, 2).map((s) => (
            <img
              key={s.id}
              src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(s.avatar_seed)}`}
              alt={s.name}
              title={`${s.name} · ${s.pickedHome ? match.home_team : match.away_team}`}
              width={18}
              height={18}
              className="h-[18px] w-[18px] rounded-full ring-2 ring-surface"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FixtureRow({
  items,
  probabilities,
  compact,
}: {
  items: { match: MatchResult; stakes: MemberStake[] }[];
  probabilities?: MatchProbabilitiesMap;
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 divide-x divide-border">
      {items.map(({ match, stakes }) => (
        <Fixture
          key={match.match_id}
          match={match}
          stakes={stakes}
          probabilities={probabilities}
          compact={compact}
        />
      ))}
      {items.length === 1 && <div className="bg-surface-muted/30" aria-hidden />}
    </div>
  );
}

export default function UpcomingMatches({
  matches,
  members,
  probabilities,
}: UpcomingMatchesProps) {
  const [expanded, setExpanded] = useState(false);

  const upcoming = matches
    .filter(
      (m) =>
        m.status === "SCHEDULED" ||
        m.status === "TIMED" ||
        m.status === "SUSPENDED"
    )
    .map((m) => ({ match: m, stakes: memberStakes(m, members) }))
    .sort(
      (a, b) =>
        new Date(a.match.utc_date).getTime() -
        new Date(b.match.utc_date).getTime()
    );

  if (upcoming.length === 0) return null;

  const firstRow = upcoming.slice(0, 2);
  const rest = upcoming.slice(2);
  const hasMore = rest.length > 0;

  return (
    <section className="mx-auto w-full max-w-xl">
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-muted">Next games</h2>
        <span className="text-[11px] text-text-muted">({upcoming.length})</span>
        {hasMore && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-auto text-xs font-medium text-accent hover:underline"
          >
            Show more ({rest.length})
          </button>
        )}
        {expanded && hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-auto text-xs font-medium text-accent hover:underline"
          >
            Show less
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        <FixtureRow items={firstRow} probabilities={probabilities} compact />

        {expanded && hasMore && (
          <div className="max-h-52 overflow-y-auto border-t border-border divide-y divide-border">
            {rest.map(({ match, stakes }) => (
              <Fixture
                key={match.match_id}
                match={match}
                stakes={stakes}
                probabilities={probabilities}
                compact
              />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
