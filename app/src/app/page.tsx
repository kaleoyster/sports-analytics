"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLeague, getLeague, setAdminToken } from "@/lib/api";
import { getRecentLeagues, rememberLeague, removeRecentLeague, type RecentLeague } from "@/lib/identity";
import { btnPrimary, btnSecondary, Card, inputClass, PageError, Spinner } from "@/components/ui";

export default function Landing() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinSlug, setJoinSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentLeague[]>([]);

  useEffect(() => {
    setRecent(getRecentLeagues());
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const league = await createLeague(name.trim());
      setAdminToken(league.slug, league.admin_token);
      rememberLeague(league.slug, league.name);
      router.push(`/l/${league.slug}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create league");
      setCreating(false);
    }
  }

  function parseSlug(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/\/l\/([^/?#]+)/);
    return match ? match[1] : trimmed;
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const slug = parseSlug(joinSlug);
    if (!slug) return;
    setError(null);
    try {
      const league = await getLeague(slug);
      rememberLeague(league.slug, league.name);
      router.push(`/l/${slug}`);
    } catch {
      setError("No league found for that link or code.");
    }
  }

  function openRecent(league: RecentLeague) {
    rememberLeague(league.slug, league.name);
    router.push(`/l/${league.slug}`);
  }

  function forgetRecent(slug: string) {
    removeRecentLeague(slug);
    setRecent(getRecentLeagues());
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-12 text-center animate-fade-up">
        <img
          src="/fifa-trophy.png"
          alt="FIFA World Cup Trophy"
          width={80}
          height={80}
          className="mx-auto mb-4 h-20 w-20 object-contain"
        />
        <h1 className="text-4xl font-bold tracking-tight text-text">FIFA World Cup 2026</h1>
        <p className="mt-2 text-lg text-text-muted">Family Leaderboard</p>
        <p className="mt-3 text-text-muted">
          Create a league for your family or group, pick teams, and track the World Cup together.
        </p>
      </div>

      {recent.length > 0 && (
        <section className="mb-8 animate-fade-up">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Your leagues
          </h2>
          <div className="grid gap-2">
            {recent.map((league) => (
              <Card key={league.slug} className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => openRecent(league)}
                  className="min-w-0 flex-1 text-left hover:opacity-80 transition"
                >
                  <p className="truncate font-medium">{league.name}</p>
                  <p className="text-xs text-text-muted">/{league.slug}</p>
                </button>
                <button
                  type="button"
                  onClick={() => forgetRecent(league.slug)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-surface-muted transition"
                  aria-label={`Remove ${league.name} from recent`}
                >
                  Remove
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2 animate-fade-up">
        <Card className="p-6">
          <form onSubmit={handleCreate}>
            <h2 className="text-lg font-semibold">Start a new league</h2>
            <p className="mt-1 mb-4 text-sm text-text-muted">
              You&apos;ll become the admin and get an invite link to share.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Smith Family"
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className={`mt-4 w-full ${btnPrimary}`}
            >
              {creating ? "Creating…" : "Create league"}
            </button>
          </form>
        </Card>

        <Card className="p-6">
          <form onSubmit={handleJoin}>
            <h2 className="text-lg font-semibold">Open an existing league</h2>
            <p className="mt-1 mb-4 text-sm text-text-muted">
              Paste the invite link or enter the league&apos;s slug.
            </p>
            <input
              type="text"
              value={joinSlug}
              onChange={(e) => setJoinSlug(e.target.value)}
              placeholder="https://…/l/smith-family-ab12"
              className={inputClass}
              required
            />
            <button type="submit" className={`mt-4 w-full ${btnSecondary}`}>
              Go to league
            </button>
          </form>
        </Card>
      </div>

      {error && (
        <div className="mt-6">
          <PageError message={error} />
        </div>
      )}

      {creating && (
        <div className="mt-8 flex justify-center">
          <Spinner />
        </div>
      )}
    </div>
  );
}
