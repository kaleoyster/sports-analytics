"use client";

import { useEffect, useState } from "react";
import { createMember, getTeams, isAdmin, type Team } from "@/lib/api";
import { getSavedMember as loadIdentity, saveMember as persistIdentity } from "@/lib/identity";
import TeamFlag from "./TeamFlag";
import { btnPrimary, btnSecondary, inputClass } from "./ui";

interface JoinFormProps {
  slug: string;
  initialInviteCode?: string;
  locked?: boolean;
}

export default function JoinForm({ slug, initialInviteCode = "", locked = false }: JoinFormProps) {
  const saved = loadIdentity(slug);
  const [name, setName] = useState(saved?.name ?? "");
  const [avatarSeed, setAvatarSeed] = useState(saved?.avatar_seed ?? "");
  const [rememberMe, setRememberMe] = useState(true);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const admin = isAdmin(slug);

  useEffect(() => {
    getTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  const seed = avatarSeed || name || "anonymous";
  const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  );

  function toggleTeam(code: string) {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 2) return prev;
      return [...prev, code];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selected.length !== 2) return;

    setSubmitting(true);
    setError(null);
    try {
      await createMember(slug, inviteCode.trim(), name.trim(), seed, selected);
      if (rememberMe) {
        persistIdentity(slug, { name: name.trim(), avatar_seed: seed });
      }
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("403")) setError("Invalid invite code.");
      else if (msg.includes("423")) setError("Picks are locked for this league.");
      else if (msg.includes("409")) setError("That name is already taken in this league.");
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (locked && !admin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-warning-border bg-warning-muted p-8 text-center">
        <h2 className="text-xl font-bold text-warning">Picks are locked</h2>
        <p className="mt-2 text-text-muted">
          The tournament is underway — new picks can&apos;t be added to this league.
        </p>
        <a href={`/l/${slug}`} className={`mt-6 inline-block ${btnSecondary}`}>
          Back to leaderboard
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-success-border bg-success-muted p-8 text-center animate-fade-up">
        <img
          src={avatarUrl}
          alt={name}
          width={80}
          height={80}
          className="mx-auto mb-4 h-20 w-20 rounded-full bg-surface-muted"
        />
        <h2 className="text-xl font-bold text-success">You&apos;re in!</h2>
        <p className="mt-2 text-text-muted">
          {name} is on the leaderboard with{" "}
          {selected.map((c) => teams.find((t) => t.code === c)?.name || c).join(" & ")}.
        </p>
        <a href={`/l/${slug}`} className={`mt-6 inline-block ${btnPrimary}`}>
          View Leaderboard
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-8">
      {saved && (
        <div className="rounded-xl border border-accent-border bg-accent-muted/50 px-4 py-3 text-sm text-accent">
          Welcome back, {saved.name}! Your details are pre-filled — update them if needed.
        </div>
      )}

      {!admin && (
        <div>
          <label htmlFor="invite" className="block text-sm font-medium text-text-muted mb-1">
            Invite code
          </label>
          <input
            id="invite"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="6-character code from your league admin"
            className={`${inputClass} font-mono uppercase tracking-widest placeholder:font-sans placeholder:tracking-normal`}
            required
          />
        </div>
      )}

      <div className="flex items-start gap-6">
        <img
          src={avatarUrl}
          alt="avatar preview"
          width={80}
          height={80}
          className="h-20 w-20 shrink-0 rounded-full bg-surface-muted border border-border"
        />
        <div className="flex-1 space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-muted mb-1">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kale"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="seed" className="block text-sm font-medium text-text-muted mb-1">
              Avatar seed{" "}
              <span className="text-text-muted/70">(optional — defaults to your name)</span>
            </label>
            <input
              id="seed"
              type="text"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              placeholder="type anything for a different avatar"
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            Remember me on this device
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-2">
          Pick 2 teams{" "}
          <span className="text-text-muted/70">({selected.length}/2 selected)</span>
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams…"
          className={`mb-3 ${inputClass}`}
        />

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selected.map((code) => {
              const team = teams.find((t) => t.code === code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleTeam(code)}
                  className="flex items-center gap-2 rounded-full border border-accent-border bg-accent-muted px-3 py-1.5 text-sm text-accent hover:bg-danger-muted hover:border-danger-border hover:text-danger transition"
                >
                  <TeamFlag code={code} teamName={team?.name || code} size={16} />
                  {team?.name || code}
                  <span className="text-xs">✕</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface-muted p-2">
          {filtered.length === 0 && (
            <p className="col-span-2 py-6 text-center text-text-muted">
              {teams.length === 0 ? "Loading teams…" : "No teams match your search"}
            </p>
          )}
          {filtered.map((t) => {
            const isSelected = selected.includes(t.code);
            const disabled = !isSelected && selected.length >= 2;
            return (
              <button
                key={t.code}
                type="button"
                disabled={disabled}
                onClick={() => toggleTeam(t.code)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-accent-muted border border-accent-border text-accent"
                    : disabled
                      ? "opacity-40 cursor-not-allowed text-text-muted"
                      : "hover:bg-surface text-text border border-transparent"
                }`}
              >
                <TeamFlag code={t.code} teamName={t.name} size={20} />
                <span className="truncate">{t.name}</span>
                <span className="ml-auto text-xs text-text-muted">{t.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-danger-muted border border-danger-border px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!name.trim() || selected.length !== 2 || submitting}
        className={`w-full ${btnPrimary} disabled:cursor-not-allowed`}
      >
        {submitting ? "Joining…" : "Join the Leaderboard"}
      </button>
    </form>
  );
}
