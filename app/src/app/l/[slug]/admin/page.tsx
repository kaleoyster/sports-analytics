"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  clearAdminToken,
  deleteMember,
  getLeagueAdmin,
  getMembers,
  getTeams,
  isAdmin,
  setAdminToken,
  setLeagueLock,
  updateMember,
  type LeagueAdmin,
  type MemberOut,
  type Team,
} from "@/lib/api";
import InviteQR from "@/components/InviteQR";
import TeamFlag from "@/components/TeamFlag";
import { btnGhost, btnPrimary, btnSecondary, Card, inputClass, Spinner } from "@/components/ui";

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [league, setLeague] = useState<LeagueAdmin | null>(null);
  const [members, setMembers] = useState<MemberOut[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MemberOut | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lg, mem] = await Promise.all([getLeagueAdmin(slug), getMembers(slug)]);
      setLeague(lg);
      setMembers(mem);
      setAuthed(true);
    } catch {
      clearAdminToken(slug);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    getTeams().then(setTeams).catch(() => setTeams([]));
    if (isAdmin(slug)) {
      load();
    } else {
      setLoading(false);
    }
  }, [slug, load]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAdminToken(slug, tokenInput.trim());
    try {
      await getLeagueAdmin(slug);
      await load();
    } catch {
      clearAdminToken(slug);
      setAuthError("That admin token is not valid for this league.");
    }
  }

  async function toggleLock() {
    if (!league) return;
    const updated = await setLeagueLock(slug, !league.picks_locked);
    setLeague({ ...league, picks_locked: updated.picks_locked });
  }

  async function handleDelete(member: MemberOut) {
    if (!confirm(`Remove ${member.name} from the league?`)) return;
    await deleteMember(slug, member.id);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  }

  async function handleSignOut() {
    clearAdminToken(slug);
    setAuthed(false);
    setLeague(null);
  }

  const inviteLink =
    league && typeof window !== "undefined"
      ? `${window.location.origin}/l/${slug}/join?code=${league.invite_code}`
      : "";

  function copyInvite() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-bold">Admin access</h1>
        <p className="mb-6 text-sm text-text-muted">
          Paste the admin token you received when you created this league.
        </p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className={`${inputClass} font-mono placeholder:font-sans`}
            required
          />
          {authError && <p className="text-sm text-danger">{authError}</p>}
          <button type="submit" className={`w-full ${btnPrimary}`}>
            Unlock admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · {league?.name}</h1>
        <button onClick={handleSignOut} className={btnGhost}>
          Sign out of admin
        </button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card className="p-5">
          <p className="text-sm font-medium text-text-muted">Invite link</p>
          <p className="mt-1 mb-3 text-xs text-text-muted">
            Code <span className="font-mono text-text">{league?.invite_code}</span> — share to let family join.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 truncate rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-text-muted"
            />
            <button onClick={copyInvite} className={btnSecondary}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </Card>

        <Card className="flex items-center justify-center p-5">
          <InviteQR url={inviteLink} />
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-medium text-text-muted">Picks</p>
          <p className="mt-1 mb-3 text-xs text-text-muted">
            {league?.picks_locked
              ? "Locked — nobody can join or change teams."
              : "Open — members can join and edit picks."}
          </p>
          <button
            onClick={toggleLock}
            className={
              league?.picks_locked
                ? "rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
                : btnSecondary
            }
          >
            {league?.picks_locked ? "Unlock picks" : "Lock picks"}
          </button>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Members ({members.length})</h2>
        {members.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-text-muted">
            No members yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id} className="flex items-center gap-3 p-3">
                <img
                  src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(m.avatar_seed)}`}
                  alt={m.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full bg-surface-muted"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2">
                    {m.teams.map((t) => (
                      <span key={t.team_code} className="flex items-center gap-1 text-xs text-text-muted">
                        <TeamFlag code={t.team_code} teamName={t.team_name} size={14} />
                        {t.team_name}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setEditing(m)} className={btnSecondary}>
                  Edit teams
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  className="rounded-lg border border-danger-border px-3 py-1.5 text-sm text-danger hover:bg-danger-muted transition"
                >
                  Remove
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <EditTeamsModal
          slug={slug}
          member={editing}
          teams={teams}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditTeamsModal({
  slug,
  member,
  teams,
  onClose,
  onSaved,
}: {
  slug: string;
  member: MemberOut;
  teams: Team[];
  onClose: () => void;
  onSaved: (m: MemberOut) => void;
}) {
  const [selected, setSelected] = useState<string[]>(member.teams.map((t) => t.team_code));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(code: string) {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 2) return prev;
      return [...prev, code];
    });
  }

  async function save() {
    if (selected.length !== 2) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMember(slug, member.id, { team_codes: selected });
      onSaved(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg.includes("423") ? "Picks are locked — unlock first to edit." : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card className="p-5">
        <h3 className="mb-1 text-lg font-bold">Edit {member.name}&apos;s teams</h3>
        <p className="mb-3 text-xs text-text-muted">{selected.length}/2 selected</p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams…"
          className={`mb-3 ${inputClass}`}
        />

        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border bg-surface-muted p-2">
          {filtered.map((t) => {
            const isSel = selected.includes(t.code);
            const disabled = !isSel && selected.length >= 2;
            return (
              <button
                key={t.code}
                type="button"
                disabled={disabled}
                onClick={() => toggle(t.code)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  isSel
                    ? "bg-accent-muted border border-accent-border text-accent"
                    : disabled
                      ? "opacity-40 cursor-not-allowed text-text-muted"
                      : "hover:bg-surface text-text"
                }`}
              >
                <TeamFlag code={t.code} teamName={t.name} size={18} />
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={selected.length !== 2 || saving}
            className={`${btnPrimary} disabled:opacity-40`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        </Card>
      </div>
    </div>
  );
}
