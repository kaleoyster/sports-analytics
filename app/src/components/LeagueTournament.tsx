"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  getLeaderboard,
  getMatches,
  getMembers,
  getPredictions,
  type LeaderboardEntry,
  type MatchResult,
  type MemberOut,
  type PredictionResult,
} from "@/lib/api";
import CompactBracket from "@/components/CompactBracket";
import StatLeaders from "@/components/StatLeaders";
import TimelineFeed from "@/components/TimelineFeed";
import UpcomingMatches from "@/components/UpcomingMatches";
import { btnPrimary, Card, PageError, Spinner } from "@/components/ui";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-text-muted">{label}:</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

export default function LeagueTournament() {
  const { slug } = useParams<{ slug: string }>();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [members, setMembers] = useState<MemberOut[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMatches(),
      getMembers(slug),
      getLeaderboard(slug),
      getPredictions(slug).catch(() => null),
    ])
      .then(([m, mem, lb, pred]) => {
        setMatches(m);
        setMembers(mem);
        setEntries(lb);
        setPredictions(pred);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const winChanceByMember = useMemo(() => {
    const map = new Map<number, number>();
    predictions?.predictions.forEach((p) => map.set(p.member_id, p.win_probability));
    return map;
  }, [predictions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <PageError message="Failed to load data" detail={error} />;
  }

  if (entries.length === 0) {
    return (
      <Card className="border-dashed p-12 text-center">
        <p className="text-lg text-text-muted">No members yet</p>
        <p className="mt-1 text-sm text-text-muted">
          Share the invite link so your family can pick their teams.
        </p>
        <a href={`/l/${slug}/join`} className={`mt-6 inline-block ${btnPrimary}`}>
          Add the first member
        </a>
      </Card>
    );
  }

  const leaders = entries.filter((e) => e.rank === 1);
  const topEntry = entries[0];
  const playedCount = matches.filter((m) => m.status === "FINISHED").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <UpcomingMatches matches={matches} members={members} limit={2} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Stat label={leaders.length > 1 ? "Leaders" : "Leader"}>
          {leaders.map((e) => e.member_name).join(" & ") || "—"}
        </Stat>
        <Stat label="Top score">
          {topEntry
            ? `${topEntry.total_points} pts · GD ${topEntry.total_goal_difference >= 0 ? "+" : ""}${topEntry.total_goal_difference}`
            : "0"}
        </Stat>
        <Stat label="Played">{playedCount}</Stat>
      </div>

      {/* DOM order = mobile order: standings → bracket → timeline */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <StatLeaders
            entries={entries}
            winChanceByMember={winChanceByMember}
            matches={matches}
          />
        </div>

        <section className="min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <h2 className="mb-3 text-lg font-semibold">Knockout bracket</h2>
          <CompactBracket matches={matches} members={members} />
        </section>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <TimelineFeed matches={matches} members={members} limit={8} compact />
        </div>
      </div>
    </div>
  );
}
