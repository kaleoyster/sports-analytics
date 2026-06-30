"use client";

import type { MatchResult, MemberOut } from "@/lib/api";
import {
  CARD_HEIGHT,
  COLUMN_WIDTH,
  CONNECTOR_WIDTH,
  FINAL_COLUMN_WIDTH,
  STAGE_LABELS,
  bracketTotalHeight,
  fillRound,
  inferBaseSlots,
  matchTop,
  matchesByStage,
  memberStakes,
  slotsForRound,
} from "@/lib/bracket";
import BracketMatchCard from "./BracketMatchCard";
import BracketConnector from "./BracketConnector";

interface KnockoutBracketProps {
  matches: MatchResult[];
  members: MemberOut[];
}

const KNOCKOUT_STAGES = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
] as const;

function RoundColumn({
  label,
  roundIndex,
  roundMatches,
  members,
  baseSlots,
  highlight = false,
}: {
  label: string;
  roundIndex: number;
  roundMatches: (MatchResult | null)[];
  members: MemberOut[];
  baseSlots: number;
  highlight?: boolean;
}) {
  const height = bracketTotalHeight(baseSlots);

  return (
    <div className="shrink-0" style={{ width: COLUMN_WIDTH }}>
      <h3
        className={`mb-2 text-center text-[10px] font-semibold uppercase tracking-wider ${
          highlight ? "text-warning" : "text-text-muted"
        }`}
      >
        {label}
      </h3>
      <div className="relative" style={{ height, width: "100%" }}>
        {roundMatches.map((match, i) => (
          <div
            key={match?.match_id ?? `tbd-${label}-${i}`}
            className="absolute left-0 right-0 px-0.5"
            style={{ top: matchTop(roundIndex, i, baseSlots), height: CARD_HEIGHT }}
          >
            <BracketMatchCard
              match={match}
              stakes={match ? memberStakes(match, members) : []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KnockoutBracket({ matches, members }: KnockoutBracketProps) {
  const r32 = matchesByStage(matches, "LAST_32");
  const r16 = matchesByStage(matches, "LAST_16");
  const qf = matchesByStage(matches, "QUARTER_FINALS");
  const sf = matchesByStage(matches, "SEMI_FINALS");
  const finalMatch = matchesByStage(matches, "FINAL")[0] ?? null;
  const thirdPlace = matchesByStage(matches, "THIRD_PLACE")[0] ?? null;

  const baseSlots = inferBaseSlots(r32, [], r16, []);
  const height = bracketTotalHeight(baseSlots);
  const finalRoundIndex = KNOCKOUT_STAGES.length;
  const finalTop = matchTop(finalRoundIndex, 0, baseSlots);

  const hasKnockout =
    r32.length > 0 || r16.length > 0 || qf.length > 0 || sf.length > 0 || finalMatch;

  if (!hasKnockout) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-text-muted">
        Knockout matches are not available yet.
      </div>
    );
  }

  const stageMatches: Record<string, MatchResult[]> = {
    LAST_32: r32,
    LAST_16: r16,
    QUARTER_FINALS: qf,
    SEMI_FINALS: sf,
  };

  const visibleStages = KNOCKOUT_STAGES.filter(
    (stage, index) =>
      stageMatches[stage].length > 0 ||
      KNOCKOUT_STAGES.slice(index + 1).some((s) => stageMatches[s].length > 0) ||
      finalMatch
  );

  return (
    <div className="overflow-x-auto scroll-px-6 px-2 pb-6 pt-2">
      <div className="flex min-w-max items-start justify-start gap-0">
        {visibleStages.map((stage, idx) => {
          const roundIndex = KNOCKOUT_STAGES.indexOf(stage);
          const slotCount = Math.max(
            slotsForRound(baseSlots, roundIndex),
            stageMatches[stage].length
          );
          const filled = fillRound(stageMatches[stage], slotCount);
          const nextStage = visibleStages[idx + 1];
          const nextRoundIndex = nextStage
            ? KNOCKOUT_STAGES.indexOf(nextStage)
            : finalMatch
              ? finalRoundIndex
              : null;

          return (
            <div key={stage} className="flex items-start">
              <RoundColumn
                label={STAGE_LABELS[stage]}
                roundIndex={roundIndex}
                roundMatches={filled}
                members={members}
                baseSlots={baseSlots}
              />
              {nextRoundIndex !== null && (
                <BracketConnector
                  fromRound={roundIndex}
                  toRound={nextRoundIndex}
                  baseSlots={baseSlots}
                  direction="left-to-right"
                  width={CONNECTOR_WIDTH}
                />
              )}
            </div>
          );
        })}

        {finalMatch && (
          <div className="shrink-0" style={{ width: FINAL_COLUMN_WIDTH }}>
            <h3 className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-warning">
              {STAGE_LABELS.FINAL}
            </h3>
            <div className="relative" style={{ height }}>
              <div
                className="absolute left-0 right-0 px-0.5"
                style={{ top: finalTop, height: CARD_HEIGHT }}
              >
                <BracketMatchCard
                  match={finalMatch}
                  stakes={memberStakes(finalMatch, members)}
                />
              </div>
            </div>
            {thirdPlace && (
              <div className="mt-3 px-0.5">
                <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  {STAGE_LABELS.THIRD_PLACE}
                </p>
                <BracketMatchCard
                  match={thirdPlace}
                  stakes={memberStakes(thirdPlace, members)}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
