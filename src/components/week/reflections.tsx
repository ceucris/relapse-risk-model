"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { SectionCard } from "@/components/ui";

export function Reflections({ weekKey }: { weekKey: string }) {
  const { data, setData } = useDashboard();
  const entry = data.reflections.find((r) => r.weekKey === weekKey) ?? {
    weekKey,
    wins: "",
    lessons: "",
    gratitude: "",
  };

  function patch(partial: Partial<typeof entry>) {
    setData((prev) => {
      const others = prev.reflections.filter((r) => r.weekKey !== weekKey);
      return {
        ...prev,
        reflections: [...others, { ...entry, ...partial }],
      };
    });
  }

  return (
    <SectionCard title="Reflections" accent="#cfbb9f">
      <label className="field-label">
        Wins
        <textarea
          rows={2}
          value={entry.wins}
          onChange={(e) => patch({ wins: e.target.value })}
          placeholder="What went well?"
        />
      </label>
      <label className="field-label">
        Lessons
        <textarea
          rows={2}
          value={entry.lessons}
          onChange={(e) => patch({ lessons: e.target.value })}
          placeholder="What did I learn?"
        />
      </label>
      <label className="field-label">
        Gratitude
        <textarea
          rows={2}
          value={entry.gratitude}
          onChange={(e) => patch({ gratitude: e.target.value })}
          placeholder="What am I grateful for?"
        />
      </label>
    </SectionCard>
  );
}
