"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getLeague, type League } from "@/lib/api";
import JoinForm from "@/components/JoinForm";
import { Spinner } from "@/components/ui";

function JoinPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeague(slug)
      .then(setLeague)
      .catch(() => setLeague(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">
        Join {league?.name ?? "the Leaderboard"}
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Pick your 2 teams to get on the board.
      </p>
      <JoinForm slug={slug} initialInviteCode={code} locked={league?.picks_locked ?? false} />
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageInner />
    </Suspense>
  );
}
