"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchResult, MemberOut } from "@/lib/api";
import {
  CARD_HEIGHT,
  bracketTotalHeight,
  matchTop,
  matchesByStage,
  memberStakes,
} from "@/lib/bracket";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import BracketMatchCard from "./BracketMatchCard";
import BracketConnector from "./BracketConnector";

const STAGES = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
] as const;

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

const COLUMN_WIDTH = 216;
const CONNECTOR_WIDTH = 28;

interface CompactBracketProps {
  matches: MatchResult[];
  members: MemberOut[];
}

function fill(matches: MatchResult[], slots: number): (MatchResult | null)[] {
  const out: (MatchResult | null)[] = [...matches];
  while (out.length < slots) out.push(null);
  return out.slice(0, slots);
}

function RoundColumn({
  stage,
  roundIndex,
  roundMatches,
  members,
  baseSlots,
  height,
  highlight,
  wide,
}: {
  stage: string;
  roundIndex: number;
  roundMatches: (MatchResult | null)[];
  members: MemberOut[];
  baseSlots: number;
  height: number;
  highlight?: boolean;
  wide: boolean;
}) {
  return (
    <div
      className={`shrink-0 ${wide ? "" : "mx-auto w-full max-w-sm"}`}
      style={{ width: wide ? COLUMN_WIDTH : undefined }}
    >
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
            className="absolute left-0 right-0 px-1"
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

function MobileRoundList({
  stage,
  roundMatches,
  members,
  highlight,
}: {
  stage: string;
  roundMatches: MatchResult[];
  members: MemberOut[];
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
      <div className="space-y-1.5">
        {roundMatches.map((match, i) => (
          <BracketMatchCard
            key={`${match.match_id}-${i}`}
            match={match}
            stakes={memberStakes(match, members)}
          />
        ))}
      </div>
    </div>
  );
}

export default function CompactBracket({ matches, members }: CompactBracketProps) {
  const isWide = useMediaQuery("(min-width: 1024px)");
  const visibleCount = isWide ? 2 : 1;

  const rounds = useMemo(() => {
    const byStage = STAGES.map((stage) => ({
      stage,
      matches: matchesByStage(matches, stage),
    }));
    const firstPresent = byStage.findIndex((r) => r.matches.length > 0);
    if (firstPresent === -1) return [];
    let lastPresent = firstPresent;
    byStage.forEach((r, i) => {
      if (r.matches.length > 0) lastPresent = i;
    });
    return byStage.slice(firstPresent, lastPresent + 1);
  }, [matches]);

  const thirdPlace = matchesByStage(matches, "THIRD_PLACE")[0] ?? null;

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

  const left = rounds[clampedStart];
  const right = visibleCount === 2 ? (rounds[clampedStart + 1] ?? null) : null;

  const nLeft = left.matches.length;
  const nRight = right?.matches.length ?? 0;
  const leftSlots =
    visibleCount === 2
      ? Math.max(nLeft, nRight * 2, 1)
      : Math.max(nLeft, 1);
  const rightSlots = Math.max(Math.ceil(leftSlots / 2), nRight, 1);
  const height = bracketTotalHeight(leftSlots);

  const showFinalExtras =
    left.stage === "FINAL" || right?.stage === "FINAL";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStart((s) => Math.max(0, s - 1))}
          disabled={clampedStart === 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-lg text-text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Earlier round"
        >
          ‹
        </button>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
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
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-lg text-text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Later round"
        >
          ›
        </button>
      </div>

      <div className={isWide ? "overflow-x-auto pb-2" : "max-h-80 overflow-y-auto pb-1 lg:max-h-none lg:overflow-visible"}>
        <div className="flex items-start justify-center gap-0">
          {isWide ? (
            <>
              <RoundColumn
                stage={left.stage}
                roundIndex={0}
                roundMatches={fill(left.matches, leftSlots)}
                members={members}
                baseSlots={leftSlots}
                height={height}
                highlight={left.stage === "FINAL"}
                wide
              />

              {right && (
                <>
                  <BracketConnector
                    fromRound={0}
                    toRound={1}
                    baseSlots={leftSlots}
                    direction="left-to-right"
                    width={CONNECTOR_WIDTH}
                  />
                  <RoundColumn
                    stage={right.stage}
                    roundIndex={1}
                    roundMatches={fill(right.matches, rightSlots)}
                    members={members}
                    baseSlots={leftSlots}
                    height={height}
                    highlight={right.stage === "FINAL"}
                    wide
                  />
                </>
              )}
            </>
          ) : (
            <MobileRoundList
              stage={left.stage}
              roundMatches={left.matches}
              members={members}
              highlight={left.stage === "FINAL"}
            />
          )}
        </div>
      </div>

      {thirdPlace && showFinalExtras && (
        <div className="mx-auto mt-4 max-w-[220px]">
          <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Third place
          </p>
          <BracketMatchCard
            match={thirdPlace}
            stakes={memberStakes(thirdPlace, members)}
          />
        </div>
      )}
    </div>
  );
}
