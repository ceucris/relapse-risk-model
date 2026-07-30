import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon Postgres connection string to continue.",
    );
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof getDb>;
