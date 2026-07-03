"use client";

import { useEffect, useState } from "react";
import { getModelAccuracy, type ModelAccuracy, type MatchPredictionRecord } from "@/lib/api";
import TeamFlag from "./TeamFlag";
import { Card } from "./ui";

function AccuracyRing({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);

  return (
    <svg width={48} height={48} className="shrink-0">
      <circle cx={24} cy={24} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-surface-muted" />
      <circle
        cx={24}
        cy={24}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        className="text-accent"
      />
      <text x={24} y={26} textAnchor="middle" className="fill-text text-[10px] font-bold">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function PredictionRow({ record }: { record: MatchPredictionRecord }) {
  const predictedTeam =
    record.predicted_winner === "HOME"
      ? record.home_code
      : record.predicted_winner === "AWAY"
        ? record.away_code
        : "Draw";
  const actualTeam =
    record.actual_winner === "HOME"
      ? record.home_code
      : record.actual_winner === "AWAY"
        ? record.away_code
        : "Draw";
  const splitLabel =
    record.draw_pct > 0
      ? `${Math.round(record.home_win_pct)}-${Math.round(record.draw_pct)}-${Math.round(record.away_win_pct)}`
      : `${Math.round(record.home_win_pct)}-${Math.round(record.away_win_pct)}`;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className={`shrink-0 text-[10px] font-bold ${record.correct ? "text-success" : "text-danger"}`}>
        {record.correct ? "✓" : "✗"}
      </span>
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <TeamFlag code={record.home_code} teamName={record.home_team} size={14} />
        <span className="text-[11px] font-medium">{record.home_score}</span>
        <span className="text-[9px] text-text-muted">–</span>
        <span className="text-[11px] font-medium">{record.away_score}</span>
        <TeamFlag code={record.away_code} teamName={record.away_team} size={14} />
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[9px] text-text-muted">
          <span className="font-semibold tabular-nums text-text">{splitLabel}</span>
          {" · "}
          <span className="font-semibold text-text">{predictedTeam}</span>
        </p>
        {!record.correct && (
          <p className="text-[8px] text-danger">
            Actual: {actualTeam}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ModelAccuracyPanel() {
  const [data, setData] = useState<ModelAccuracy | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getModelAccuracy().then(setData).catch(() => {});
  }, []);

  if (!data || data.total === 0) return null;

  const recentRecords = [...data.records].reverse();
  const displayed = showAll ? recentRecords : recentRecords.slice(0, 8);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <AccuracyRing pct={data.accuracy_pct} />
        <div>
          <h3 className="text-sm font-semibold">Model accuracy</h3>
          <p className="text-xs text-text-muted">
            {data.correct}/{data.total} correct · {data.incorrect} missed
          </p>
        </div>
      </div>

      <Card className="p-2">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Recent picks
          </p>
          {recentRecords.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] font-medium text-accent hover:underline"
            >
              {showAll ? "Show less" : `Show all (${recentRecords.length})`}
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {displayed.map((r) => (
            <PredictionRow key={r.match_id} record={r} />
          ))}
        </div>
      </Card>
    </section>
  );
}
