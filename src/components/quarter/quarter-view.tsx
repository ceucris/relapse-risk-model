"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { getQuarterKey, shiftQuarter, toDayKey, uid } from "@/lib/dates";
import type { CreditCard, QuarterlyGoal } from "@/lib/types";
import { GOAL_CATEGORIES } from "@/lib/types";
import { EmptyHint, SectionCard } from "@/components/ui";

export function QuarterView() {
  const { data, setData } = useDashboard();
  const [quarterKey, setQuarterKey] = useState(getQuarterKey());

  const goals = data.quarterlyGoals.filter((g) => g.quarterKey === quarterKey);
  const achievements = data.achievements.filter((a) => a.quarterKey === quarterKey);
  const books = data.books.filter(
    (b) => b.status === "finished" && b.quarterKey === quarterKey,
  );

  const gymWeeks = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const today = new Date();
    for (let i = 12; i >= 0; i -= 1) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const startKey = toDayKey(start);
      const endKey = toDayKey(end);
      const count = data.gymSessions.filter(
        (s) => s.date >= startKey && s.date <= endKey && s.completed,
      ).length;
      weeks.push({
        label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count,
      });
    }
    return weeks;
  }, [data.gymSessions]);

  const maxGym = Math.max(1, ...gymWeeks.map((w) => w.count));

  function addCard() {
    const card: CreditCard = {
      id: uid("cc"),
      name: "New card",
      balance: 1000,
      originalBalance: 1000,
      limit: 2000,
      color: "#866a5b",
    };
    setData((prev) => ({ ...prev, creditCards: [...prev.creditCards, card] }));
  }

  function updateCard(id: string, patch: Partial<CreditCard>) {
    setData((prev) => ({
      ...prev,
      creditCards: prev.creditCards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function removeCard(id: string) {
    setData((prev) => ({
      ...prev,
      creditCards: prev.creditCards.filter((c) => c.id !== id),
    }));
  }

  function addSavings() {
    setData((prev) => ({
      ...prev,
      savingsGoals: [
        ...prev.savingsGoals,
        {
          id: uid("save"),
          name: "Emergency fund",
          current: 0,
          target: 5000,
          color: "#7a816c",
        },
      ],
    }));
  }

  function addGoal(category: QuarterlyGoal["category"]) {
    setData((prev) => ({
      ...prev,
      quarterlyGoals: [
        ...prev.quarterlyGoals,
        {
          id: uid("qg"),
          quarterKey,
          category,
          text: "",
          completed: false,
        },
      ],
    }));
  }

  function addAchievement() {
    const text = window.prompt("What did you achieve?");
    if (!text?.trim()) return;
    setData((prev) => ({
      ...prev,
      achievements: [
        {
          id: uid("ach"),
          quarterKey,
          text: text.trim(),
          date: toDayKey(),
        },
        ...prev.achievements,
      ],
    }));
  }

  function addParking() {
    const text = window.prompt("Parking lot idea?");
    if (!text?.trim()) return;
    setData((prev) => ({
      ...prev,
      parkingLot: [
        {
          id: uid("park"),
          text: text.trim(),
          createdAt: new Date().toISOString(),
        },
        ...prev.parkingLot,
      ],
    }));
  }

  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => setQuarterKey((q) => shiftQuarter(q, -1))}
        >
          ← Prev
        </button>
        <div className="view-title-block">
          <h2>Quarter</h2>
          <p>{quarterKey}</p>
        </div>
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => setQuarterKey((q) => shiftQuarter(q, 1))}
        >
          Next →
        </button>
      </div>

      <SectionCard title="Gym consistency · last 13 weeks" accent="#7a816c">
        <div className="gym-chart">
          {gymWeeks.map((week) => (
            <div key={week.label} className="gym-bar-col">
              <div
                className="gym-bar"
                style={{ height: `${(week.count / maxGym) * 100}%` }}
                title={`${week.count} sessions`}
              />
              <span>{week.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="quarter-grid">
        <SectionCard
          title="Credit cards"
          accent="#785b4e"
          action={
            <button type="button" className="btn btn-soft" onClick={addCard}>
              Add
            </button>
          }
        >
          {data.creditCards.map((card) => {
            const paid = Math.max(0, card.originalBalance - card.balance);
            const pct = Math.min(
              100,
              Math.round((paid / Math.max(card.originalBalance, 1)) * 100),
            );
            return (
              <div key={card.id} className="finance-row">
                <div className="row-form">
                  <input
                    value={card.name}
                    onChange={(e) => updateCard(card.id, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    value={card.balance}
                    onChange={(e) =>
                      updateCard(card.id, { balance: Number(e.target.value) || 0 })
                    }
                    aria-label="Balance"
                  />
                  <button
                    type="button"
                    className="ghost-x"
                    onClick={() => removeCard(card.id)}
                    aria-label="Remove card"
                  >
                    ×
                  </button>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: card.color }}
                  />
                </div>
                <p className="muted">
                  ${card.balance.toLocaleString()} left · {pct}% paid down · limit $
                  {card.limit.toLocaleString()}
                </p>
              </div>
            );
          })}
          {data.creditCards.length === 0 && <EmptyHint>Track balances and payoff progress.</EmptyHint>}
        </SectionCard>

        <SectionCard
          title="Savings"
          accent="#8e967d"
          action={
            <button type="button" className="btn btn-soft" onClick={addSavings}>
              Add
            </button>
          }
        >
          {data.savingsGoals.map((goal) => {
            const pct = Math.min(
              100,
              Math.round((goal.current / Math.max(goal.target, 1)) * 100),
            );
            return (
              <div key={goal.id} className="finance-row">
                <div className="row-form">
                  <input
                    value={goal.name}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        savingsGoals: prev.savingsGoals.map((g) =>
                          g.id === goal.id ? { ...g, name: e.target.value } : g,
                        ),
                      }))
                    }
                  />
                  <input
                    type="number"
                    value={goal.current}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        savingsGoals: prev.savingsGoals.map((g) =>
                          g.id === goal.id
                            ? { ...g, current: Number(e.target.value) || 0 }
                            : g,
                        ),
                      }))
                    }
                  />
                  <span className="muted">/ {goal.target}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: goal.color }}
                  />
                </div>
              </div>
            );
          })}
          {data.savingsGoals.length === 0 && <EmptyHint>Add a savings target.</EmptyHint>}
        </SectionCard>
      </div>

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
                    addGoal(category);
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
                          quarterlyGoals: prev.quarterlyGoals.map((g) =>
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
                      placeholder="Goal…"
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          quarterlyGoals: prev.quarterlyGoals.map((g) =>
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
                          quarterlyGoals: prev.quarterlyGoals.filter((g) => g.id !== goal.id),
                        }))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              {items.length === 0 && <EmptyHint>No {category.toLowerCase()} goals yet.</EmptyHint>}
            </details>
          );
        })}
      </div>

      <div className="quarter-grid">
        <SectionCard
          title="Achievements"
          accent="#d68d84"
          action={
            <button type="button" className="btn btn-soft" onClick={addAchievement}>
              Add
            </button>
          }
        >
          <ul className="soft-list">
            {achievements.map((a) => (
              <li key={a.id}>
                <span>
                  {a.date}: {a.text}
                </span>
                <button
                  type="button"
                  className="ghost-x"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      achievements: prev.achievements.filter((x) => x.id !== a.id),
                    }))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {achievements.length === 0 && <EmptyHint>Celebrate wins here.</EmptyHint>}
        </SectionCard>

        <SectionCard title="Books finished" accent="#8e967d">
          <ul className="book-finished-list">
            {books.map((book) => (
              <li key={book.id}>
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" />
                ) : (
                  <span className="mini-cover">📘</span>
                )}
                <span>
                  <strong>{book.title}</strong>
                  <em>{book.author}</em>
                </span>
              </li>
            ))}
          </ul>
          {books.length === 0 && (
            <EmptyHint>Finished books from the week view land here.</EmptyHint>
          )}
        </SectionCard>

        <SectionCard
          title="Parking lot"
          accent="#cfbb9f"
          action={
            <button type="button" className="btn btn-soft" onClick={addParking}>
              Add
            </button>
          }
        >
          <ul className="soft-list">
            {data.parkingLot.map((item) => (
              <li key={item.id}>
                <span>{item.text}</span>
                <button
                  type="button"
                  className="ghost-x"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      parkingLot: prev.parkingLot.filter((p) => p.id !== item.id),
                    }))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {data.parkingLot.length === 0 && (
            <EmptyHint>Ideas to revisit later.</EmptyHint>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
