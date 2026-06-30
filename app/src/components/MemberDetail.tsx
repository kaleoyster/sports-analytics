"use client";

import type { LeaderboardEntry, MatchResult } from "@/lib/api";
import { analyzeTeam, STAGE_LABELS } from "@/lib/tracker";
import TeamFlag from "./TeamFlag";

function formatGd(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

function pointsColor(category: string, points: number): string {
  if (category === "loss") return "text-text-muted";
  if (points > 0) return "text-success";
  return "text-text-muted";
}

function StatusDot({ eliminated }: { eliminated: boolean }) {
  return (
    <span
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${eliminated ? "bg-danger" : "bg-success"}`}
      aria-label={eliminated ? "Eliminated" : "Still in tournament"}
    />
  );
}

interface MemberDetailProps {
  entry: LeaderboardEntry;
  matches: MatchResult[];
}

export default function MemberDetail({ entry, matches }: MemberDetailProps) {
  return (
    <div>
      {entry.teams.map((team) => {
        const status = analyzeTeam(team.team_code, team.team_name, matches);
        const statusLabel = status.eliminated
          ? `Out — ${STAGE_LABELS[status.eliminatedStage!] || status.eliminatedStage}${status.eliminatedBy ? ` vs ${status.eliminatedBy}` : ""}`
          : `Alive — ${STAGE_LABELS[status.currentStage] || status.currentStage}`;

        return (
          <div key={team.team_code} className="mb-4 last:mb-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusDot eliminated={status.eliminated} />
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
    </div>
  );
}
