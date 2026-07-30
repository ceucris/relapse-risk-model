import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(url);

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

console.log("Schema applied.");
