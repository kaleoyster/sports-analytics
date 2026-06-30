"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/lib/api";
import TeamFlag from "./TeamFlag";
import { Card } from "./ui";

function formatGd(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

function stageName(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatRow({
  label,
  leftVal,
  rightVal,
  higherIsBetter = true,
}: {
  label: string;
  leftVal: number;
  rightVal: number;
  higherIsBetter?: boolean;
}) {
  const leftBetter = higherIsBetter ? leftVal > rightVal : leftVal < rightVal;
  const rightBetter = higherIsBetter ? rightVal > leftVal : rightVal < leftVal;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className={`w-10 text-right text-sm font-bold ${leftBetter ? "text-success" : "text-text-muted"}`}
      >
        {leftVal}
      </span>
      <div className="flex-1 text-center">
        <span className="text-[10px] text-text-muted">{label}</span>
        <div className="mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className={`transition-all ${leftBetter ? "bg-success" : "bg-border"}`}
            style={{
              width:
                leftVal + rightVal > 0
                  ? `${(leftVal / (leftVal + rightVal)) * 100}%`
                  : "50%",
            }}
          />
          <div
            className={`transition-all ${rightBetter ? "bg-accent" : "bg-border"}`}
            style={{
              width:
                leftVal + rightVal > 0
                  ? `${(rightVal / (leftVal + rightVal)) * 100}%`
                  : "50%",
            }}
          />
        </div>
      </div>
      <span
        className={`w-10 text-left text-sm font-bold ${rightBetter ? "text-accent" : "text-text-muted"}`}
      >
        {rightVal}
      </span>
    </div>
  );
}

function MemberBadge({
  entry,
  color,
}: {
  entry: LeaderboardEntry;
  color: "success" | "accent";
}) {
  const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(entry.avatar_seed)}`;
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={avatarUrl}
        alt={entry.member_name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full bg-surface-muted"
      />
      <p className={`text-xs font-bold text-${color}`}>{entry.member_name}</p>
      <div className="flex gap-1.5">
        {entry.teams.map((t) => (
          <div key={t.team_code} className="flex items-center gap-0.5 text-[10px] text-text-muted">
            <TeamFlag code={t.team_code} teamName={t.team_name} size={12} />
            <span>{t.team_code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HeadToHeadProps {
  entries: LeaderboardEntry[];
  bare?: boolean;
}

export default function HeadToHead({ entries, bare = false }: HeadToHeadProps) {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.min(1, entries.length - 1));

  if (entries.length < 2) return null;

  function handleLeftChange(idx: number) {
    setLeftIdx(idx);
    if (idx === rightIdx) {
      const next = entries.findIndex((_, i) => i !== idx);
      if (next >= 0) setRightIdx(next);
    }
  }

  function handleRightChange(idx: number) {
    setRightIdx(idx);
    if (idx === leftIdx) {
      const next = entries.findIndex((_, i) => i !== idx);
      if (next >= 0) setLeftIdx(next);
    }
  }

  const left = entries[leftIdx];
  const right = entries[rightIdx];

  const leftGF = left.teams.reduce((s, t) => s + t.goals_for, 0);
  const leftGA = left.teams.reduce((s, t) => s + t.goals_against, 0);
  const leftWins = left.teams.reduce((s, t) => s + t.match_wins, 0);
  const leftDraws = left.teams.reduce((s, t) => s + t.match_draws, 0);
  const leftLosses = left.teams.reduce((s, t) => s + t.match_losses, 0);

  const rightGF = right.teams.reduce((s, t) => s + t.goals_for, 0);
  const rightGA = right.teams.reduce((s, t) => s + t.goals_against, 0);
  const rightWins = right.teams.reduce((s, t) => s + t.match_wins, 0);
  const rightDraws = right.teams.reduce((s, t) => s + t.match_draws, 0);
  const rightLosses = right.teams.reduce((s, t) => s + t.match_losses, 0);

  const Wrapper = bare
    ? ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    : ({ children }: { children: React.ReactNode }) => (
        <Card className="p-4">{children}</Card>
      );

  return (
    <Wrapper>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={leftIdx}
          onChange={(e) => handleLeftChange(Number(e.target.value))}
          className="w-full flex-1 rounded-md border border-success-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none sm:w-auto"
        >
          {entries.map((e, i) => (
            <option key={e.member_id} value={i} disabled={i === rightIdx}>
              #{e.rank} {e.member_name}
            </option>
          ))}
        </select>
        <span className="text-center text-xs text-text-muted font-bold sm:shrink-0">vs</span>
        <select
          value={rightIdx}
          onChange={(e) => handleRightChange(Number(e.target.value))}
          className="w-full flex-1 rounded-md border border-accent-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none sm:w-auto"
        >
          {entries.map((e, i) => (
            <option key={e.member_id} value={i} disabled={i === leftIdx}>
              #{e.rank} {e.member_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex items-start justify-around">
        <MemberBadge entry={left} color="success" />
        <MemberBadge entry={right} color="accent" />
      </div>

      <div className="divide-y divide-border">
        <StatRow label="Points" leftVal={left.total_points} rightVal={right.total_points} />
        <StatRow label="GD" leftVal={left.total_goal_difference} rightVal={right.total_goal_difference} />
        <StatRow label="Scored" leftVal={leftGF} rightVal={rightGF} />
        <StatRow label="Conceded" leftVal={leftGA} rightVal={rightGA} higherIsBetter={false} />
        <StatRow label="Wins" leftVal={leftWins} rightVal={rightWins} />
        <StatRow label="Draws" leftVal={leftDraws} rightVal={rightDraws} />
        <StatRow label="Losses" leftVal={leftLosses} rightVal={rightLosses} higherIsBetter={false} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {(
          [
            { entry: left, side: "left" as const },
            { entry: right, side: "right" as const },
          ] as const
        ).map(({ entry, side }) => (
          <div key={side}>
            {entry.teams.map((team) => (
              <div
                key={`${side}-${team.team_code}`}
                className="mb-1.5 last:mb-0 rounded-md bg-surface-muted px-2 py-1.5"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <TeamFlag code={team.team_code} teamName={team.team_name} size={14} />
                  <span className="text-xs font-medium">{team.team_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[10px] text-text-muted">
                  <span>{team.match_wins}W-{team.match_draws}D-{team.match_losses}L</span>
                  <span>GD {formatGd(team.goal_difference)}</span>
                  <span>{team.total_points} pts</span>
                  <span>{stageName(team.furthest_stage)}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
