CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "notes" text,
  "status" "task_status" DEFAULT 'todo' NOT NULL,
  "priority" "task_priority" DEFAULT 'medium' NOT NULL,
  "due_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "habits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" text,
  "color" varchar(20) DEFAULT '#1FA7A0' NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "habit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "habit_id" uuid NOT NULL,
  "completed_on" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(200) DEFAULT 'Untitled' NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "target_value" integer DEFAULT 100 NOT NULL,
  "current_value" integer DEFAULT 0 NOT NULL,
  "unit" varchar(40) DEFAULT '%' NOT NULL,
  "deadline" date,
  "completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk"
 FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_habit_day_idx"
  ON "habit_logs" ("habit_id", "completed_on");
