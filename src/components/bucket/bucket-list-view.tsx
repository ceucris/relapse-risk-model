"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { toDayKey, uid } from "@/lib/dates";
import { BUCKET_CATEGORIES, type BucketListItem } from "@/lib/types";
import { EmptyHint, SectionCard } from "@/components/ui";

const CATEGORY_COLORS: Record<string, string> = {
  Travel: "#5b7c8e",
  Experience: "#d68d84",
  Career: "#785b4e",
  Personal: "#866a5b",
  Health: "#7a816c",
  Creative: "#8e967d",
  Financial: "#cfbb9f",
};

export function BucketListView() {
  const { data, setData } = useDashboard();
  const [filter, setFilter] = useState<"All" | BucketListItem["category"]>("All");
  const [text, setText] = useState("");
  const [category, setCategory] =
    useState<NonNullable<BucketListItem["category"]>>("Personal");

  const items = useMemo(() => {
    if (filter === "All") return data.bucketList;
    return data.bucketList.filter((i) => i.category === filter);
  }, [data.bucketList, filter]);

  const completed = data.bucketList.filter((i) => i.completed).length;
  const pct = data.bucketList.length
    ? Math.round((completed / data.bucketList.length) * 100)
    : 0;

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setData((prev) => ({
      ...prev,
      bucketList: [
        {
          id: uid("bucket"),
          text: text.trim(),
          completed: false,
          category,
        },
        ...prev.bucketList,
      ],
    }));
    setText("");
  }

  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <div className="view-title-block">
          <h2>Bucket list</h2>
          <p>
            {completed}/{data.bucketList.length || 0} completed · {pct}%
          </p>
        </div>
      </div>

      <div className="progress-track progress-track--lg">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="filter-row">
        <button
          type="button"
          className={`chip ${filter === "All" ? "is-on" : ""}`}
          onClick={() => setFilter("All")}
        >
          All
        </button>
        {BUCKET_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${filter === cat ? "is-on" : ""}`}
            style={{ ["--chip" as string]: CATEGORY_COLORS[cat] }}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <SectionCard title="Dreams & milestones" accent="#866a5b">
        <form className="row-form" onSubmit={addItem}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a bucket list item…"
          />
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as NonNullable<BucketListItem["category"]>)
            }
          >
            {BUCKET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>

        <ul className="bucket-list">
          {items.map((item) => (
            <li key={item.id} className={item.completed ? "is-done" : ""}>
              <button
                type="button"
                className="check-box"
                aria-pressed={item.completed}
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    bucketList: prev.bucketList.map((b) =>
                      b.id === item.id
                        ? {
                            ...b,
                            completed: !b.completed,
                            completedAt: !b.completed ? toDayKey() : undefined,
                          }
                        : b,
                    ),
                  }))
                }
              >
                <span>{item.completed ? "✓" : ""}</span>
              </button>
              <div>
                <strong>{item.text}</strong>
                <span
                  className="cat-pill"
                  style={{
                    background: CATEGORY_COLORS[item.category || "Personal"],
                  }}
                >
                  {item.category}
                </span>
                {item.completedAt && <em>Done {item.completedAt}</em>}
              </div>
              <button
                type="button"
                className="ghost-x"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    bucketList: prev.bucketList.filter((b) => b.id !== item.id),
                  }))
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 && <EmptyHint>No items in this filter yet.</EmptyHint>}
      </SectionCard>
    </div>
  );
}
