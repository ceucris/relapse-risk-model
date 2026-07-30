CREATE TABLE IF NOT EXISTS "dashboard_state" (
  "id" varchar(64) PRIMARY KEY DEFAULT 'default' NOT NULL,
  "data" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_tokens" (
  "provider" varchar(64) PRIMARY KEY NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expiry_date" timestamp with time zone,
  "scope" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
