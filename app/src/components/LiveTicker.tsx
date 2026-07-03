"use client";

import { useEffect, useState } from "react";
import {
  getMatchProbabilities,
  getMatches,
  matchProbabilitiesMap,
  type MatchProbabilitiesMap,
  type MatchResult,
} from "@/lib/api";
import {
  formatLiveScore,
  isLiveMatch,
  scoresDelayedByApi,
} from "@/lib/match-live";
import MatchProbBar from "./MatchProbBar";
import TeamFlag from "./TeamFlag";

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
    </span>
  );
}

function LiveMatch({
  match,
  probabilities,
}: {
  match: MatchResult;
  probabilities?: MatchProbabilitiesMap;
}) {
  const delayed = scoresDelayedByApi(match);
  const probs = probabilities?.get(match.match_id);

  return (
    <div className="w-full max-w-sm rounded-xl border border-danger-border bg-danger-muted px-2.5 py-1.5 sm:w-auto sm:max-w-md">
      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap sm:gap-2">
        <LiveDot />
        <span className="text-[9px] font-bold uppercase tracking-wider text-danger sm:text-[10px]">
          {delayed ? "In progress" : "Live"}
        </span>
        <TeamFlag code={match.home_code} teamName={match.home_team} size={16} />
        <span className="text-xs font-semibold sm:text-sm">
          {match.home_code || match.home_team}
        </span>
        <span className="text-xs font-bold tabular-nums sm:text-sm">
          {formatLiveScore(match.home_score, match.away_score)}
        </span>
        <span className="text-xs font-semibold sm:text-sm">
          {match.away_code || match.away_team}
        </span>
        <TeamFlag code={match.away_code} teamName={match.away_team} size={16} />
      </div>
      {probs && (
        <div className="mt-1 border-t border-danger-border/40 pt-1">
          <MatchProbBar
            probabilities={probs}
            homeCode={match.home_code || match.home_team}
            awayCode={match.away_code || match.away_team}
            hideLabels
            stretch
          />
        </div>
      )}
    </div>
  );
}

export default function LiveTicker() {
  const [liveMatches, setLiveMatches] = useState<MatchResult[]>([]);
  const [probabilities, setProbabilities] = useState<MatchProbabilitiesMap>(new Map());

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const [all, probs] = await Promise.all([getMatches(), getMatchProbabilities()]);
        if (!mounted) return;
        setLiveMatches(all.filter((m) => isLiveMatch(m)));
        setProbabilities(matchProbabilitiesMap(probs));
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
    <div className="flex w-full flex-col items-center gap-1.5 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
      {liveMatches.map((m) => (
        <LiveMatch key={m.match_id} match={m} probabilities={probabilities} />
      ))}
    </div>
  );
}
