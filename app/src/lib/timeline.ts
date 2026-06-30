import type { MatchResult, MemberOut } from "@/lib/api";
import { STAGE_LABELS, matchWinnerSide } from "@/lib/tracker";

const STAGE_BONUS: Record<string, number> = {
  LAST_16: 5,
  LAST_32: 5,
  QUARTER_FINALS: 3,
  SEMI_FINALS: 5,
  THIRD_PLACE: 2,
  FINAL: 8,
};

export interface TimelineEvent {
  timestamp: string;
  matchId: number;
  memberName: string;
  avatarSeed: string;
  teamCode: string;
  teamName: string;
  opponent: string;
  score: string;
  stage: string;
  type: "win" | "draw" | "loss" | "stage_bonus";
  points: number;
  description: string;
}

export function buildTimeline(
  matches: MatchResult[],
  members: MemberOut[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const seenStageBonus = new Set<string>();

  const finishedMatches = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime());

  for (const match of finishedMatches) {
    for (const member of members) {
      for (const pick of member.teams) {
        const isHome = pick.team_code === match.home_code;
        const isAway = pick.team_code === match.away_code;
        if (!isHome && !isAway) continue;

        const opponent = isHome ? match.away_team : match.home_team;
        const hs = match.home_score ?? 0;
        const as = match.away_score ?? 0;
        const score = `${hs}-${as}`;
        const stage = STAGE_LABELS[match.stage] || match.stage;

        const won =
          (match.winner === "HOME_TEAM" && isHome) ||
          (match.winner === "AWAY_TEAM" && isAway);
        const drew = match.winner === "DRAW";

        if (won) {
          events.push({
            timestamp: match.utc_date,
            matchId: match.match_id,
            memberName: member.name,
            avatarSeed: member.avatar_seed,
            teamCode: pick.team_code,
            teamName: pick.team_name,
            opponent,
            score,
            stage,
            type: "win",
            points: 3,
            description: `${pick.team_name} beat ${opponent} ${score}`,
          });
        } else if (drew) {
          events.push({
            timestamp: match.utc_date,
            matchId: match.match_id,
            memberName: member.name,
            avatarSeed: member.avatar_seed,
            teamCode: pick.team_code,
            teamName: pick.team_name,
            opponent,
            score,
            stage,
            type: "draw",
            points: 1,
            description: `${pick.team_name} drew with ${opponent} ${score}`,
          });
        } else {
          events.push({
            timestamp: match.utc_date,
            matchId: match.match_id,
            memberName: member.name,
            avatarSeed: member.avatar_seed,
            teamCode: pick.team_code,
            teamName: pick.team_name,
            opponent,
            score,
            stage,
            type: "loss",
            points: 0,
            description: `${pick.team_name} lost to ${opponent} ${score}`,
          });
        }

        const bonusKey = `${member.name}-${pick.team_code}-${match.stage}`;
        const bonus = STAGE_BONUS[match.stage];
        if (bonus && !seenStageBonus.has(bonusKey)) {
          seenStageBonus.add(bonusKey);
          events.push({
            timestamp: match.utc_date,
            matchId: match.match_id,
            memberName: member.name,
            avatarSeed: member.avatar_seed,
            teamCode: pick.team_code,
            teamName: pick.team_name,
            opponent: "",
            score: "",
            stage,
            type: "stage_bonus",
            points: bonus,
            description: `${pick.team_name} reached the ${stage}`,
          });
        }
      }
    }
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events;
}

export interface CompactTimelineEvent {
  timestamp: string;
  matchId: number;
  teamCode: string;
  teamName: string;
  opponent: string;
  score: string;
  stage: string;
  type: "win" | "draw" | "loss" | "stage_bonus";
  points: number;
  description: string;
  members: { name: string; avatarSeed: string }[];
}

/**
 * Team-centric timeline for the all-members tournament view. Each match result
 * and milestone appears once per team (not once per member who picked it), with
 * the affected members attached. The "reached the Round of 32" milestone is
 * omitted because qualifying is implied once a team plays a knockout match.
 */
export function buildCompactTimeline(
  matches: MatchResult[],
  members: MemberOut[]
): CompactTimelineEvent[] {
  const events: CompactTimelineEvent[] = [];
  const seenStage = new Set<string>();

  const finishedMatches = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime());

  for (const match of finishedMatches) {
    const sides: { code: string; teamName: string; opponent: string; isHome: boolean }[] = [
      {
        code: match.home_code,
        teamName: match.home_team,
        opponent: match.away_team,
        isHome: true,
      },
      {
        code: match.away_code,
        teamName: match.away_team,
        opponent: match.home_team,
        isHome: false,
      },
    ];

    for (const side of sides) {
      const holders = members.filter((m) =>
        m.teams.some((t) => t.team_code === side.code)
      );
      if (holders.length === 0) continue;

      const memberRefs = holders.map((h) => ({
        name: h.name,
        avatarSeed: h.avatar_seed,
      }));

      const hs = match.home_score ?? 0;
      const as = match.away_score ?? 0;
      const score = `${hs}-${as}`;
      const stage = STAGE_LABELS[match.stage] || match.stage;
      const winnerSide = matchWinnerSide(match);
      const won =
        (winnerSide === "HOME" && side.isHome) ||
        (winnerSide === "AWAY" && !side.isHome);

      let type: CompactTimelineEvent["type"];
      let points: number;
      let description: string;
      if (winnerSide === null) {
        type = "draw";
        points = 1;
        description = `${side.teamName} drew with ${side.opponent} ${score}`;
      } else if (won) {
        type = "win";
        points = 3;
        description = `${side.teamName} beat ${side.opponent} ${score}`;
      } else {
        type = "loss";
        points = 0;
        description = `${side.teamName} lost to ${side.opponent} ${score}`;
      }

      events.push({
        timestamp: match.utc_date,
        matchId: match.match_id,
        teamCode: side.code,
        teamName: side.teamName,
        opponent: side.opponent,
        score,
        stage,
        type,
        points,
        description,
        members: memberRefs,
      });

      const bonus = STAGE_BONUS[match.stage];
      const stageKey = `${side.code}-${match.stage}`;
      if (bonus && match.stage !== "LAST_32" && !seenStage.has(stageKey)) {
        seenStage.add(stageKey);
        events.push({
          timestamp: match.utc_date,
          matchId: match.match_id,
          teamCode: side.code,
          teamName: side.teamName,
          opponent: "",
          score: "",
          stage,
          type: "stage_bonus",
          points: bonus,
          description: `${side.teamName} reached the ${stage}`,
          members: memberRefs,
        });
      }
    }
  }

  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return events;
}
