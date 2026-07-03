"use client";

import type { MatchProbabilities, MatchResult } from "@/lib/api";
import type { MemberStake } from "@/lib/bracket";
import { formatMatchSchedule } from "@/lib/datetime";
import { matchWinnerSide } from "@/lib/tracker";
import MatchProbBar from "./MatchProbBar";
import TeamFlag from "./TeamFlag";

interface BracketMatchCardProps {
  match: MatchResult | null;
  stakes: MemberStake[];
  probabilities?: MatchProbabilities;
  compact?: boolean;
}

export default function BracketMatchCard({
  match,
  stakes,
  probabilities,
  compact = false,
}: BracketMatchCardProps) {
  if (!match) {
    return (
      <div className="flex flex-col justify-center rounded-lg border border-dashed border-border bg-surface-muted px-2 py-2">
        <div className="flex items-center gap-2 py-0.5 text-sm text-text-muted">
          <span className="h-4 w-6 shrink-0 rounded bg-border" />
          TBD
        </div>
        <div className="flex items-center gap-2 py-0.5 text-sm text-text-muted">
          <span className="h-4 w-6 shrink-0 rounded bg-border" />
          TBD
        </div>
      </div>
    );
  }

  const isFinished = match.status === "FINISHED";
  const winnerSide = matchWinnerSide(match);
  const homeWon = winnerSide === "HOME";
  const awayWon = winnerSide === "AWAY";
  const schedule = formatMatchSchedule(match.utc_date, match.status);
  const showProbs = !isFinished && probabilities;
  const showStakes = stakes.length > 0;

  return (
    <div
      className={`flex flex-col rounded-lg border border-border bg-surface ${
        compact ? "px-2.5 py-2" : "h-full px-2 py-1.5 shadow-sm"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[10px] leading-none text-text-muted">
          {schedule.primary}
        </p>
        {schedule.badge && !compact && (
          <span className="shrink-0 text-[9px] font-semibold uppercase leading-none text-text-muted">
            {schedule.badge}
          </span>
        )}
      </div>

      <div
        className={
          compact
            ? "flex flex-col"
            : "flex min-h-0 flex-1 flex-col justify-center gap-0.5"
        }
      >
        <TeamRow
          code={match.home_code}
          name={match.home_team}
          score={match.home_score}
          won={isFinished && homeWon}
          lost={isFinished && awayWon}
          compact={compact}
        />
        <TeamRow
          code={match.away_code}
          name={match.away_team}
          score={match.away_score}
          won={isFinished && awayWon}
          lost={isFinished && homeWon}
          compact={compact}
        />
      </div>

      {showProbs && (
        <div className="mt-1.5 border-t border-border/50 pt-1.5">
          <MatchProbBar
            probabilities={probabilities}
            homeCode={match.home_code || match.home_team}
            awayCode={match.away_code || match.away_team}
            hideLabels
            stretch
          />
        </div>
      )}

      {showStakes && (
        <div className={`flex justify-end ${showProbs ? "mt-1" : "mt-1.5"}`}>
          <div className="flex shrink-0 items-center -space-x-1">
            {stakes.slice(0, compact ? 3 : stakes.length).map((s) => {
                const won =
                  isFinished &&
                  ((s.pickedHome && homeWon) || (s.pickedAway && awayWon));
                const lost =
                  isFinished &&
                  ((s.pickedHome && awayWon) || (s.pickedAway && homeWon));
                return (
                  <img
                    key={s.id}
                    src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(s.avatar_seed)}`}
                    alt={s.name}
                    title={s.name}
                    width={compact ? 14 : 16}
                    height={compact ? 14 : 16}
                    className={`rounded-full ring-2 ring-surface ${
                      won
                        ? "ring-success-border"
                        : lost
                          ? "opacity-50 grayscale"
                          : ""
                    } ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
                  />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRow({
  code,
  name,
  score,
  won,
  lost,
  compact,
}: {
  code: string;
  name: string;
  score: number | null;
  won: boolean;
  lost: boolean;
  compact?: boolean;
}) {
  const displayName = name === "TBD" || !name ? "TBD" : name;

  return (
    <div
      className={`flex items-center gap-1.5 rounded px-0.5 ${
        compact ? "py-0" : "px-1 py-0.5"
      } ${won ? "bg-success-muted" : ""} ${lost ? "opacity-45" : ""}`}
    >
      <TeamFlag code={code} teamName={name} size={compact ? 16 : 18} />
      <span
        className={`min-w-0 flex-1 truncate leading-tight ${
          compact ? "text-[12px]" : "text-[13px]"
        } ${won ? "font-semibold text-success" : ""}`}
      >
        {displayName}
      </span>
      {score !== null && score !== undefined && (
        <span
          className={`shrink-0 tabular-nums font-semibold ${
            compact ? "text-[12px]" : "text-[13px]"
          } ${won ? "text-success" : ""}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
