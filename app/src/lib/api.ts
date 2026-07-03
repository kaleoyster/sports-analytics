function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:8000";
}

export const API_URL = resolveApiUrl();

export type LeaderboardSort = "points" | "goals_for" | "goals_against";

export interface ScoreLineItem {
  label: string;
  points: number;
  category: "match" | "stage" | "loss";
}

export interface TeamScore {
  team_code: string;
  team_name: string;
  match_wins: number;
  match_draws: number;
  match_losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  match_points: number;
  stage_bonus: number;
  total_points: number;
  furthest_stage: string;
  breakdown: ScoreLineItem[];
}

export interface LeaderboardEntry {
  rank: number;
  member_id: number;
  member_name: string;
  avatar_seed: string;
  total_points: number;
  total_goal_difference: number;
  teams: TeamScore[];
}

export interface MatchResult {
  match_id: number;
  utc_date: string;
  status: string;
  stage: string;
  group: string | null;
  home_team: string;
  home_code: string;
  away_team: string;
  away_code: string;
  home_score: number | null;
  away_score: number | null;
  winner: string | null;
}

export interface Team {
  id: number;
  name: string;
  code: string;
}

export interface MemberOut {
  id: number;
  name: string;
  avatar_seed: string;
  created_at: string;
  teams: { team_code: string; team_name: string }[];
}

export interface League {
  id: number;
  name: string;
  slug: string;
  picks_locked: boolean;
  created_at: string;
}

export interface LeagueAdmin extends League {
  invite_code: string;
}

export interface LeagueCreated extends LeagueAdmin {
  admin_token: string;
}

export interface MemberPrediction {
  member_id: number;
  member_name: string;
  avatar_seed: string;
  win_probability: number;
  current_points: number;
  projected_points_avg: number;
}

export interface PredictionResult {
  simulations: number;
  remaining_matches: number;
  predictions: MemberPrediction[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    if (body.includes("<!DOCTYPE html>") || body.includes("next-error-h1")) {
      throw new Error(
        `API ${res.status}: Request hit the Next.js app instead of the Railway API. ` +
          `On Vercel, set API_PROXY_TARGET to your Railway URL (e.g. https://xxx.up.railway.app) ` +
          `and redeploy with cache cleared. Current API_URL: ${API_URL}`
      );
    }
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function jsonInit(method: string, body: unknown, headers: Record<string, string> = {}): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  };
}

/* ----------------------------- Admin token storage ---------------------------- */

const TOKEN_PREFIX = "wc2026:admin:";

export function getAdminToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_PREFIX + slug);
}

export function setAdminToken(slug: string, token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_PREFIX + slug, token);
}

export function clearAdminToken(slug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_PREFIX + slug);
}

export function isAdmin(slug: string): boolean {
  return !!getAdminToken(slug);
}

function adminHeaders(slug: string): Record<string, string> {
  const token = getAdminToken(slug);
  return token ? { "X-Admin-Token": token } : {};
}

/* --------------------------------- Global data -------------------------------- */

export const getMatches = (status?: string) =>
  apiFetch<MatchResult[]>(`/matches${status ? `?status=${status}` : ""}`);
export const getTeams = () => apiFetch<Team[]>("/teams");

/* --------------------------------- Leagues ------------------------------------ */

export const createLeague = (name: string) =>
  apiFetch<LeagueCreated>("/leagues", jsonInit("POST", { name }));

export const getLeague = (slug: string) =>
  apiFetch<League>(`/leagues/${slug}`);

export const getLeagueAdmin = (slug: string) =>
  apiFetch<LeagueAdmin>(`/leagues/${slug}/admin`, { headers: adminHeaders(slug) });

export const setLeagueLock = (slug: string, locked: boolean) =>
  apiFetch<League>(
    `/leagues/${slug}/lock`,
    jsonInit("POST", { locked }, adminHeaders(slug))
  );

/* --------------------------- League-scoped resources -------------------------- */

export const getLeaderboard = (slug: string) =>
  apiFetch<LeaderboardEntry[]>(`/leagues/${slug}/leaderboard`);

export const getPredictions = (slug: string) =>
  apiFetch<PredictionResult>(`/leagues/${slug}/leaderboard/predictions`);

export const getMembers = (slug: string) =>
  apiFetch<MemberOut[]>(`/leagues/${slug}/members`);

export const createMember = (
  slug: string,
  inviteCode: string,
  name: string,
  avatarSeed: string,
  teamCodes: string[]
) =>
  apiFetch<MemberOut>(
    `/leagues/${slug}/members`,
    jsonInit(
      "POST",
      { name, avatar_seed: avatarSeed, team_codes: teamCodes },
      { "X-Invite-Code": inviteCode, ...adminHeaders(slug) }
    )
  );

export const updateMember = (
  slug: string,
  memberId: number,
  patch: { name?: string; avatar_seed?: string; team_codes?: string[] }
) =>
  apiFetch<MemberOut>(
    `/leagues/${slug}/members/${memberId}`,
    jsonInit("PATCH", patch, adminHeaders(slug))
  );

export const deleteMember = (slug: string, memberId: number) =>
  apiFetch<void>(`/leagues/${slug}/members/${memberId}`, {
    method: "DELETE",
    headers: adminHeaders(slug),
  });
