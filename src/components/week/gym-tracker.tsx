"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { getWeekDays, dayLabel, toDayKey, uid } from "@/lib/dates";
import { EmptyHint, SectionCard } from "@/components/ui";

const SESSION_TYPES = ["Push", "Pull", "Legs", "Full body", "Cardio", "Yoga", "Other"];

export function GymTracker({ weekKey }: { weekKey: string }) {
  const { data, setData } = useDashboard();
  const days = getWeekDays(weekKey);
  const [type, setType] = useState("Full body");
  const [date, setDate] = useState(toDayKey());

  const sessions = data.gymSessions.filter((s) => days.includes(s.date));

  function addSession(e: React.FormEvent) {
    e.preventDefault();
    setData((prev) => ({
      ...prev,
      gymSessions: [
        {
          id: uid("gym"),
          date,
          type,
          completed: true,
        },
        ...prev.gymSessions,
      ],
    }));
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      gymSessions: prev.gymSessions.filter((s) => s.id !== id),
    }));
  }

  return (
    <SectionCard title="Gym sessions" accent="#7a816c">
      <form className="row-form" onSubmit={addSession}>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Session type">
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Session date"
        />
        <button type="submit" className="btn btn-primary">
          Log
        </button>
      </form>
      <div className="gym-week">
        {days.map((day) => {
          const count = sessions.filter((s) => s.date === day).length;
          return (
            <div key={day} className={`gym-day ${count ? "has-session" : ""}`}>
              <span>{dayLabel(day).slice(0, 2)}</span>
              <strong>{count || "·"}</strong>
            </div>
          );
        })}
      </div>
      <ul className="soft-list">
        {sessions.map((s) => (
          <li key={s.id}>
            <span>
              {dayLabel(s.date)} · {s.type}
            </span>
            <button type="button" className="ghost-x" onClick={() => remove(s.id)} aria-label="Remove">
              ×
            </button>
          </li>
        ))}
      </ul>
      {sessions.length === 0 && <EmptyHint>Log your first session this week.</EmptyHint>}
    </SectionCard>
  );
}
