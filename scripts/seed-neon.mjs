// One-time Neon seed: creates `ipo` table + upserts dossier rows from src/lib/data.ts
// Usage: node scripts/seed-neon.mjs   (reads DATABASE_URL from .env)
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.split("\n").find((l) => l.startsWith("DATABASE_URL="))?.split("=")?.slice(1)?.join("=")?.replace(/^"|"$/g, "");
if (!url) throw new Error("DATABASE_URL missing in .env");

const { IPOS } = await import("../src/lib/data.ts");
const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS ipo (
    slug TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    status TEXT DEFAULT 'upcoming',
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS ipo_status_idx ON ipo (status)`;

for (const ipo of IPOS) {
  // Insert-only: never clobber live NSE fields the cron pipeline maintains.
  await sql`
    INSERT INTO ipo (slug, company, status, data)
    VALUES (${ipo.slug}, ${ipo.company}, ${ipo.status}, ${JSON.stringify({ ...ipo, syncedAt: new Date().toISOString() })}::jsonb)
    ON CONFLICT (slug) DO NOTHING
  `;
  console.log("ensured", ipo.slug);
}
const count = await sql`SELECT count(*)::int AS n FROM ipo`;
console.log("TOTAL ROWS:", count[0].n);
