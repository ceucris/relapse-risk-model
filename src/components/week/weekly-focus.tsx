"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { SectionCard } from "@/components/ui";

export function WeeklyFocus({ weekKey }: { weekKey: string }) {
  const { data, setData } = useDashboard();
  const entry = data.weeklyFocus.find((f) => f.weekKey === weekKey) ?? {
    weekKey,
    focus: "",
    goals: ["", "", ""],
  };

  function update(next: { focus: string; goals: string[] }) {
    setData((prev) => {
      const others = prev.weeklyFocus.filter((f) => f.weekKey !== weekKey);
      return {
        ...prev,
        weeklyFocus: [...others, { weekKey, ...next }],
      };
    });
  }

  return (
    <SectionCard title="Weekly focus" accent="#d68d84">
      <label className="field-label">
        This week I’m focused on
        <input
          value={entry.focus}
          onChange={(e) => update({ focus: e.target.value, goals: entry.goals })}
          placeholder="One clear theme…"
        />
      </label>
      <div className="goal-stack">
        {entry.goals.map((goal, idx) => (
          <input
            key={idx}
            value={goal}
            placeholder={`Goal ${idx + 1}`}
            onChange={(e) => {
              const goals = [...entry.goals];
              goals[idx] = e.target.value;
              update({ focus: entry.focus, goals });
            }}
          />
        ))}
      </div>
    </SectionCard>
  );
}
