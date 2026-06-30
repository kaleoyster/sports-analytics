"use client";

import type { MatchResult, MemberOut } from "@/lib/api";
import { analyzeTeam, STAGE_LABELS } from "@/lib/tracker";
import TeamFlag from "./TeamFlag";
import { Card } from "./ui";

interface EliminationTrackerProps {
  members: MemberOut[];
  matches: MatchResult[];
  compact?: boolean;
}

function TeamPill({
  code,
  name,
  eliminated,
  eliminatedStage,
  eliminatedBy,
  currentStage,
}: {
  code: string;
  name: string;
  eliminated: boolean;
  eliminatedStage: string | null;
  eliminatedBy: string | null;
  currentStage: string;
}) {
  const title = eliminated
    ? `Eliminated in ${STAGE_LABELS[eliminatedStage!] || eliminatedStage}${eliminatedBy ? ` by ${eliminatedBy}` : ""}`
    : `Still in — ${STAGE_LABELS[currentStage] || currentStage}`;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
        eliminated
          ? "border-danger-border bg-danger-muted text-danger line-through decoration-danger/50"
          : "border-success-border bg-success-muted text-success"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${eliminated ? "bg-danger" : "bg-success"}`}
        aria-hidden
      />
      <TeamFlag code={code} teamName={name} size={14} />
      <span className="truncate max-w-[5rem]">{name}</span>
    </span>
  );
}

export default function EliminationTracker({
  members,
  matches,
  compact = false,
}: EliminationTrackerProps) {
  if (members.length === 0) return null;

  const rows = members
    .map((member) => {
      const teamStatuses = member.teams.map((t) =>
        analyzeTeam(t.team_code, t.team_name, matches)
      );
      const aliveCount = teamStatuses.filter((t) => !t.eliminated).length;
      return { member, teamStatuses, aliveCount };
    })
    .sort((a, b) => b.aliveCount - a.aliveCount);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {rows.map(({ member, teamStatuses }) => (
          <div
            key={member.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <img
              src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(member.avatar_seed)}`}
              alt={member.name}
              width={20}
              height={20}
              className="h-5 w-5 rounded-full"
            />
            <span className="font-medium text-xs">{member.name}</span>
            {teamStatuses.map((ts) => (
              <TeamPill key={ts.code} {...ts} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="divide-y divide-border">
      <div className="flex items-center justify-between px-3 py-2 text-xs text-text-muted">
        <span>Member</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" /> Alive
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-danger" /> Out
          </span>
        </span>
      </div>
      {rows.map(({ member, teamStatuses, aliveCount }) => (
        <div key={member.id} className="flex items-center gap-3 px-3 py-2.5">
          <img
            src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(member.avatar_seed)}`}
            alt={member.name}
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{member.name}</p>
            <p className="text-[11px] text-text-muted">
              {aliveCount === 2
                ? "Both teams alive"
                : aliveCount === 1
                  ? "1 team alive"
                  : teamStatuses.some((t) => t.eliminated)
                    ? "Eliminated"
                    : "In progress"}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {teamStatuses.map((ts) => (
              <TeamPill key={ts.code} {...ts} />
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
