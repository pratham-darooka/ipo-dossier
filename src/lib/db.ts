import { neon } from "@neondatabase/serverless";

// Neon-first DB layer (no Prisma codegen needed).
// Falls back to seed data when DATABASE_URL is missing (offline-friendly dev).

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function dbReady() {
  const q = sql();
  if (!q) return false;
  try {
    await q`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function ensureIpoTable() {
  const q = sql();
  if (!q) return false;
  await q`
    CREATE TABLE IF NOT EXISTS ipo (
      slug TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      status TEXT DEFAULT 'upcoming',
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  return true;
}

export async function listIpos(status?: string | null) {
  const q = sql();
  if (!q) return null;
  await ensureIpoTable();
  if (status) {
    const rows = await q`SELECT slug, company, status, data, updated_at FROM ipo WHERE status = ${status} ORDER BY updated_at DESC LIMIT 50`;
    return rows as Record<string, unknown>[];
  }
  const rows = await q`SELECT slug, company, status, data, updated_at FROM ipo ORDER BY updated_at DESC LIMIT 50`;
  return rows as Record<string, unknown>[];
}
