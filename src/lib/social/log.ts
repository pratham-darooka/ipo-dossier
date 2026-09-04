import { sql } from "../db";

/** Shared posted-log: what the page already published (all employees, all devices).
 *  The scheduler excludes these IDs — evergreen never repeats. */

export async function ensureSocialTable() {
  const q = sql();
  if (!q) return false;
  await q`
    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      ref TEXT NOT NULL,
      posted_on DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  return true;
}

export async function getPostedIds(): Promise<Set<string>> {
  try {
    const q = sql();
    if (!q) return new Set();
    await ensureSocialTable();
    const rows = (await q`SELECT id FROM social_posts`) as { id: string }[];
    return new Set(rows.map((r) => r.id));
  } catch {
    return new Set();
  }
}

export async function markPosted(id: string, kind: string, ref: string, postedOn: string): Promise<boolean> {
  try {
    const q = sql();
    if (!q) return false;
    await ensureSocialTable();
    await q`
      INSERT INTO social_posts (id, kind, ref, posted_on)
      VALUES (${id}, ${kind}, ${ref}, ${postedOn})
      ON CONFLICT (id) DO UPDATE SET posted_on = EXCLUDED.posted_on
    `;
    return true;
  } catch {
    return false;
  }
}

export type Draft = { id: string; payload: Record<string, unknown>; created_at: string };

export async function ensureDraftsTable() {
  const q = sql();
  if (!q) return false;
  await q`
    CREATE TABLE IF NOT EXISTS social_drafts (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  return true;
}

export async function listDrafts(): Promise<Draft[]> {
  try {
    const q = sql();
    if (!q) return [];
    await ensureDraftsTable();
    const rows = (await q`SELECT id, payload, created_at FROM social_drafts ORDER BY created_at DESC LIMIT 50`) as {
      id: string; payload: Record<string, unknown>; created_at: string;
    }[];
    return rows;
  } catch {
    return [];
  }
}

export async function saveDraft(id: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const q = sql();
    if (!q) return false;
    await ensureDraftsTable();
    await q`INSERT INTO social_drafts (id, payload) VALUES (${id}, ${JSON.stringify(payload)}::jsonb) ON CONFLICT (id) DO NOTHING`;
    return true;
  } catch {
    return false;
  }
}
