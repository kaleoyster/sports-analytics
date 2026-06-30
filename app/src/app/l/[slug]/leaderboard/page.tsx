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
import Leaderboard from "@/components/Leaderboard";
import TimelineFeed from "@/components/TimelineFeed";
import RecentResults from "@/components/RecentResults";
import { btnPrimary, Card, PageError, Spinner } from "@/components/ui";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-text-muted">{label}:</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

/** Legacy full leaderboard view — kept at /leaderboard, not linked in nav. */
export default function LeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [members, setMembers] = useState<MemberOut[]>([]);
  const [allMatches, setAllMatches] = useState<MatchResult[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<MatchResult[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getLeaderboard(slug),
      getMembers(slug),
      getMatches(),
      getPredictions(slug).catch(() => null),
    ])
      .then(([lb, mem, all, pred]) => {
        setEntries(lb);
        setMembers(mem);
        setAllMatches(all);
        setFinishedMatches(all.filter((m) => m.status === "FINISHED"));
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

  const leaders = entries.filter((e) => e.rank === 1);
  const topEntry = entries[0];

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Stat label={leaders.length > 1 ? "Leaders" : "Leader"}>
          {leaders.map((e) => e.member_name).join(" & ") || "—"}
        </Stat>
        <Stat label="Top score">
          {topEntry
            ? `${topEntry.total_points} pts · GD ${topEntry.total_goal_difference >= 0 ? "+" : ""}${topEntry.total_goal_difference}`
            : "0"}
        </Stat>
        <Stat label="Played">{finishedMatches.length}</Stat>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Rankings</h2>
        <Leaderboard
          entries={entries}
          winChanceByMember={winChanceByMember}
          matches={allMatches}
        />
      </section>

      <TimelineFeed matches={finishedMatches} members={members} limit={8} />

      <RecentResults matches={finishedMatches} />
    </div>
  );
}
