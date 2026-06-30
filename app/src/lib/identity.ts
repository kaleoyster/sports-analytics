const MEMBER_PREFIX = "wc2026:member:";
const RECENT_LEAGUES_KEY = "wc2026:recent-leagues";
const MAX_RECENT = 8;

export interface SavedMember {
  name: string;
  avatar_seed: string;
  joined_at: string;
}

export interface RecentLeague {
  slug: string;
  name: string;
  visited_at: string;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getSavedMember(slug: string): SavedMember | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(MEMBER_PREFIX + slug);
    return raw ? (JSON.parse(raw) as SavedMember) : null;
  } catch {
    return null;
  }
}

export function saveMember(
  slug: string,
  member: { name: string; avatar_seed: string }
): void {
  if (!canUseStorage()) return;
  const payload: SavedMember = {
    name: member.name,
    avatar_seed: member.avatar_seed,
    joined_at: new Date().toISOString(),
  };
  window.localStorage.setItem(MEMBER_PREFIX + slug, JSON.stringify(payload));
}

export function getRecentLeagues(): RecentLeague[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_LEAGUES_KEY);
    return raw ? (JSON.parse(raw) as RecentLeague[]) : [];
  } catch {
    return [];
  }
}

export function rememberLeague(slug: string, name: string): void {
  if (!canUseStorage()) return;
  const existing = getRecentLeagues().filter((l) => l.slug !== slug);
  const updated: RecentLeague[] = [
    { slug, name, visited_at: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_LEAGUES_KEY, JSON.stringify(updated));
}

export function removeRecentLeague(slug: string): void {
  if (!canUseStorage()) return;
  const updated = getRecentLeagues().filter((l) => l.slug !== slug);
  window.localStorage.setItem(RECENT_LEAGUES_KEY, JSON.stringify(updated));
}
