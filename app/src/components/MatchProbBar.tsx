"use client";

import type { MatchProbabilities } from "@/lib/api";

interface MatchProbBarProps {
  probabilities: MatchProbabilities;
  homeCode: string;
  awayCode: string;
  /** Omit team codes when the parent already shows them */
  hideLabels?: boolean;
  /** Bar grows to fill available width (bracket cards, live ticker) */
  stretch?: boolean;
  className?: string;
}

export default function MatchProbBar({
  probabilities,
  homeCode,
  awayCode,
  hideLabels = false,
  stretch = false,
  className = "",
}: MatchProbBarProps) {
  const { home_win_pct, draw_pct, away_win_pct, penalties_pct } = probabilities;
  const hasDraw = draw_pct > 0;

  const shortLabel = hasDraw
    ? `${Math.round(home_win_pct)}-${Math.round(draw_pct)}-${Math.round(away_win_pct)}`
    : `${Math.round(home_win_pct)}-${Math.round(away_win_pct)}`;

  const fullLabel = hasDraw
    ? `${homeCode} ${home_win_pct}% · ${draw_pct}% draw · ${awayCode} ${away_win_pct}%`
    : penalties_pct > 0
      ? `${homeCode} ${home_win_pct}% · ${awayCode} ${away_win_pct}% (${penalties_pct}% pens)`
      : `${homeCode} ${home_win_pct}% · ${awayCode} ${away_win_pct}%`;

  const label = hideLabels ? shortLabel : fullLabel;

  if (stretch) {
    return (
      <div className={`w-full ${className}`} title={fullLabel}>
        <div className="flex items-center gap-2">
          <div className="flex h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div className="bg-accent" style={{ width: `${home_win_pct}%` }} />
            {hasDraw && (
              <div className="bg-text-muted/35" style={{ width: `${draw_pct}%` }} />
            )}
            <div className="bg-accent/25" style={{ width: `${away_win_pct}%` }} />
          </div>
          <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums leading-none text-text-muted">
            {shortLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-1 ${className}`}
      title={fullLabel}
    >
      <div className="flex h-0.5 w-8 overflow-hidden rounded-full bg-surface-muted sm:w-10">
        <div className="bg-accent/80" style={{ width: `${home_win_pct}%` }} />
        {hasDraw && (
          <div className="bg-text-muted/40" style={{ width: `${draw_pct}%` }} />
        )}
        <div className="bg-accent/30" style={{ width: `${away_win_pct}%` }} />
      </div>
      <span className="shrink-0 whitespace-nowrap text-[8px] tabular-nums leading-none text-text-muted">
        {label}
      </span>
    </div>
  );
}
