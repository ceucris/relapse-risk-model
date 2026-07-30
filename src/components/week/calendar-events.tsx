"use client";

import { useEffect, useState } from "react";
import { dayLabel, parseDayKey } from "@/lib/dates";
import { EmptyHint, SectionCard } from "@/components/ui";
import type { CalendarEvent } from "@/lib/types";

export function CalendarEvents({ weekKey }: { weekKey: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    authUrl?: string | null;
    error?: string;
  }>({ configured: false, connected: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = await fetch("/api/auth/google").then((r) => r.json());
      if (cancelled) return;
      setStatus({
        configured: auth.configured,
        connected: auth.connected,
        authUrl: auth.authUrl,
      });
      if (!auth.connected) return;
      const res = await fetch(`/api/calendar/events?weekKey=${weekKey}`);
      const json = await res.json();
      if (!cancelled) {
        setEvents(json.events ?? []);
        if (json.error) setStatus((s) => ({ ...s, error: json.error }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekKey]);

  return (
    <SectionCard
      title="This week’s calendar"
      accent="#785b4e"
      action={
        status.configured && !status.connected && status.authUrl ? (
          <a className="btn btn-soft" href={status.authUrl}>
            Connect Google
          </a>
        ) : null
      }
    >
      {!status.configured && (
        <EmptyHint>
          Add Google Calendar env vars to sync events into this week view.
        </EmptyHint>
      )}
      {status.configured && !status.connected && (
        <EmptyHint>Connect Google Calendar to pull this week’s events.</EmptyHint>
      )}
      {status.error && <p className="error-text">{status.error}</p>}
      <ul className="event-list">
        {events.map((event) => {
          const start = new Date(event.start);
          const day = event.allDay
            ? dayLabel(event.start.slice(0, 10), "short")
            : start.toLocaleString(undefined, {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              });
          return (
            <li key={event.id}>
              <span className="event-when">{day}</span>
              <span>{event.title}</span>
            </li>
          );
        })}
      </ul>
      {status.connected && events.length === 0 && !status.error && (
        <EmptyHint>No events on the calendar this week.</EmptyHint>
      )}
      {/* silence unused helper in edge cases */}
      <span className="sr-only">{parseDayKey(weekKey).toDateString()}</span>
    </SectionCard>
  );
}
