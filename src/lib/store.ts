import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { dashboardState, oauthTokens } from "@/db/schema";
import { createDefaultData, type DashboardData } from "@/lib/types";

const DEFAULT_ID = "default";

let memoryStore: DashboardData | null = null;
const memoryOAuth = new Map<
  string,
  {
    accessToken: string;
    refreshToken: string | null;
    expiryDate: Date | null;
    scope: string | null;
  }
>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function ensureSchema() {
  if (!isDatabaseConfigured()) return;
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_state (
      id varchar(64) PRIMARY KEY DEFAULT 'default' NOT NULL,
      data jsonb NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider varchar(64) PRIMARY KEY NOT NULL,
      access_token text NOT NULL,
      refresh_token text,
      expiry_date timestamptz,
      scope text,
      updated_at timestamptz DEFAULT now() NOT NULL
    )
  `;
}

export async function loadDashboardData(): Promise<{
  data: DashboardData;
  configured: boolean;
  source: "neon" | "memory";
}> {
  if (!isDatabaseConfigured()) {
    if (!memoryStore) memoryStore = createDefaultData();
    return { data: clone(memoryStore), configured: false, source: "memory" };
  }

  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db
      .select()
      .from(dashboardState)
      .where(eq(dashboardState.id, DEFAULT_ID))
      .limit(1);

    if (rows.length === 0) {
      const data = createDefaultData();
      await db.insert(dashboardState).values({ id: DEFAULT_ID, data });
      return { data, configured: true, source: "neon" };
    }

    return {
      data: rows[0].data as DashboardData,
      configured: true,
      source: "neon",
    };
  } catch (error) {
    console.error("loadDashboardData failed, using memory fallback", error);
    if (!memoryStore) memoryStore = createDefaultData();
    return { data: clone(memoryStore), configured: true, source: "memory" };
  }
}

export async function saveDashboardData(data: DashboardData) {
  if (!isDatabaseConfigured()) {
    memoryStore = clone(data);
    return { ok: true as const, source: "memory" as const };
  }

  await ensureSchema();
  const db = getDb();
  await db
    .insert(dashboardState)
    .values({ id: DEFAULT_ID, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: dashboardState.id,
      set: { data, updatedAt: new Date() },
    });
  return { ok: true as const, source: "neon" as const };
}

export async function getOAuthToken(provider: string) {
  if (!isDatabaseConfigured()) {
    return memoryOAuth.get(provider) ?? null;
  }
  await ensureSchema();
  const db = getDb();
  const rows = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.provider, provider))
    .limit(1);
  if (!rows[0]) return null;
  return {
    accessToken: rows[0].accessToken,
    refreshToken: rows[0].refreshToken,
    expiryDate: rows[0].expiryDate,
    scope: rows[0].scope,
  };
}

export async function saveOAuthToken(input: {
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: Date | null;
  scope?: string | null;
}) {
  if (!isDatabaseConfigured()) {
    memoryOAuth.set(input.provider, {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiryDate: input.expiryDate ?? null,
      scope: input.scope ?? null,
    });
    return;
  }

  await ensureSchema();
  const db = getDb();
  await db
    .insert(oauthTokens)
    .values({
      provider: input.provider,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiryDate: input.expiryDate ?? null,
      scope: input.scope ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: oauthTokens.provider,
      set: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiryDate: input.expiryDate ?? null,
        scope: input.scope ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function clearOAuthToken(provider: string) {
  if (!isDatabaseConfigured()) {
    memoryOAuth.delete(provider);
    return;
  }
  await ensureSchema();
  const db = getDb();
  await db.delete(oauthTokens).where(eq(oauthTokens.provider, provider));
}
