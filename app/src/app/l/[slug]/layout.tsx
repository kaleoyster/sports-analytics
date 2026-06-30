"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getLeague, isAdmin, type League } from "@/lib/api";
import { rememberLeague } from "@/lib/identity";
import { PageError } from "@/components/ui";

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [league, setLeague] = useState<League | null>(null);
  const [admin, setAdmin] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin(slug));
    getLeague(slug)
      .then((lg) => {
        setLeague(lg);
        rememberLeague(lg.slug, lg.name);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const base = `/l/${slug}`;

  return (
    <>
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-40 sm:px-6 sm:py-4">
        <nav className="max-w-5xl mx-auto flex items-center gap-3">
          <a href={base} className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src="/fifa-trophy.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-accent sm:hidden">
                WC 2026
              </span>
              <span className="hidden text-base font-bold tracking-tight text-accent sm:block">
                FIFA World Cup 2026
              </span>
              {league && (
                <span className="block truncate text-xs text-text-muted">{league.name}</span>
              )}
            </div>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            {admin && (
              <a
                href={`${base}/admin`}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-muted transition"
              >
                Admin
              </a>
            )}
            <a
              href={`${base}/join`}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                league?.picks_locked
                  ? "bg-surface-muted text-text-muted pointer-events-none"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {league?.picks_locked ? "Locked" : "Join"}
            </a>
          </div>
        </nav>
        {league?.picks_locked && (
          <p className="max-w-5xl mx-auto mt-2 text-xs text-text-muted">
            <span className="rounded-full bg-warning-muted px-2 py-0.5 text-warning border border-warning-border">
              Picks locked
            </span>
          </p>
        )}
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {notFound ? (
          <PageError
            message="League not found"
            detail="Check the link or create a new league from the home page."
          />
        ) : (
          children
        )}
      </main>
    </>
  );
}
