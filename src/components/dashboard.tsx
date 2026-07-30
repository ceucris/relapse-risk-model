import {
  addGoalAction,
  addHabitAction,
  addNoteAction,
  addTaskAction,
  bumpGoalAction,
  removeGoalAction,
  removeHabitAction,
  removeNoteAction,
  removeTaskAction,
  seedDemoAction,
  setTaskStatusAction,
  toggleHabitAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { DashboardData } from "@/lib/data";

const priorityLabel: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({ data }: { data: DashboardData }) {
  const openTasks = data.tasks.filter((t) => t.status !== "done");
  const doneTasks = data.tasks.filter((t) => t.status === "done");

  return (
    <div className="dashboard-shell">
      <header className="dash-header">
        <div className="brand-block">
          <p className="brand">Pulse</p>
          <h1 className="greeting">
            {greeting()}.
            <span className="greeting-sub"> Here’s your day.</span>
          </h1>
          <p className="date-line">{formatDate(data.today)}</p>
        </div>

        <div className="stat-rail" aria-label="Daily stats">
          <div className="stat">
            <span className="stat-value">{data.stats.openTasks}</span>
            <span className="stat-label">Open tasks</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {data.stats.habitsDone}/{data.stats.habitsTotal || 0}
            </span>
            <span className="stat-label">Habits</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.stats.doneToday}</span>
            <span className="stat-label">Done today</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.stats.goalsOnTrack}</span>
            <span className="stat-label">Goals on track</span>
          </div>
        </div>
      </header>

      {data.error && (
        <section className="setup-banner" role="status">
          <div>
            <h2>Connect Neon Postgres</h2>
            <p>
              {data.error} Set <code>DATABASE_URL</code> to your Neon connection
              string, run <code>npm run db:push</code> (or apply{" "}
              <code>drizzle/0000_init.sql</code>), then redeploy on Vercel.
            </p>
          </div>
        </section>
      )}

      {!data.error && data.tasks.length === 0 && data.habits.length === 0 && (
        <section className="setup-banner setup-banner--soft">
          <div>
            <h2>Start fresh or load a sample day</h2>
            <p>
              Your database is connected and empty. Add your first task below, or
              seed a sample workspace to explore the layout.
            </p>
          </div>
          <form action={seedDemoAction}>
            <SubmitButton className="btn btn-secondary">Load sample data</SubmitButton>
          </form>
        </section>
      )}

      <div className="dash-grid">
        <section className="panel panel-tasks" aria-labelledby="tasks-heading">
          <div className="panel-head">
            <h2 id="tasks-heading">Tasks</h2>
            <p>Capture what needs moving today.</p>
          </div>

          <form action={addTaskAction} className="inline-form task-form">
            <input
              name="title"
              required
              placeholder="Add a task…"
              className="field"
              aria-label="Task title"
            />
            <select name="priority" className="field field-select" defaultValue="medium" aria-label="Priority">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input name="dueDate" type="date" className="field field-date" aria-label="Due date" />
            <SubmitButton className="btn btn-primary">Add</SubmitButton>
          </form>

          <ul className="task-list">
            {openTasks.map((task) => (
              <li key={task.id} className={`task-item priority-${task.priority}`}>
                <div className="task-main">
                  <span className={`priority-chip priority-${task.priority}`}>
                    {priorityLabel[task.priority]}
                  </span>
                  <div>
                    <p className="task-title">{task.title}</p>
                    {task.dueDate && (
                      <p className="task-meta">Due {task.dueDate}</p>
                    )}
                  </div>
                </div>
                <div className="task-actions">
                  <form action={setTaskStatusAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="status" value="in_progress" />
                    <button
                      type="submit"
                      className={`chip-btn ${task.status === "in_progress" ? "is-active" : ""}`}
                    >
                      Focus
                    </button>
                  </form>
                  <form action={setTaskStatusAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="status" value="done" />
                    <button type="submit" className="chip-btn chip-done">
                      Done
                    </button>
                  </form>
                  <form action={removeTaskAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <button type="submit" className="icon-btn" aria-label="Delete task">
                      ×
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {openTasks.length === 0 && (
              <li className="empty-row">No open tasks. Enjoy the calm.</li>
            )}
          </ul>

          {doneTasks.length > 0 && (
            <div className="done-block">
              <h3>Completed</h3>
              <ul className="task-list task-list-done">
                {doneTasks.slice(0, 5).map((task) => (
                  <li key={task.id} className="task-item is-done">
                    <p className="task-title">{task.title}</p>
                    <div className="task-actions">
                      <form action={setTaskStatusAction}>
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="status" value="todo" />
                        <button type="submit" className="chip-btn">
                          Restore
                        </button>
                      </form>
                      <form action={removeTaskAction}>
                        <input type="hidden" name="id" value={task.id} />
                        <button type="submit" className="icon-btn" aria-label="Delete task">
                          ×
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel panel-habits" aria-labelledby="habits-heading">
          <div className="panel-head">
            <h2 id="habits-heading">Habits</h2>
            <p>Small repeats compound.</p>
          </div>

          <form action={addHabitAction} className="inline-form">
            <input
              name="name"
              required
              placeholder="New habit…"
              className="field"
              aria-label="Habit name"
            />
            <input
              name="color"
              type="color"
              defaultValue="#1FA7A0"
              className="field field-color"
              aria-label="Habit color"
            />
            <SubmitButton className="btn btn-primary">Add</SubmitButton>
          </form>

          <ul className="habit-list">
            {data.habits.map((habit) => (
              <li key={habit.id} className={`habit-item ${habit.completedToday ? "is-done" : ""}`}>
                <form action={toggleHabitAction} className="habit-toggle-form">
                  <input type="hidden" name="id" value={habit.id} />
                  <button
                    type="submit"
                    className="habit-check"
                    style={{ ["--habit" as string]: habit.color }}
                    aria-pressed={habit.completedToday}
                    aria-label={`Mark ${habit.name} ${habit.completedToday ? "incomplete" : "complete"}`}
                  >
                    <span className="habit-dot" />
                    <span>
                      <span className="habit-name">{habit.name}</span>
                      <span className="habit-streak">
                        {habit.streak > 0 ? `${habit.streak}-day streak` : "Start today"}
                      </span>
                    </span>
                  </button>
                </form>
                <form action={removeHabitAction}>
                  <input type="hidden" name="id" value={habit.id} />
                  <button type="submit" className="icon-btn" aria-label="Delete habit">
                    ×
                  </button>
                </form>
              </li>
            ))}
            {data.habits.length === 0 && (
              <li className="empty-row">No habits yet. Add one you can keep.</li>
            )}
          </ul>
        </section>

        <section className="panel panel-notes" aria-labelledby="notes-heading">
          <div className="panel-head">
            <h2 id="notes-heading">Notes</h2>
            <p>Scratchpad for thoughts in flight.</p>
          </div>

          <form action={addNoteAction} className="note-form">
            <input
              name="title"
              placeholder="Title (optional)"
              className="field"
              aria-label="Note title"
            />
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Write a quick note…"
              className="field field-area"
              aria-label="Note body"
            />
            <SubmitButton className="btn btn-primary">Save note</SubmitButton>
          </form>

          <ul className="note-list">
            {data.notes.map((note) => (
              <li key={note.id} className={`note-item ${note.pinned ? "is-pinned" : ""}`}>
                <div>
                  <h3>{note.title}</h3>
                  <p>{note.body}</p>
                </div>
                <form action={removeNoteAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <button type="submit" className="icon-btn" aria-label="Delete note">
                    ×
                  </button>
                </form>
              </li>
            ))}
            {data.notes.length === 0 && (
              <li className="empty-row">Nothing captured yet.</li>
            )}
          </ul>
        </section>

        <section className="panel panel-goals" aria-labelledby="goals-heading">
          <div className="panel-head">
            <h2 id="goals-heading">Goals</h2>
            <p>Track progress on the longer arc.</p>
          </div>

          <form action={addGoalAction} className="inline-form goal-form">
            <input
              name="title"
              required
              placeholder="Goal title…"
              className="field"
              aria-label="Goal title"
            />
            <input
              name="targetValue"
              type="number"
              min={1}
              defaultValue={100}
              className="field field-num"
              aria-label="Target value"
            />
            <input
              name="unit"
              defaultValue="%"
              className="field field-unit"
              aria-label="Unit"
            />
            <SubmitButton className="btn btn-primary">Add</SubmitButton>
          </form>

          <ul className="goal-list">
            {data.goals.map((goal) => {
              const pct = Math.min(
                100,
                Math.round((goal.currentValue / Math.max(goal.targetValue, 1)) * 100),
              );
              return (
                <li key={goal.id} className="goal-item">
                  <div className="goal-top">
                    <div>
                      <h3>{goal.title}</h3>
                      <p className="goal-meta">
                        {goal.currentValue}/{goal.targetValue} {goal.unit}
                        {goal.deadline ? ` · due ${goal.deadline}` : ""}
                      </p>
                    </div>
                    <form action={removeGoalAction}>
                      <input type="hidden" name="id" value={goal.id} />
                      <button type="submit" className="icon-btn" aria-label="Delete goal">
                        ×
                      </button>
                    </form>
                  </div>
                  <div className="progress-track" aria-hidden>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="goal-actions">
                    <form action={bumpGoalAction}>
                      <input type="hidden" name="id" value={goal.id} />
                      <input type="hidden" name="delta" value={-1} />
                      <button type="submit" className="chip-btn">
                        −1
                      </button>
                    </form>
                    <form action={bumpGoalAction}>
                      <input type="hidden" name="id" value={goal.id} />
                      <input type="hidden" name="delta" value={1} />
                      <button type="submit" className="chip-btn chip-done">
                        +1
                      </button>
                    </form>
                    <span className="goal-pct">{pct}%</span>
                  </div>
                </li>
              );
            })}
            {data.goals.length === 0 && (
              <li className="empty-row">Set a goal worth returning to.</li>
            )}
          </ul>
        </section>
      </div>

      <footer className="dash-footer">
        <p>Pulse · personal productivity · Next.js 14 · Neon Postgres · Vercel</p>
      </footer>
    </div>
  );
}
