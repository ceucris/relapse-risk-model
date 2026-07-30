"use server";

import { revalidatePath } from "next/cache";
import {
  bumpGoal,
  createGoal,
  createHabit,
  createNote,
  createTask,
  deleteGoal,
  deleteHabit,
  deleteNote,
  deleteTask,
  seedDemoData,
  toggleHabitToday,
  updateTaskStatus,
} from "@/lib/data";

function requireTitle(value: FormDataEntryValue | null, label = "Title") {
  const title = String(value ?? "").trim();
  if (!title) {
    throw new Error(`${label} is required`);
  }
  return title;
}

export async function addTaskAction(formData: FormData) {
  const title = requireTitle(formData.get("title"));
  const priority = String(formData.get("priority") ?? "medium") as
    | "low"
    | "medium"
    | "high";
  const dueDate = String(formData.get("dueDate") ?? "") || null;
  await createTask({ title, priority, dueDate });
  revalidatePath("/");
}

export async function setTaskStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "todo"
    | "in_progress"
    | "done";
  if (!id || !status) return;
  await updateTaskStatus(id, status);
  revalidatePath("/");
}

export async function removeTaskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteTask(id);
  revalidatePath("/");
}

export async function addHabitAction(formData: FormData) {
  const name = requireTitle(formData.get("name"), "Habit name");
  const color = String(formData.get("color") ?? "#1FA7A0");
  await createHabit({ name, color });
  revalidatePath("/");
}

export async function toggleHabitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await toggleHabitToday(id);
  revalidatePath("/");
}

export async function removeHabitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteHabit(id);
  revalidatePath("/");
}

export async function addNoteAction(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Note body is required");
  const title = String(formData.get("title") ?? "").trim() || undefined;
  await createNote({ title, body });
  revalidatePath("/");
}

export async function removeNoteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteNote(id);
  revalidatePath("/");
}

export async function addGoalAction(formData: FormData) {
  const title = requireTitle(formData.get("title"));
  const targetValue = Number(formData.get("targetValue") ?? 100);
  const unit = String(formData.get("unit") ?? "%").trim() || "%";
  const deadline = String(formData.get("deadline") ?? "") || null;
  await createGoal({
    title,
    targetValue: Number.isFinite(targetValue) ? targetValue : 100,
    unit,
    deadline,
  });
  revalidatePath("/");
}

export async function bumpGoalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? 1);
  if (!id) return;
  await bumpGoal(id, Number.isFinite(delta) ? delta : 1);
  revalidatePath("/");
}

export async function removeGoalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteGoal(id);
  revalidatePath("/");
}

export async function seedDemoAction() {
  await seedDemoData();
  revalidatePath("/");
}
