import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import {
  goals,
  habitLogs,
  habits,
  notes,
  tasks,
  type Goal,
  type Habit,
  type Note,
  type Task,
} from "@/db/schema";

export type DashboardData = {
  configured: boolean;
  tasks: Task[];
  habits: Array<Habit & { completedToday: boolean; streak: number }>;
  notes: Note[];
  goals: Goal[];
  stats: {
    openTasks: number;
    doneToday: number;
    habitsDone: number;
    habitsTotal: number;
    goalsOnTrack: number;
  };
  today: string;
  error?: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function computeStreak(habitId: string, today: string) {
  const db = getDb();
  const logs = await db
    .select({ completedOn: habitLogs.completedOn })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(desc(habitLogs.completedOn));

  const completed = new Set(logs.map((l) => l.completedOn));
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00`);

  // If not completed today, start from yesterday
  if (!completed.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!completed.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function getDashboardData(): Promise<DashboardData> {
  const today = todayIso();

  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      tasks: [],
      habits: [],
      notes: [],
      goals: [],
      stats: {
        openTasks: 0,
        doneToday: 0,
        habitsDone: 0,
        habitsTotal: 0,
        goalsOnTrack: 0,
      },
      today,
      error: "DATABASE_URL is not configured.",
    };
  }

  try {
    const db = getDb();
    const todayStart = startOfToday();

    const [taskRows, habitRows, noteRows, goalRows, todayLogs] =
      await Promise.all([
        db.select().from(tasks).orderBy(asc(tasks.status), desc(tasks.priority), desc(tasks.createdAt)),
        db
          .select()
          .from(habits)
          .where(eq(habits.archived, false))
          .orderBy(asc(habits.createdAt)),
        db
          .select()
          .from(notes)
          .orderBy(desc(notes.pinned), desc(notes.updatedAt))
          .limit(8),
        db
          .select()
          .from(goals)
          .where(eq(goals.completed, false))
          .orderBy(asc(goals.deadline), desc(goals.updatedAt)),
        db
          .select()
          .from(habitLogs)
          .where(eq(habitLogs.completedOn, today)),
      ]);

    const completedHabitIds = new Set(todayLogs.map((l) => l.habitId));

    const habitsWithMeta = await Promise.all(
      habitRows.map(async (habit) => ({
        ...habit,
        completedToday: completedHabitIds.has(habit.id),
        streak: await computeStreak(habit.id, today),
      })),
    );

    const openTasks = taskRows.filter((t) => t.status !== "done").length;
    const doneToday = taskRows.filter(
      (t) => t.status === "done" && t.updatedAt >= todayStart,
    ).length;
    const habitsDone = habitsWithMeta.filter((h) => h.completedToday).length;
    const goalsOnTrack = goalRows.filter(
      (g) => g.currentValue / Math.max(g.targetValue, 1) >= 0.5,
    ).length;

    return {
      configured: true,
      tasks: taskRows,
      habits: habitsWithMeta,
      notes: noteRows,
      goals: goalRows,
      stats: {
        openTasks,
        doneToday,
        habitsDone,
        habitsTotal: habitsWithMeta.length,
        goalsOnTrack,
      },
      today,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data.";
    return {
      configured: true,
      tasks: [],
      habits: [],
      notes: [],
      goals: [],
      stats: {
        openTasks: 0,
        doneToday: 0,
        habitsDone: 0,
        habitsTotal: 0,
        goalsOnTrack: 0,
      },
      today,
      error: message,
    };
  }
}

export async function createTask(input: {
  title: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(tasks)
    .values({
      title: input.title.trim(),
      priority: input.priority ?? "medium",
      dueDate: input.dueDate || null,
    })
    .returning();
  return row;
}

export async function updateTaskStatus(
  id: string,
  status: "todo" | "in_progress" | "done",
) {
  const db = getDb();
  const [row] = await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return row;
}

export async function deleteTask(id: string) {
  const db = getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function createHabit(input: { name: string; color?: string }) {
  const db = getDb();
  const [row] = await db
    .insert(habits)
    .values({
      name: input.name.trim(),
      color: input.color ?? "#1FA7A0",
    })
    .returning();
  return row;
}

export async function toggleHabitToday(habitId: string, today = todayIso()) {
  const db = getDb();
  const existing = await db
    .select()
    .from(habitLogs)
    .where(
      and(eq(habitLogs.habitId, habitId), eq(habitLogs.completedOn, today)),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
    return { completed: false };
  }

  await db.insert(habitLogs).values({ habitId, completedOn: today });
  return { completed: true };
}

export async function deleteHabit(id: string) {
  const db = getDb();
  await db.delete(habits).where(eq(habits.id, id));
}

export async function createNote(input: { title?: string; body: string }) {
  const db = getDb();
  const [row] = await db
    .insert(notes)
    .values({
      title: input.title?.trim() || "Quick note",
      body: input.body.trim(),
    })
    .returning();
  return row;
}

export async function deleteNote(id: string) {
  const db = getDb();
  await db.delete(notes).where(eq(notes.id, id));
}

export async function createGoal(input: {
  title: string;
  targetValue?: number;
  unit?: string;
  deadline?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(goals)
    .values({
      title: input.title.trim(),
      targetValue: input.targetValue ?? 100,
      unit: input.unit ?? "%",
      deadline: input.deadline || null,
    })
    .returning();
  return row;
}

export async function bumpGoal(id: string, delta: number) {
  const db = getDb();
  const [current] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!current) return null;

  const next = Math.max(0, Math.min(current.targetValue, current.currentValue + delta));
  const [row] = await db
    .update(goals)
    .set({
      currentValue: next,
      completed: next >= current.targetValue,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id))
    .returning();
  return row;
}

export async function deleteGoal(id: string) {
  const db = getDb();
  await db.delete(goals).where(eq(goals.id, id));
}

export async function seedDemoData() {
  const db = getDb();
  const today = todayIso();

  const existing = await db.select({ id: tasks.id }).from(tasks).limit(1);
  if (existing.length > 0) {
    return { seeded: false, reason: "Data already exists" };
  }

  await db.insert(tasks).values([
    {
      title: "Plan the week ahead",
      priority: "high",
      status: "todo",
      dueDate: today,
    },
    {
      title: "Ship dashboard MVP",
      priority: "high",
      status: "in_progress",
    },
    {
      title: "Inbox zero",
      priority: "medium",
      status: "todo",
    },
    {
      title: "Review reading list",
      priority: "low",
      status: "done",
    },
  ]);

  const habitRows = await db
    .insert(habits)
    .values([
      { name: "Deep work block", color: "#1FA7A0" },
      { name: "Move for 20 minutes", color: "#2F6FED" },
      { name: "No evening screens", color: "#D97706" },
    ])
    .returning();

  if (habitRows[0]) {
    await db.insert(habitLogs).values({
      habitId: habitRows[0].id,
      completedOn: today,
    });
  }

  await db.insert(notes).values([
    {
      title: "Focus mantra",
      body: "One thing at a time. Protect the morning for deep work.",
      pinned: true,
    },
    {
      title: "Ideas",
      body: "Weekly review ritual · habit streaks on mobile · keyboard shortcuts",
    },
  ]);

  await db.insert(goals).values([
    {
      title: "Read 12 books this year",
      targetValue: 12,
      currentValue: 4,
      unit: "books",
    },
    {
      title: "Ship side project",
      targetValue: 100,
      currentValue: 65,
      unit: "%",
    },
  ]);

  return { seeded: true };
}
