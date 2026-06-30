"use client";

import { useState } from "react";
import { getFlagUrl } from "@/lib/flags";

interface TeamFlagProps {
  code: string;
  teamName?: string;
  size?: number;
  className?: string;
}

export default function TeamFlag({
  code,
  teamName,
  size = 32,
  className = "",
}: TeamFlagProps) {
  const [failed, setFailed] = useState(false);
  const url = getFlagUrl(code, teamName);
  const label = teamName || code || "?";

  if (!url || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-sm bg-gray-700 text-[9px] font-bold uppercase text-gray-300 ${className}`}
        style={{ width: size, height: Math.round(size * 0.67) }}
        title={label}
      >
        {(code || label).slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={label}
      width={size}
      height={Math.round(size * 0.67)}
      className={`inline-block shrink-0 rounded-sm object-cover shadow-sm ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
