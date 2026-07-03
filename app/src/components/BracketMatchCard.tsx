"use client";

import type { MatchResult } from "@/lib/api";
import type { MemberStake } from "@/lib/bracket";
import { formatMatchSchedule } from "@/lib/datetime";
import { matchWinnerSide } from "@/lib/tracker";
import TeamFlag from "./TeamFlag";

interface BracketMatchCardProps {
  match: MatchResult | null;
  stakes: MemberStake[];
  compact?: boolean;
}

export default function BracketMatchCard({
  match,
  stakes,
  compact = false,
}: BracketMatchCardProps) {
  if (!match) {
    return (
      <div className="flex h-full flex-col justify-center rounded-lg border border-dashed border-border bg-surface-muted px-2 py-2">
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

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface px-2 py-1.5 shadow-sm">
      {!compact && (
        <div className="mb-1 flex min-h-[14px] items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] leading-none text-text-muted">
            {schedule.primary}
          </p>
          {schedule.badge && (
            <span className="shrink-0 text-[10px] font-semibold uppercase leading-none text-text-muted">
              {schedule.badge}
            </span>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5">
        <TeamRow
          code={match.home_code}
          name={match.home_team}
          score={match.home_score}
          won={isFinished && homeWon}
          lost={isFinished && awayWon}
        />
        <TeamRow
          code={match.away_code}
          name={match.away_team}
          score={match.away_score}
          won={isFinished && awayWon}
          lost={isFinished && homeWon}
        />
      </div>

      {stakes.length > 0 && (
        <div className="mt-1 flex shrink-0 flex-wrap gap-0.5 border-t border-border pt-1">
          {stakes.map((s) => {
            const won =
              isFinished &&
              ((s.pickedHome && homeWon) || (s.pickedAway && awayWon));
            const lost =
              isFinished &&
              ((s.pickedHome && awayWon) || (s.pickedAway && homeWon));
            return (
              <div
                key={s.id}
                className={`flex items-center gap-0.5 rounded-full px-1 py-0.5 ${
                  won
                    ? "bg-success-muted ring-1 ring-success-border"
                    : lost
                      ? "bg-danger-muted opacity-60"
                      : "bg-surface-muted"
                }`}
                title={s.name}
              >
                <img
                  src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(s.avatar_seed)}`}
                  alt={s.name}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-full"
                />
              </div>
            );
          })}
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
}: {
  code: string;
  name: string;
  score: number | null;
  won: boolean;
  lost: boolean;
}) {
  const displayName = name === "TBD" || !name ? "TBD" : name;

  return (
    <div
      className={`flex items-center gap-1.5 rounded px-1 py-0.5 ${
        won ? "bg-success-muted" : ""
      } ${lost ? "opacity-45" : ""}`}
    >
      <TeamFlag code={code} teamName={name} size={18} />
      <span
        className={`min-w-0 flex-1 truncate text-[13px] leading-tight ${
          won ? "font-semibold text-success" : ""
        }`}
      >
        {displayName}
      </span>
      {score !== null && score !== undefined && (
        <span
          className={`shrink-0 tabular-nums text-[13px] font-semibold ${
            won ? "text-success" : ""
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
