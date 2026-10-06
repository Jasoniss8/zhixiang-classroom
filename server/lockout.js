export const MAX_FAILS = 5;
export const LOCK_MS = 15 * 60 * 1000;

// Seconds until the lock ends, or 0 when login attempts are allowed.
export async function lockedFor(db, who, now) {
  const until = await db.prepare("SELECT locked_until FROM login_attempts WHERE who = ?").bind(who).first("locked_until");
  return until && until > now ? Math.ceil((until - now) / 1000) : 0;
}

// Records a failed attempt; returns { remaining, retryAfter }.
export async function recordFailure(db, who, now) {
  const fails = ((await db.prepare("SELECT fails FROM login_attempts WHERE who = ?").bind(who).first("fails")) || 0) + 1;
  if (fails >= MAX_FAILS) {
    await db.prepare("INSERT OR REPLACE INTO login_attempts (who, fails, locked_until) VALUES (?, 0, ?)").bind(who, now + LOCK_MS).run();
    return { remaining: 0, retryAfter: LOCK_MS / 1000 };
  }
  await db.prepare("INSERT OR REPLACE INTO login_attempts (who, fails, locked_until) VALUES (?, ?, 0)").bind(who, fails).run();
  return { remaining: MAX_FAILS - fails, retryAfter: 0 };
}

export async function clearFailures(db, who) {
  await db.prepare("DELETE FROM login_attempts WHERE who = ?").bind(who).run();
}
