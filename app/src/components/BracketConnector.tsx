"use client";

import {
  CONNECTOR_WIDTH,
  bracketTotalHeight,
  matchCenterY,
} from "@/lib/bracket";

interface BracketConnectorProps {
  fromRound: number;
  toRound: number;
  baseSlots: number;
  direction: "left-to-right" | "right-to-left";
  width?: number;
}

export default function BracketConnector({
  fromRound,
  toRound,
  baseSlots,
  direction,
  width = CONNECTOR_WIDTH,
}: BracketConnectorProps) {
  const fromCount = Math.max(1, baseSlots / 2 ** fromRound);
  const toCount = Math.max(1, baseSlots / 2 ** toRound);
  const ratio = fromCount / toCount;
  const height = bracketTotalHeight(baseSlots);
  const midX = width / 2;
  const paths: string[] = [];

  for (let j = 0; j < toCount; j++) {
    const targetY = matchCenterY(toRound, j, baseSlots);
    const yCoords: number[] = [];

    for (let k = 0; k < ratio; k++) {
      yCoords.push(matchCenterY(fromRound, j * ratio + k, baseSlots));
    }

    const yMin = Math.min(...yCoords);
    const yMax = Math.max(...yCoords);

    if (direction === "left-to-right") {
      for (const y of yCoords) paths.push(`M 0 ${y} H ${midX}`);
      if (yCoords.length > 1) paths.push(`M ${midX} ${yMin} V ${yMax}`);
      paths.push(`M ${midX} ${targetY} H ${width}`);
    } else {
      for (const y of yCoords) paths.push(`M ${width} ${y} H ${midX}`);
      if (yCoords.length > 1) paths.push(`M ${midX} ${yMin} V ${yMax}`);
      paths.push(`M ${midX} ${targetY} H 0`);
    }
  }

  return (
    <svg
      width={width}
      height={height}
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

/** Short horizontal line from semi-final to the final */
export function FinalConnector({
  direction,
  baseSlots,
  width = CONNECTOR_WIDTH,
}: {
  direction: "left-to-right" | "right-to-left";
  baseSlots: number;
  width?: number;
}) {
  const height = bracketTotalHeight(baseSlots);
  const sfRound = 3;
  const y = matchCenterY(sfRound, 0, baseSlots);

  const d =
    direction === "left-to-right"
      ? `M 0 ${y} H ${width}`
      : `M ${width} ${y} H 0`;

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border" />
    </svg>
  );
}
