"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { WeekView } from "@/components/week/week-view";
import { HabitsView } from "@/components/habits/habits-view";
import { QuarterView } from "@/components/quarter/quarter-view";
import { YearView } from "@/components/year/year-view";
import { BucketListView } from "@/components/bucket/bucket-list-view";

const TABS = [
  { id: "week", label: "Week" },
  { id: "habits", label: "Habits" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "bucket", label: "Bucket list" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppShell() {
  const { data, setData, loading, saving, configured, source, error } = useDashboard();
  const [tab, setTab] = useState<TabId>("week");

  if (loading) {
    return (
      <div className="boot-screen">
        <p className="brand">Pulse</p>
        <p>Loading your life dashboard…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="brand">Pulse</p>
          <h1>
            Good day,{" "}
            <input
              className="name-inline"
              value={data.profileName}
              onChange={(e) =>
                setData((prev) => ({ ...prev, profileName: e.target.value }))
              }
              aria-label="Your name"
            />
          </h1>
          <input
            className="affirmation-inline"
            value={data.affirmation}
            onChange={(e) =>
              setData((prev) => ({ ...prev, affirmation: e.target.value }))
            }
            aria-label="Daily affirmation"
          />
        </div>
        <div className="header-meta">
          <span className={`save-pill ${saving ? "is-saving" : ""}`}>
            {saving ? "Saving…" : configured ? `Saved · ${source}` : "Local draft"}
          </span>
          {!configured && (
            <p className="setup-note">
              Set <code>DATABASE_URL</code> for Neon persistence.
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      </header>

      <nav className="tab-nav" aria-label="Dashboard views">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-btn ${tab === item.id ? "is-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "week" && <WeekView />}
        {tab === "habits" && <HabitsView />}
        {tab === "quarter" && <QuarterView />}
        {tab === "year" && <YearView />}
        {tab === "bucket" && <BucketListView />}
      </main>
    </div>
  );
}
