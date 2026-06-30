"use client";

import type { MemberPrediction, PredictionResult } from "@/lib/api";
import { Card } from "./ui";

interface PredictionPanelProps {
  data: PredictionResult;
  compact?: boolean;
}

export default function PredictionPanel({ data, compact = false }: PredictionPanelProps) {
  if (data.predictions.length === 0) return null;

  if (compact) {
    return (
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Win chance
          </p>
          {data.remaining_matches > 0 && (
            <p className="text-[10px] text-text-muted">
              {data.simulations.toLocaleString()} sims · {data.remaining_matches} left
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          {data.predictions.map((p) => (
            <CompactRow key={p.member_id} prediction={p} />
          ))}
        </div>
      </Card>
    );
  }

  const topProb = data.predictions[0]?.win_probability ?? 0;

  return (
    <section className="animate-fade-up">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Win projections</h2>
        <p className="mt-1 text-sm text-text-muted">
          {data.remaining_matches > 0
            ? `Based on ${data.simulations.toLocaleString()} simulations of the ${data.remaining_matches} remaining matches.`
            : "Tournament complete — final standings."}
        </p>
      </div>
      <div className="space-y-3">
        {data.predictions.map((p, i) => (
          <PredictionRow key={p.member_id} prediction={p} isLeader={i === 0 && topProb > 0} />
        ))}
      </div>
    </section>
  );
}

function CompactRow({ prediction }: { prediction: MemberPrediction }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 truncate text-xs font-medium">{prediction.member_name}</span>
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.max(prediction.win_probability, 2)}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-bold text-accent">
        {prediction.win_probability}%
      </span>
    </div>
  );
}

function PredictionRow({
  prediction,
  isLeader,
}: {
  prediction: MemberPrediction;
  isLeader: boolean;
}) {
  const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(prediction.avatar_seed)}`;

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isLeader
          ? "border-accent-border bg-accent-muted/40 shadow-sm"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={avatarUrl}
          alt={prediction.member_name}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full bg-surface-muted"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{prediction.member_name}</p>
            <p className="shrink-0 text-lg font-bold text-accent">
              {prediction.win_probability}%
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.max(prediction.win_probability, 2)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            {prediction.current_points} pts now
            {prediction.projected_points_avg !== prediction.current_points && (
              <> · ~{prediction.projected_points_avg} projected</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
