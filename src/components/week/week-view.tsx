"use client";

import { useState } from "react";
import { formatWeekLabel, getWeekKey, shiftWeek } from "@/lib/dates";
import { TaskChecklist } from "@/components/week/task-checklist";
import { GymTracker } from "@/components/week/gym-tracker";
import { WeeklyFocus } from "@/components/week/weekly-focus";
import { Reflections } from "@/components/week/reflections";
import { CurrentlyReadingWidget } from "@/components/week/currently-reading";
import { CalendarEvents } from "@/components/week/calendar-events";

export function WeekView() {
  const [weekKey, setWeekKey] = useState(getWeekKey());

  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <button type="button" className="btn btn-soft" onClick={() => setWeekKey((w) => shiftWeek(w, -1))}>
          ← Prev
        </button>
        <div className="view-title-block">
          <h2>Week</h2>
          <p>{formatWeekLabel(weekKey)}</p>
        </div>
        <div className="toolbar-right">
          <button type="button" className="btn btn-soft" onClick={() => setWeekKey(getWeekKey())}>
            Today
          </button>
          <button type="button" className="btn btn-soft" onClick={() => setWeekKey((w) => shiftWeek(w, 1))}>
            Next →
          </button>
        </div>
      </div>

      <div className="week-grid">
        <TaskChecklist weekKey={weekKey} />
        <WeeklyFocus weekKey={weekKey} />
        <GymTracker weekKey={weekKey} />
        <CalendarEvents weekKey={weekKey} />
        <Reflections weekKey={weekKey} />
        <CurrentlyReadingWidget />
      </div>
    </div>
  );
}
