"use client";

import { useEffect, useState } from "react";
import { getMatches, type MatchResult } from "@/lib/api";
import {
  formatLiveScore,
  isLiveMatch,
  scoresDelayedByApi,
} from "@/lib/match-live";
import TeamFlag from "./TeamFlag";

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger sm:h-3 sm:w-3" />
    </span>
  );
}

function LiveMatch({ match }: { match: MatchResult }) {
  const delayed = scoresDelayedByApi(match);
  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-danger-border bg-danger-muted px-3 py-1.5 sm:gap-2.5 sm:px-4 sm:py-2">
      <LiveDot />
      <span className="text-[10px] font-bold uppercase tracking-wider text-danger sm:text-xs">
        {delayed ? "In progress" : "Live"}
      </span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <TeamFlag code={match.home_code} teamName={match.home_team} size={18} />
        <span className="text-sm font-semibold sm:text-base">
          {match.home_code || match.home_team}
        </span>
        <span className="text-sm font-bold tabular-nums sm:text-base">
          {formatLiveScore(match.home_score, match.away_score)}
        </span>
        <span className="text-sm font-semibold sm:text-base">
          {match.away_code || match.away_team}
        </span>
        <TeamFlag code={match.away_code} teamName={match.away_team} size={18} />
      </div>
    </div>
  );
}

export default function LiveTicker() {
  const [liveMatches, setLiveMatches] = useState<MatchResult[]>([]);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const all = await getMatches();
        if (!mounted) return;
        setLiveMatches(all.filter((m) => isLiveMatch(m)));
      } catch {}
    }

    poll();
    const id = setInterval(poll, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (liveMatches.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      {liveMatches.map((m) => (
        <LiveMatch key={m.match_id} match={m} />
      ))}
    </div>
  );
}
