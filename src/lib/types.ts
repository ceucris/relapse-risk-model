export type DayKey = string; // YYYY-MM-DD
export type WeekKey = string; // YYYY-Www or Monday date
export type QuarterKey = string; // e.g. 2026-Q2
export type YearKey = string; // e.g. 2026

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  weekKey: WeekKey;
  createdAt: string;
}

export interface GymSession {
  id: string;
  date: DayKey;
  type: string;
  notes?: string;
  completed: boolean;
}

export interface WeeklyFocus {
  weekKey: WeekKey;
  focus: string;
  goals: string[];
}

export interface Reflection {
  weekKey: WeekKey;
  wins: string;
  lessons: string;
  gratitude: string;
}

export interface BookEntry {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  openLibraryId?: string;
  status: "want" | "reading" | "finished";
  startedAt?: string;
  finishedAt?: string;
  quarterKey?: QuarterKey;
}

export interface CustomHabit {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  goal: number;
  section: "daily" | "devotional";
  order: number;
}

export interface HabitLog {
  habitId: string;
  date: DayKey;
}

export interface CreditCard {
  id: string;
  name: string;
  balance: number;
  originalBalance: number;
  limit: number;
  color: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  color: string;
}

export interface QuarterlyGoal {
  id: string;
  quarterKey: QuarterKey;
  category: "Finance" | "Health" | "Business" | "Personal";
  text: string;
  completed: boolean;
}

export interface Achievement {
  id: string;
  quarterKey: QuarterKey;
  text: string;
  date: DayKey;
}

export interface ParkingLotItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface BucketListItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  category?:
    | "Travel"
    | "Experience"
    | "Career"
    | "Personal"
    | "Health"
    | "Creative"
    | "Financial";
}

export interface YearlyReflection {
  yearKey: YearKey;
  vision: string;
  nonNegotiables: string;
  focus: string;
  change: string;
}

export interface YearlyBucket {
  id: string;
  yearKey: YearKey;
  theme: string;
  color: string;
  notes: string;
}

export interface YearlyGoal {
  id: string;
  yearKey: YearKey;
  category: "Finance" | "Health" | "Business" | "Personal";
  text: string;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
}

export interface DashboardData {
  version: number;
  profileName: string;
  affirmation: string;
  tasks: TaskItem[];
  gymSessions: GymSession[];
  weeklyFocus: WeeklyFocus[];
  reflections: Reflection[];
  books: BookEntry[];
  habits: CustomHabit[];
  habitLogs: HabitLog[];
  creditCards: CreditCard[];
  savingsGoals: SavingsGoal[];
  quarterlyGoals: QuarterlyGoal[];
  achievements: Achievement[];
  parkingLot: ParkingLotItem[];
  bucketList: BucketListItem[];
  yearlyReflections: YearlyReflection[];
  yearlyBuckets: YearlyBucket[];
  yearlyGoals: YearlyGoal[];
  /** Maps briefing send date -> ordered task ids for SMS replies */
  smsTaskMaps?: Record<string, string[]>;
}

export const BUCKET_CATEGORIES = [
  "Travel",
  "Experience",
  "Career",
  "Personal",
  "Health",
  "Creative",
  "Financial",
] as const;

export const GOAL_CATEGORIES = [
  "Finance",
  "Health",
  "Business",
  "Personal",
] as const;

export function createDefaultData(): DashboardData {
  const habits: CustomHabit[] = [
    {
      id: "h-water",
      label: "Drink water",
      icon: "💧",
      color: "#5b7c8e",
      bg: "#e8f0f4",
      border: "#a8c0cc",
      goal: 7,
      section: "daily",
      order: 0,
    },
    {
      id: "h-move",
      label: "Move body",
      icon: "🏃",
      color: "#7a816c",
      bg: "#eef1e8",
      border: "#b5bba8",
      goal: 5,
      section: "daily",
      order: 1,
    },
    {
      id: "h-read",
      label: "Read 20 min",
      icon: "📖",
      color: "#866a5b",
      bg: "#f3ebe4",
      border: "#cbb3a4",
      goal: 5,
      section: "daily",
      order: 2,
    },
    {
      id: "h-pray",
      label: "Morning prayer",
      icon: "🙏",
      color: "#d68d84",
      bg: "#f8ebe9",
      border: "#e8bbb5",
      goal: 7,
      section: "devotional",
      order: 0,
    },
    {
      id: "h-journal",
      label: "Journal",
      icon: "✍️",
      color: "#785b4e",
      bg: "#f1e8e2",
      border: "#c4a99a",
      goal: 3,
      section: "devotional",
      order: 1,
    },
  ];

  return {
    version: 1,
    profileName: "Casey",
    affirmation: "One intentional day at a time.",
    tasks: [],
    gymSessions: [],
    weeklyFocus: [],
    reflections: [],
    books: [],
    habits,
    habitLogs: [],
    creditCards: [],
    savingsGoals: [],
    quarterlyGoals: [],
    achievements: [],
    parkingLot: [],
    bucketList: [],
    yearlyReflections: [],
    yearlyBuckets: [],
    yearlyGoals: [],
    smsTaskMaps: {},
  };
}
