-- D1 schema for site analytics. Apply with:
--   npx wrangler d1 execute zhixiang-analytics --remote --file schema.sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  type TEXT NOT NULL,
  key TEXT,
  extra TEXT,
  visitor TEXT NOT NULL,
  device TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_day_type ON events(day, type);
CREATE INDEX IF NOT EXISTS events_visitor_ts ON events(visitor, ts);
CREATE TABLE IF NOT EXISTS salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (
  who TEXT PRIMARY KEY,
  fails INTEGER NOT NULL,
  locked_until INTEGER NOT NULL
);
