"use client";

import { useState } from "react";
import type { LeaderboardEntry, LeaderboardSort, MatchResult } from "@/lib/api";
import { analyzeTeam, STAGE_LABELS } from "@/lib/tracker";
import TeamFlag from "./TeamFlag";

interface MemberCardProps {
  entry: LeaderboardEntry;
  displayRank?: number;
  sortBy?: LeaderboardSort;
  goalsFor?: number;
  goalsAgainst?: number;
  officialRank?: number;
  winProbability?: number;
  matches?: MatchResult[];
}

function stageName(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGd(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

function pointsColor(category: string, points: number): string {
  if (category === "loss") return "text-text-muted";
  if (points > 0) return "text-success";
  return "text-text-muted";
}

function StatusDot({ eliminated, size = "sm" }: { eliminated: boolean; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span
      className={`shrink-0 rounded-full ${dim} ${eliminated ? "bg-danger" : "bg-success"}`}
      aria-label={eliminated ? "Eliminated" : "Still in tournament"}
    />
  );
}

export default function MemberCard({
  entry,
  displayRank = entry.rank,
  sortBy = "points",
  goalsFor = 0,
  goalsAgainst = 0,
  officialRank = entry.rank,
  winProbability,
  matches = [],
}: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(entry.avatar_seed)}`;

  const rankColors: Record<number, string> = {
    1: "from-gold/20 to-gold/5 border-gold/40",
    2: "from-silver/20 to-silver/5 border-silver/40",
    3: "from-bronze/20 to-bronze/5 border-bronze/40",
  };

  const cardClass =
    rankColors[displayRank] || "from-surface-muted to-surface border-border";

  const hasBreakdown = entry.teams.some((t) => t.breakdown?.length > 0);

  function teamStatus(code: string, name: string) {
    return analyzeTeam(code, name, matches);
  }

  return (
    <div className={`rounded-xl border bg-gradient-to-r shadow-sm ${cardClass}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3 sm:gap-4 sm:p-4 text-left transition hover:opacity-90"
        aria-expanded={expanded}
      >
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-base sm:text-lg font-bold border border-border">
          {displayRank}
        </div>

        <img
          src={avatarUrl}
          alt={entry.member_name}
          width={48}
          height={48}
          className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-surface-muted border border-border"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-base sm:text-lg font-semibold">{entry.member_name}</p>
            {winProbability !== undefined && (
              <span
                className="shrink-0 rounded-full bg-accent-muted px-2 py-0.5 text-[11px] font-semibold text-accent"
                title="Projected chance to win the league"
              >
                {winProbability}% to win
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
            {entry.teams.map((t) => {
              const status = teamStatus(t.team_code, t.team_name);
              return (
                <div
                  key={t.team_code}
                  className="flex items-center gap-1 text-xs sm:text-sm text-text-muted"
                >
                  <StatusDot eliminated={status.eliminated} />
                  <TeamFlag code={t.team_code} teamName={t.team_name} size={18} />
                  <span className="truncate max-w-[6rem] sm:max-w-none">{t.team_name}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            <span className={sortBy === "goals_for" ? "text-success font-medium" : ""}>
              {goalsFor} scored
            </span>
            {" · "}
            <span className={sortBy === "goals_against" ? "text-success font-medium" : ""}>
              {goalsAgainst} conceded
            </span>
            {sortBy !== "points" && <span> · pts rank #{officialRank}</span>}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl sm:text-2xl font-bold text-accent">{entry.total_points}</p>
          <p className="text-xs text-text-muted">
            pts · GD {formatGd(entry.total_goal_difference)}
          </p>
        </div>

        <span
          className={`shrink-0 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
          <p className="mb-3 text-sm text-text-muted">
            How {entry.member_name}&apos;s score was calculated
          </p>

          {entry.teams.map((team) => {
            const status = teamStatus(team.team_code, team.team_name);
            const statusLabel = status.eliminated
              ? `Out — ${STAGE_LABELS[status.eliminatedStage!] || status.eliminatedStage}${status.eliminatedBy ? ` vs ${status.eliminatedBy}` : ""}`
              : `Alive — ${STAGE_LABELS[status.currentStage] || status.currentStage}`;

            return (
              <div key={team.team_code} className="mb-4 last:mb-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusDot eliminated={status.eliminated} size="md" />
                  <TeamFlag code={team.team_code} teamName={team.team_name} size={20} />
                  <span className="font-medium">{team.team_name}</span>
                  <span
                    className={`text-xs font-medium ${
                      status.eliminated ? "text-danger" : "text-success"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mb-2 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted px-3 py-2 text-center text-xs">
                  <div>
                    <p className="text-text-muted">Record</p>
                    <p className="font-medium">
                      {team.match_wins}W-{team.match_draws}D-{team.match_losses}L
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Goals</p>
                    <p className="font-medium">
                      {team.goals_for} scored · {team.goals_against} conceded
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Goal diff</p>
                    <p className="font-medium">{formatGd(team.goal_difference)}</p>
                  </div>
                </div>

                {team.breakdown?.length > 0 ? (
                  <ul className="space-y-1.5 rounded-lg bg-surface-muted px-3 py-2">
                    {team.breakdown.map((item, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 text-sm">
                        <span>{item.label}</span>
                        <span
                          className={`shrink-0 font-medium ${pointsColor(item.category, item.points)}`}
                        >
                          {item.points > 0 ? `+${item.points}` : item.points}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-medium">
                      <span className="text-text-muted">Team subtotal</span>
                      <span>{team.total_points} pts</span>
                    </li>
                  </ul>
                ) : (
                  <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-text-muted">
                    No finished matches yet for this team.
                  </p>
                )}
              </div>
            );
          })}

          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm font-semibold">
            <span>Total</span>
            <span>
              {entry.total_points} pts · GD {formatGd(entry.total_goal_difference)}
            </span>
          </div>

          {!hasBreakdown && (
            <p className="mt-2 text-xs text-text-muted">
              Points update as matches finish. Wins = 3 pts, draws = 1 pt, plus bonuses for
              reaching knockout rounds. Ties on points are broken by combined goal difference.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
