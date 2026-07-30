import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import type { DashboardData } from "@/lib/types";

export const dashboardState = pgTable("dashboard_state", {
  id: varchar("id", { length: 64 }).primaryKey().default("default"),
  data: jsonb("data").$type<DashboardData>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  provider: varchar("provider", { length: 64 }).primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  scope: text("scope"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
