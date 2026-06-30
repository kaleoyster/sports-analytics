"use client";

import { useState } from "react";
import type { MatchResult, MemberOut } from "@/lib/api";
import {
  buildTimeline,
  buildCompactTimeline,
  type CompactTimelineEvent,
  type TimelineEvent,
} from "@/lib/timeline";
import TeamFlag from "./TeamFlag";
import { Card } from "./ui";

const TYPE_STYLES: Record<string, { dot: string; badge: string; text: string }> = {
  win: {
    dot: "bg-success",
    badge: "bg-success-muted text-success",
    text: "text-success",
  },
  draw: {
    dot: "bg-warning",
    badge: "bg-warning-muted text-warning",
    text: "text-warning",
  },
  loss: {
    dot: "bg-danger",
    badge: "bg-danger-muted text-danger",
    text: "text-danger",
  },
  stage_bonus: {
    dot: "bg-accent",
    badge: "bg-accent-muted text-accent",
    text: "text-accent",
  },
};

interface TimelineFeedProps {
  matches: MatchResult[];
  members: MemberOut[];
  limit?: number;
  showFilter?: boolean;
  compact?: boolean;
}

export default function TimelineFeed({
  matches,
  members,
  limit,
  showFilter = true,
  compact = false,
}: TimelineFeedProps) {
  if (compact) {
    return <CompactTimeline matches={matches} members={members} limit={limit} />;
  }

  return (
    <PerMemberTimeline
      matches={matches}
      members={members}
      limit={limit}
      showFilter={showFilter}
    />
  );
}

function PerMemberTimeline({
  matches,
  members,
  limit,
  showFilter,
}: {
  matches: MatchResult[];
  members: MemberOut[];
  limit?: number;
  showFilter: boolean;
}) {
  const [filterMember, setFilterMember] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const allEvents = buildTimeline(matches, members);
  const filtered =
    filterMember === "all"
      ? allEvents
      : allEvents.filter((e) => e.memberName === filterMember);

  const cap = limit && !expanded ? limit : undefined;
  const events = cap ? filtered.slice(0, cap) : filtered;
  const hasMore = limit ? filtered.length > limit && !expanded : false;

  if (allEvents.length === 0) return null;

  return (
    <section id="timeline">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Timeline</h2>
        {showFilter && members.length > 1 && (
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
          >
            <option value="all">All members</option>
            {members.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <Card className="divide-y divide-border">
        {events.map((event, i) => (
          <TimelineRow key={`${event.matchId}-${event.memberName}-${event.teamCode}-${event.type}-${i}`} event={event} />
        ))}
      </Card>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-medium text-accent hover:underline"
        >
          Show all {filtered.length} events
        </button>
      )}
      {expanded && limit && filtered.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs font-medium text-accent hover:underline"
        >
          Show less
        </button>
      )}
    </section>
  );
}

function CompactTimeline({
  matches,
  members,
  limit,
}: {
  matches: MatchResult[];
  members: MemberOut[];
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const allEvents = buildCompactTimeline(matches, members);
  const cap = limit && !expanded ? limit : undefined;
  const events = cap ? allEvents.slice(0, cap) : allEvents;
  const hasMore = limit ? allEvents.length > limit && !expanded : false;

  if (allEvents.length === 0) return null;

  return (
    <section id="timeline">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <span className="text-xs text-text-muted">All teams · all members</span>
      </div>

      <Card className="divide-y divide-border">
        {events.map((event, i) => (
          <CompactTimelineRow
            key={`${event.matchId}-${event.teamCode}-${event.type}-${i}`}
            event={event}
          />
        ))}
      </Card>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-medium text-accent hover:underline"
        >
          Show all {allEvents.length} events
        </button>
      )}
      {expanded && limit && allEvents.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs font-medium text-accent hover:underline"
        >
          Show less
        </button>
      )}
    </section>
  );
}

function MemberAvatars({ members }: { members: { name: string; avatarSeed: string }[] }) {
  const shown = members.slice(0, 4);
  const extra = members.length - shown.length;
  return (
    <div className="flex shrink-0 items-center -space-x-1.5">
      {shown.map((m, i) => (
        <img
          key={`${m.name}-${m.avatarSeed}-${i}`}
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(m.avatarSeed)}`}
          alt={m.name}
          title={m.name}
          width={18}
          height={18}
          className="h-[18px] w-[18px] rounded-full ring-2 ring-surface"
        />
      ))}
      {extra > 0 && (
        <span className="flex h-[18px] items-center rounded-full bg-surface-muted px-1.5 text-[10px] font-semibold text-text-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </div>
  );
}

function CompactTimelineRow({ event }: { event: CompactTimelineEvent }) {
  const style = TYPE_STYLES[event.type];
  const time = new Date(event.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2 px-2 py-2 text-sm sm:gap-2.5 sm:px-3">
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      <span className="w-10 shrink-0 text-[10px] font-medium text-text-muted sm:w-14 sm:text-xs">
        {time}
      </span>
      <TeamFlag code={event.teamCode} teamName={event.teamName} size={16} />
      <p className={`min-w-0 flex-1 truncate ${style.text}`}>{event.description}</p>
      <MemberAvatars members={event.members} />
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}>
        {event.points > 0 ? `+${event.points}` : "0"}
      </span>
    </div>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const style = TYPE_STYLES[event.type];
  const time = new Date(event.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 text-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      <img
        src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(event.avatarSeed)}`}
        alt={event.memberName}
        width={18}
        height={18}
        className="h-[18px] w-[18px] shrink-0 rounded-full"
      />
      <span className="shrink-0 text-xs font-medium text-text-muted w-14">{time}</span>
      <TeamFlag code={event.teamCode} teamName={event.teamName} size={14} />
      <p className={`min-w-0 flex-1 truncate ${style.text}`}>{event.description}</p>
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}>
        {event.points > 0 ? `+${event.points}` : "0"}
      </span>
    </div>
  );
}
