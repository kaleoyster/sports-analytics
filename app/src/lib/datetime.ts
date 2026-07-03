/** World Cup 2026 host venues — display kickoffs in US Central Time */
export const MATCH_TIMEZONE = "America/Chicago";

function centralDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: MATCH_TIMEZONE });
}

function relativeDayLabel(d: Date, now: Date): string | null {
  const today = centralDateKey(now);
  const matchDay = centralDateKey(d);

  if (matchDay === today) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (matchDay === centralDateKey(yesterday)) return "Yesterday";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (matchDay === centralDateKey(tomorrow)) return "Tomorrow";

  return null;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: MATCH_TIMEZONE,
  });
}

function formatFullDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: MATCH_TIMEZONE,
  });
}

export function formatMatchStatus(status: string, utcDate?: string): string | null {
  if (status === "FINISHED") return "FT";
  if (status === "IN_PLAY" || status === "PAUSED") return "Live";
  if (utcDate) {
    const kickoff = new Date(utcDate).getTime();
    const elapsed = Date.now() - kickoff;
    if (
      elapsed > 0 &&
      elapsed < 2 * 60 * 60 * 1000 &&
      (status === "SCHEDULED" || status === "TIMED")
    ) {
      return "Live";
    }
  }
  if (status === "SCHEDULED" || status === "TIMED") return null;
  return null;
}

export interface MatchScheduleLabel {
  /** Left side of the card header, e.g. "Tue, Jun 30 · 3:00 PM" */
  primary: string;
  /** Right side badge, e.g. "FT" */
  badge: string | null;
}

export function formatMatchSchedule(
  utcDate: string,
  status: string
): MatchScheduleLabel {
  const d = new Date(utcDate);
  const now = new Date();
  const relative = relativeDayLabel(d, now);
  const time = formatTime(d);
  const badge = formatMatchStatus(status, utcDate);
  const isFinished = status === "FINISHED";

  if (relative === "Today") {
    return {
      primary: isFinished ? "Today" : `Today · ${time}`,
      badge,
    };
  }

  if (relative === "Yesterday") {
    return { primary: "Yesterday", badge };
  }

  if (relative === "Tomorrow") {
    return { primary: `Tomorrow · ${time}`, badge };
  }

  if (isFinished) {
    return { primary: formatFullDate(d), badge };
  }

  return { primary: `${formatFullDate(d)} · ${time}`, badge };
}
