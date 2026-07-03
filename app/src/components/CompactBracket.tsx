"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchProbabilitiesMap, MatchResult, MemberOut } from "@/lib/api";
import {
  BRACKET_STAGES,
  CARD_HEIGHT,
  bracketTotalHeight,
  inferBaseSlots,
  matchCenterY,
  matchTop,
  matchesByStage,
  memberStakes,
  UNIT_HEIGHT,
} from "@/lib/bracket";
import { fillInferredWinners } from "@/lib/bracket-order";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import BracketMatchCard from "./BracketMatchCard";

const STAGE_LABEL: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  FINAL: "Final",
};

const STAGE_ABBR: Record<string, string> = {
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "Final",
};

const COL_WIDTH = 180;
const CONNECTOR_W = 24;

interface CompactBracketProps {
  matches: MatchResult[];
  members: MemberOut[];
  probabilities?: MatchProbabilitiesMap;
}

function fill(matches: MatchResult[], slots: number): (MatchResult | null)[] {
  const out: (MatchResult | null)[] = [...matches];
  while (out.length < slots) out.push(null);
  return out.slice(0, slots);
}

/** Draw bracket connector lines between two adjacent rounds */
function Connector({
  leftRoundIndex,
  rightRoundIndex,
  leftSlots,
}: {
  leftRoundIndex: number;
  rightRoundIndex: number;
  leftSlots: number;
}) {
  const leftCount = leftSlots;
  const rightCount = Math.max(1, Math.ceil(leftCount / 2));
  const ratio = Math.max(1, Math.floor(leftCount / rightCount));
  const totalHeight = leftCount * UNIT_HEIGHT;
  const midX = CONNECTOR_W / 2;
  const paths: string[] = [];

  for (let j = 0; j < rightCount; j++) {
    const targetY = matchCenterY(rightRoundIndex, j, leftSlots);
    const yCoords: number[] = [];

    for (let k = 0; k < ratio; k++) {
      const srcIdx = j * ratio + k;
      yCoords.push(matchCenterY(leftRoundIndex, srcIdx, leftSlots));
    }

    const yMin = Math.min(...yCoords);
    const yMax = Math.max(...yCoords);

    for (const y of yCoords) paths.push(`M 0 ${y} H ${midX}`);
    if (yCoords.length > 1) paths.push(`M ${midX} ${yMin} V ${yMax}`);
    paths.push(`M ${midX} ${targetY} H ${CONNECTOR_W}`);
  }

  return (
    <svg
      width={CONNECTOR_W}
      height={totalHeight}
      className="shrink-0"
      aria-hidden
      style={{ display: "block" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-border"
        />
      ))}
    </svg>
  );
}

/** A single round rendered as absolutely-positioned cards in a column */
function RoundColumn({
  stage,
  roundIndex,
  roundMatches,
  members,
  probabilities,
  leftSlots,
  height,
  highlight,
}: {
  stage: string;
  roundIndex: number;
  roundMatches: (MatchResult | null)[];
  members: MemberOut[];
  probabilities?: MatchProbabilitiesMap;
  leftSlots: number;
  height: number;
  highlight?: boolean;
}) {
  return (
    <div className="shrink-0" style={{ width: COL_WIDTH }}>
      <h3
        className={`mb-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
          highlight ? "text-warning" : "text-text-muted"
        }`}
      >
        {STAGE_LABEL[stage]}
      </h3>
      <div className="relative" style={{ height }}>
        {roundMatches.map((match, i) => (
          <div
            key={match?.match_id ?? `tbd-${stage}-${i}`}
            className="absolute left-0 right-0 px-0.5"
            style={{
              top: matchTop(roundIndex, i, leftSlots),
              height: CARD_HEIGHT,
            }}
          >
            <BracketMatchCard
              match={match}
              stakes={match ? memberStakes(match, members) : []}
              probabilities={match ? probabilities?.get(match.match_id) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mobile: single round as a simple stacked list */
function MobileRoundList({
  stage,
  roundMatches,
  members,
  probabilities,
  highlight,
}: {
  stage: string;
  roundMatches: MatchResult[];
  members: MemberOut[];
  probabilities?: MatchProbabilitiesMap;
  highlight?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <h3
        className={`mb-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
          highlight ? "text-warning" : "text-text-muted"
        }`}
      >
        {STAGE_LABEL[stage]}
      </h3>
      <div className="space-y-1">
        {roundMatches.map((match, i) => (
          <BracketMatchCard
            key={`${match.match_id}-${i}`}
            match={match}
            stakes={memberStakes(match, members)}
            probabilities={probabilities?.get(match.match_id)}
            compact
          />
        ))}
      </div>
    </div>
  );
}

export default function CompactBracket({
  matches,
  members,
  probabilities,
}: CompactBracketProps) {
  const isWide = useMediaQuery("(min-width: 768px)");
  const visibleCount = isWide ? 2 : 1;

  const enrichedMatches = useMemo(
    () => fillInferredWinners(matches),
    [matches]
  );

  const rounds = useMemo(() => {
    const byStage = BRACKET_STAGES.map((stage, idx) => ({
      stage,
      globalRoundIndex: idx,
      matches: matchesByStage(enrichedMatches, stage),
    }));
    const firstPresent = byStage.findIndex((r) => r.matches.length > 0);
    if (firstPresent === -1) return [];
    let lastPresent = firstPresent;
    byStage.forEach((r, i) => {
      if (r.matches.length > 0) lastPresent = i;
    });
    return byStage.slice(firstPresent, lastPresent + 1);
  }, [enrichedMatches]);

  const thirdPlace = matchesByStage(enrichedMatches, "THIRD_PLACE")[0] ?? null;

  const maxStart = Math.max(0, rounds.length - visibleCount);
  const [start, setStart] = useState(0);
  const clampedStart = Math.min(start, maxStart);

  useEffect(() => {
    setStart((s) => Math.min(s, maxStart));
  }, [maxStart]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
        Knockout matches are not available yet.
      </div>
    );
  }

  const visible = rounds.slice(clampedStart, clampedStart + visibleCount);

  const showFinalExtras =
    visible.some((r) => r.stage === "FINAL") && thirdPlace;

  const left = visible[0];
  const right = visible.length === 2 ? visible[1] : null;

  const leftMatchCount = Math.max(left.matches.length, 1);
  const rightMatchCount = right ? Math.max(right.matches.length, 1) : 0;
  const leftSlots = right
    ? Math.max(leftMatchCount, rightMatchCount * 2)
    : leftMatchCount;
  const rightSlots = right
    ? Math.max(Math.ceil(leftSlots / 2), rightMatchCount)
    : 0;
  const treeHeight = leftSlots * UNIT_HEIGHT;

  const leftFilled = fill(left.matches, leftSlots);
  const rightFilled = right ? fill(right.matches, rightSlots) : [];

  return (
    <div className="min-w-0">
      {/* Nav buttons */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStart((s) => Math.max(0, s - 1))}
          disabled={clampedStart === 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-lg text-text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Earlier round"
        >
          ‹
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5">
          {rounds.map((r, i) => {
            const isVisible =
              i >= clampedStart && i < clampedStart + visibleCount;
            return (
              <button
                key={r.stage}
                type="button"
                onClick={() =>
                  setStart(isWide ? Math.min(i, maxStart) : i)
                }
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  isVisible
                    ? "bg-accent-muted text-accent"
                    : "text-text-muted hover:bg-surface-muted"
                }`}
                title={STAGE_LABEL[r.stage]}
              >
                {STAGE_ABBR[r.stage]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setStart((s) => Math.min(maxStart, s + 1))}
          disabled={clampedStart >= maxStart}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-lg text-text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Later round"
        >
          ›
        </button>
      </div>

      {/* Bracket body */}
      {isWide && right ? (
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "80vh" }}>
          <div className="flex items-start justify-center">
            <RoundColumn
              stage={left.stage}
              roundIndex={0}
              roundMatches={leftFilled}
              members={members}
              probabilities={probabilities}
              leftSlots={leftSlots}
              height={treeHeight}
              highlight={left.stage === "FINAL"}
            />

            <Connector
              leftRoundIndex={0}
              rightRoundIndex={1}
              leftSlots={leftSlots}
            />

            <RoundColumn
              stage={right.stage}
              roundIndex={1}
              roundMatches={rightFilled}
              members={members}
              probabilities={probabilities}
              leftSlots={leftSlots}
              height={treeHeight}
              highlight={right.stage === "FINAL"}
            />
          </div>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto overscroll-contain pb-1 md:max-h-[70vh]">
          <MobileRoundList
            stage={left.stage}
            roundMatches={left.matches}
            members={members}
            probabilities={probabilities}
            highlight={left.stage === "FINAL"}
          />
        </div>
      )}

      {showFinalExtras && (
        <div className="mx-auto mt-4 max-w-sm">
          <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Third place
          </p>
          <BracketMatchCard
            match={thirdPlace}
            stakes={memberStakes(thirdPlace!, members)}
            probabilities={probabilities?.get(thirdPlace!.match_id)}
          />
        </div>
      )}
    </div>
  );
}
