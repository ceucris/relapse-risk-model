"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { getYearKey, uid } from "@/lib/dates";
import { GOAL_CATEGORIES } from "@/lib/types";
import { EmptyHint, SectionCard } from "@/components/ui";

const THEME_COLORS = ["#866a5b", "#7a816c", "#d68d84", "#785b4e", "#8e967d", "#cfbb9f"];

export function YearView() {
  const { data, setData } = useDashboard();
  const [yearKey, setYearKey] = useState(getYearKey());

  const reflection = data.yearlyReflections.find((r) => r.yearKey === yearKey) ?? {
    yearKey,
    vision: "",
    nonNegotiables: "",
    focus: "",
    change: "",
  };
  const buckets = data.yearlyBuckets.filter((b) => b.yearKey === yearKey);
  const goals = data.yearlyGoals.filter((g) => g.yearKey === yearKey);

  function patchReflection(partial: Partial<typeof reflection>) {
    setData((prev) => {
      const others = prev.yearlyReflections.filter((r) => r.yearKey !== yearKey);
      return {
        ...prev,
        yearlyReflections: [...others, { ...reflection, ...partial }],
      };
    });
  }

  function addBucket() {
    setData((prev) => ({
      ...prev,
      yearlyBuckets: [
        ...prev.yearlyBuckets,
        {
          id: uid("yb"),
          yearKey,
          theme: "New theme",
          color: THEME_COLORS[prev.yearlyBuckets.length % THEME_COLORS.length],
          notes: "",
        },
      ],
    }));
  }

  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => setYearKey(String(Number(yearKey) - 1))}
        >
          ← Prev
        </button>
        <div className="view-title-block">
          <h2>Year</h2>
          <p>{yearKey} · your grounding page</p>
        </div>
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => setYearKey(String(Number(yearKey) + 1))}
        >
          Next →
        </button>
      </div>

      <div className="year-reflections">
        {(
          [
            ["vision", "Vision", "Who do I want to become?"],
            ["nonNegotiables", "Non-negotiables", "What will I protect?"],
            ["focus", "Focus", "Where am I putting my energy?"],
            ["change", "What I want to change", "What am I releasing?"],
          ] as const
        ).map(([key, title, placeholder]) => (
          <SectionCard key={key} title={title} accent="#866a5b">
            <textarea
              rows={4}
              value={reflection[key]}
              placeholder={placeholder}
              onChange={(e) => patchReflection({ [key]: e.target.value })}
            />
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Yearly theme buckets"
        accent="#7a816c"
        action={
          <button type="button" className="btn btn-soft" onClick={addBucket}>
            Add theme
          </button>
        }
      >
        <div className="theme-grid">
          {buckets.map((bucket) => (
            <article
              key={bucket.id}
              className="theme-card"
              style={{ borderColor: bucket.color }}
            >
              <input
                value={bucket.theme}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    yearlyBuckets: prev.yearlyBuckets.map((b) =>
                      b.id === bucket.id ? { ...b, theme: e.target.value } : b,
                    ),
                  }))
                }
              />
              <textarea
                rows={3}
                value={bucket.notes}
                placeholder="Notes for this theme…"
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    yearlyBuckets: prev.yearlyBuckets.map((b) =>
                      b.id === bucket.id ? { ...b, notes: e.target.value } : b,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="ghost-x"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    yearlyBuckets: prev.yearlyBuckets.filter((b) => b.id !== bucket.id),
                  }))
                }
              >
                ×
              </button>
            </article>
          ))}
        </div>
        {buckets.length === 0 && <EmptyHint>Name the themes that define this year.</EmptyHint>}
      </SectionCard>

      <div className="goal-categories">
        {GOAL_CATEGORIES.map((category) => {
          const items = goals.filter((g) => g.category === category);
          return (
            <details key={category} className="collapse-card" open>
              <summary>
                {category}
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={(e) => {
                    e.preventDefault();
                    setData((prev) => ({
                      ...prev,
                      yearlyGoals: [
                        ...prev.yearlyGoals,
                        {
                          id: uid("yg"),
                          yearKey,
                          category,
                          text: "",
                          completed: false,
                        },
                      ],
                    }));
                  }}
                >
                  Add
                </button>
              </summary>
              <ul className="check-list">
                {items.map((goal) => (
                  <li key={goal.id} className={`check-row ${goal.completed ? "is-done" : ""}`}>
                    <button
                      type="button"
                      className="check-box"
                      aria-pressed={goal.completed}
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          yearlyGoals: prev.yearlyGoals.map((g) =>
                            g.id === goal.id ? { ...g, completed: !g.completed } : g,
                          ),
                        }))
                      }
                    >
                      <span>{goal.completed ? "✓" : ""}</span>
                    </button>
                    <input
                      className="inline-edit"
                      value={goal.text}
                      placeholder="Yearly goal…"
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          yearlyGoals: prev.yearlyGoals.map((g) =>
                            g.id === goal.id ? { ...g, text: e.target.value } : g,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="ghost-x"
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          yearlyGoals: prev.yearlyGoals.filter((g) => g.id !== goal.id),
                        }))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
