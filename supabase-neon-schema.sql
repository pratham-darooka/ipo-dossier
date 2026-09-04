-- Neon Postgres — run once in Neon SQL editor (no Prisma codegen needed).
CREATE TABLE IF NOT EXISTS ipo (
  slug TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ipo_status_idx ON ipo (status);
