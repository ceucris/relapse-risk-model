"use client";

import { useRef, useState } from "react";
import { celebrate } from "@/lib/celebrate";
import { useDashboard } from "@/lib/dashboard-context";
import { uid } from "@/lib/dates";
import { EmptyHint, SectionCard } from "@/components/ui";

export function TaskChecklist({ weekKey }: { weekKey: string }) {
  const { data, setData } = useDashboard();
  const [text, setText] = useState("");
  const tasks = data.tasks.filter((t) => t.weekKey === weekKey);

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setData((prev) => ({
      ...prev,
      tasks: [
        {
          id: uid("task"),
          text: value,
          completed: false,
          weekKey,
          createdAt: new Date().toISOString(),
        },
        ...prev.tasks,
      ],
    }));
    setText("");
  }

  function toggle(id: string, el: HTMLElement | null) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const completed = !t.completed;
        if (completed) celebrate(el);
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }),
    }));
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  }

  return (
    <SectionCard title="Weekly checklist" accent="#866a5b">
      <form className="row-form" onSubmit={addTask}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          aria-label="New task"
        />
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>
      <ul className="check-list">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            text={task.text}
            completed={task.completed}
            onToggle={(el) => toggle(task.id, el)}
            onRemove={() => remove(task.id)}
          />
        ))}
      </ul>
      {tasks.length === 0 && <EmptyHint>Nothing on the list yet.</EmptyHint>}
    </SectionCard>
  );
}

function TaskRow({
  text,
  completed,
  onToggle,
  onRemove,
}: {
  text: string;
  completed: boolean;
  onToggle: (el: HTMLElement | null) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <li className={`check-row ${completed ? "is-done" : ""}`}>
      <button
        ref={ref}
        type="button"
        className="check-box"
        aria-pressed={completed}
        onClick={() => onToggle(ref.current)}
      >
        <span>{completed ? "✓" : ""}</span>
      </button>
      <span className="check-text">{text}</span>
      <button type="button" className="ghost-x" onClick={onRemove} aria-label="Delete task">
        ×
      </button>
    </li>
  );
}
