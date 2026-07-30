"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { dayLabel, getWeekDays, getWeekKey, shiftWeek, uid } from "@/lib/dates";
import type { CustomHabit } from "@/lib/types";
import { EmptyHint, SectionCard } from "@/components/ui";

const COLOR_PRESETS = [
  { color: "#5b7c8e", bg: "#e8f0f4", border: "#a8c0cc" },
  { color: "#7a816c", bg: "#eef1e8", border: "#b5bba8" },
  { color: "#866a5b", bg: "#f3ebe4", border: "#cbb3a4" },
  { color: "#d68d84", bg: "#f8ebe9", border: "#e8bbb5" },
  { color: "#785b4e", bg: "#f1e8e2", border: "#c4a99a" },
  { color: "#8e967d", bg: "#eef2e9", border: "#c2c9b5" },
];

export function HabitsView() {
  const { data, setData } = useDashboard();
  const [weekKey, setWeekKey] = useState(getWeekKey());
  const [managing, setManaging] = useState(false);
  const days = getWeekDays(weekKey);

  const habits = useMemo(
    () => [...data.habits].sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order),
    [data.habits],
  );

  const score = useMemo(() => {
    if (!habits.length) return 0;
    let earned = 0;
    let possible = 0;
    for (const habit of habits) {
      const count = days.filter((d) =>
        data.habitLogs.some((l) => l.habitId === habit.id && l.date === d),
      ).length;
      earned += Math.min(count, habit.goal);
      possible += habit.goal;
    }
    return possible === 0 ? 0 : Math.round((earned / possible) * 100);
  }, [habits, days, data.habitLogs]);

  function toggle(habitId: string, date: string) {
    setData((prev) => {
      const exists = prev.habitLogs.some((l) => l.habitId === habitId && l.date === date);
      return {
        ...prev,
        habitLogs: exists
          ? prev.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date))
          : [...prev.habitLogs, { habitId, date }],
      };
    });
  }

  function saveHabit(habit: CustomHabit, isNew: boolean) {
    setData((prev) => ({
      ...prev,
      habits: isNew
        ? [...prev.habits, habit]
        : prev.habits.map((h) => (h.id === habit.id ? habit : h)),
    }));
  }

  function deleteHabit(id: string) {
    setData((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
      habitLogs: prev.habitLogs.filter((l) => l.habitId !== id),
    }));
  }

  function moveHabit(id: string, direction: -1 | 1) {
    setData((prev) => {
      const sorted = [...prev.habits].sort(
        (a, b) => a.section.localeCompare(b.section) || a.order - b.order,
      );
      const idx = sorted.findIndex((h) => h.id === id);
      const swap = idx + direction;
      if (idx < 0 || swap < 0 || swap >= sorted.length) return prev;
      if (sorted[idx].section !== sorted[swap].section) return prev;
      const a = sorted[idx];
      const b = sorted[swap];
      return {
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id === a.id) return { ...h, order: b.order };
          if (h.id === b.id) return { ...h, order: a.order };
          return h;
        }),
      };
    });
  }

  const sections: Array<"daily" | "devotional"> = ["daily", "devotional"];

  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <button type="button" className="btn btn-soft" onClick={() => setWeekKey((w) => shiftWeek(w, -1))}>
          ← Prev
        </button>
        <div className="view-title-block">
          <h2>Habits</h2>
          <p>{score}% of weekly goals</p>
        </div>
        <div className="toolbar-right">
          <button type="button" className="btn btn-soft" onClick={() => setManaging(true)}>
            Manage habits
          </button>
          <button type="button" className="btn btn-soft" onClick={() => setWeekKey((w) => shiftWeek(w, 1))}>
            Next →
          </button>
        </div>
      </div>

      <div className="habit-score-card">
        <div className="habit-score-ring" style={{ ["--p" as string]: `${score}%` }}>
          <span>{score}%</span>
        </div>
        <div>
          <h3>Weekly completion</h3>
          <p>Goals are per habit (e.g. 5 of 7). Color cards below summarize each one.</p>
        </div>
      </div>

      {sections.map((section) => {
        const sectionHabits = habits.filter((h) => h.section === section);
        if (!sectionHabits.length) return null;
        return (
          <SectionCard
            key={section}
            title={section === "daily" ? "Daily" : "Devotional"}
            accent={section === "daily" ? "#7a816c" : "#d68d84"}
          >
            <div className="habit-grid-wrap">
              <table className="habit-grid">
                <thead>
                  <tr>
                    <th>Habit</th>
                    {days.map((d) => (
                      <th key={d}>{dayLabel(d).slice(0, 2)}</th>
                    ))}
                    <th>Goal</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionHabits.map((habit) => {
                    const count = days.filter((d) =>
                      data.habitLogs.some((l) => l.habitId === habit.id && l.date === d),
                    ).length;
                    return (
                      <tr key={habit.id}>
                        <td>
                          <span className="habit-label">
                            <span>{habit.icon}</span>
                            <span>
                              <strong>{habit.label}</strong>
                              {habit.sublabel && <em>{habit.sublabel}</em>}
                            </span>
                          </span>
                        </td>
                        {days.map((day) => {
                          const on = data.habitLogs.some(
                            (l) => l.habitId === habit.id && l.date === day,
                          );
                          return (
                            <td key={day}>
                              <button
                                type="button"
                                className={`habit-cell ${on ? "is-on" : ""}`}
                                style={{
                                  ["--c" as string]: habit.color,
                                  ["--bg" as string]: habit.bg,
                                  ["--bd" as string]: habit.border,
                                }}
                                aria-pressed={on}
                                onClick={() => toggle(habit.id, day)}
                              />
                            </td>
                          );
                        })}
                        <td className="habit-goal-cell">
                          {count}/{habit.goal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })}

      <div className="habit-summary-grid">
        {habits.map((habit) => {
          const count = days.filter((d) =>
            data.habitLogs.some((l) => l.habitId === habit.id && l.date === d),
          ).length;
          const pct = Math.min(100, Math.round((count / Math.max(habit.goal, 1)) * 100));
          return (
            <article
              key={habit.id}
              className="habit-summary"
              style={{
                background: habit.bg,
                borderColor: habit.border,
                color: habit.color,
              }}
            >
              <span>
                {habit.icon} {habit.label}
              </span>
              <strong>
                {count}/{habit.goal} · {pct}%
              </strong>
            </article>
          );
        })}
      </div>

      {habits.length === 0 && <EmptyHint>Add habits to start your weekly grid.</EmptyHint>}

      {managing && (
        <ManageHabitsModal
          habits={habits}
          onClose={() => setManaging(false)}
          onSave={saveHabit}
          onDelete={deleteHabit}
          onMove={moveHabit}
        />
      )}
    </div>
  );
}

function ManageHabitsModal({
  habits,
  onClose,
  onSave,
  onDelete,
  onMove,
}: {
  habits: CustomHabit[];
  onClose: () => void;
  onSave: (habit: CustomHabit, isNew: boolean) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const blank: CustomHabit = {
    id: uid("habit"),
    label: "",
    icon: "✨",
    color: COLOR_PRESETS[0].color,
    bg: COLOR_PRESETS[0].bg,
    border: COLOR_PRESETS[0].border,
    goal: 5,
    section: "daily",
    order: habits.filter((h) => h.section === "daily").length,
  };
  const [draft, setDraft] = useState<CustomHabit>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);

  function startEdit(habit: CustomHabit) {
    setEditingId(habit.id);
    setDraft(habit);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label.trim()) return;
    onSave({ ...draft, label: draft.label.trim() }, !editingId);
    setEditingId(null);
    setDraft({
      ...blank,
      id: uid("habit"),
      order: habits.filter((h) => h.section === draft.section).length,
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Manage habits</h3>
          <button type="button" className="ghost-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <ul className="manage-list">
          {habits.map((habit) => (
            <li key={habit.id}>
              <span>
                {habit.icon} {habit.label}{" "}
                <em>
                  ({habit.section}, goal {habit.goal})
                </em>
              </span>
              <span className="manage-actions">
                <button type="button" onClick={() => onMove(habit.id, -1)}>
                  ↑
                </button>
                <button type="button" onClick={() => onMove(habit.id, 1)}>
                  ↓
                </button>
                <button type="button" onClick={() => startEdit(habit)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(habit.id)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form className="manage-form" onSubmit={submit}>
          <h4>{editingId ? "Edit habit" : "Add habit"}</h4>
          <div className="row-form">
            <input
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              placeholder="Icon"
              aria-label="Icon"
              className="icon-field"
            />
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Label"
              required
            />
            <input
              value={draft.sublabel ?? ""}
              onChange={(e) => setDraft({ ...draft, sublabel: e.target.value })}
              placeholder="Sublabel"
            />
          </div>
          <div className="row-form">
            <select
              value={draft.section}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  section: e.target.value as "daily" | "devotional",
                })
              }
            >
              <option value="daily">Daily</option>
              <option value="devotional">Devotional</option>
            </select>
            <input
              type="number"
              min={1}
              max={7}
              value={draft.goal}
              onChange={(e) => setDraft({ ...draft, goal: Number(e.target.value) || 1 })}
              aria-label="Weekly goal"
            />
            <div className="color-presets">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  className={`swatch ${draft.color === preset.color ? "is-on" : ""}`}
                  style={{ background: preset.color }}
                  onClick={() => setDraft({ ...draft, ...preset })}
                  aria-label={`Color ${preset.color}`}
                />
              ))}
            </div>
          </div>
          <div className="row-form">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Save changes" : "Add habit"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => {
                  setEditingId(null);
                  setDraft({ ...blank, id: uid("habit") });
                }}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
