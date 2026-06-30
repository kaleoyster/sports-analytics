"use client";

import { useMemo, useState } from "react";
import type { LeaderboardEntry, MatchResult } from "@/lib/api";
import TeamFlag from "./TeamFlag";
import HeadToHead from "./HeadToHead";
import MemberDetail from "./MemberDetail";
import { Card, Modal } from "./ui";

type Metric = "points" | "goals" | "defense" | "winpct";
type Tab = Metric | "compare";

function goalsFor(e: LeaderboardEntry): number {
  return e.teams.reduce((s, t) => s + t.goals_for, 0);
}

function goalsAgainst(e: LeaderboardEntry): number {
  return e.teams.reduce((s, t) => s + t.goals_against, 0);
}

interface MetricConfig {
  tab: Metric;
  label: string;
  unit: string;
  value: (e: LeaderboardEntry) => number;
  sort: (a: LeaderboardEntry, b: LeaderboardEntry) => number;
}

function buildMetrics(winChance?: Map<number, number>): MetricConfig[] {
  const base: MetricConfig[] = [
    {
      tab: "points",
      label: "Points",
      unit: "pts",
      value: (e) => e.total_points,
      sort: (a, b) =>
        b.total_points - a.total_points ||
        b.total_goal_difference - a.total_goal_difference,
    },
    {
      tab: "goals",
      label: "Goals",
      unit: "GF",
      value: goalsFor,
      sort: (a, b) => goalsFor(b) - goalsFor(a) || b.total_points - a.total_points,
    },
    {
      tab: "defense",
      label: "Defense",
      unit: "GA",
      value: goalsAgainst,
      sort: (a, b) =>
        goalsAgainst(a) - goalsAgainst(b) || b.total_points - a.total_points,
    },
  ];

  if (winChance && winChance.size > 0) {
    base.push({
      tab: "winpct",
      label: "Win %",
      unit: "%",
      value: (e) => winChance.get(e.member_id) ?? 0,
      sort: (a, b) =>
        (winChance.get(b.member_id) ?? 0) - (winChance.get(a.member_id) ?? 0),
    });
  }

  return base;
}

const RANK_BADGE: Record<number, string> = {
  1: "bg-gold/20 text-gold border-gold/50",
  2: "bg-silver/20 text-silver border-silver/50",
  3: "bg-bronze/20 text-bronze border-bronze/50",
};

function LeaderRow({
  rank,
  entry,
  value,
  unit,
  onClick,
}: {
  rank: number;
  entry: LeaderboardEntry;
  value: number;
  unit: string;
  onClick: () => void;
}) {
  const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(entry.avatar_seed)}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-surface-muted"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
          RANK_BADGE[rank] ?? "border-border bg-surface-muted text-text-muted"
        }`}
      >
        {rank}
      </span>
      <img
        src={avatarUrl}
        alt={entry.member_name}
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full bg-surface-muted"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{entry.member_name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {entry.teams.map((t) => (
            <span key={t.team_code} className="flex items-center gap-1 text-[11px] text-text-muted">
              <TeamFlag code={t.team_code} teamName={t.team_name} size={13} />
              {t.team_name}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-lg font-bold tabular-nums">{value}</span>
        <span className="ml-0.5 text-[11px] text-text-muted">{unit}</span>
      </div>
    </button>
  );
}

interface StatLeadersProps {
  entries: LeaderboardEntry[];
  winChanceByMember?: Map<number, number>;
  matches?: MatchResult[];
}

export default function StatLeaders({
  entries,
  winChanceByMember,
  matches = [],
}: StatLeadersProps) {
  const metrics = useMemo(() => buildMetrics(winChanceByMember), [winChanceByMember]);
  const [tab, setTab] = useState<Tab>("points");
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);

  const active = metrics.find((m) => m.tab === tab);
  const ranked = useMemo(() => {
    if (!active) return [];
    return [...entries].sort(active.sort);
  }, [entries, active]);

  if (entries.length === 0) return null;

  const tabs: { tab: Tab; label: string }[] = [
    ...metrics.map((m) => ({ tab: m.tab as Tab, label: m.label })),
    ...(entries.length >= 2 ? [{ tab: "compare" as Tab, label: "Compare" }] : []),
  ];

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Standings</h2>
        <span className="text-[11px] text-text-muted">{entries.length} members</span>
      </div>

      <div className="-mx-1 mb-1 flex gap-1 overflow-x-auto border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.tab}
            type="button"
            onClick={() => setTab(t.tab)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              tab === t.tab
                ? "bg-accent-muted text-accent"
                : "text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compare" ? (
        <div className="pt-1">
          <HeadToHead entries={entries} bare />
        </div>
      ) : active ? (
        <div className="divide-y divide-border">
          {ranked.map((entry, i) => (
            <LeaderRow
              key={entry.member_id}
              rank={i + 1}
              entry={entry}
              value={active.value(entry)}
              unit={active.unit}
              onClick={() => setSelected(entry)}
            />
          ))}
        </div>
      ) : null}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          selected && (
            <div className="flex items-center gap-3">
              <img
                src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(selected.avatar_seed)}`}
                alt={selected.member_name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full bg-surface-muted"
              />
              <div>
                <p className="font-semibold leading-tight">{selected.member_name}</p>
                <p className="text-xs text-text-muted">
                  #{selected.rank} · {selected.total_points} pts
                </p>
              </div>
            </div>
          )
        }
      >
        {selected && <MemberDetail entry={selected} matches={matches} />}
      </Modal>
    </Card>
  );
}
