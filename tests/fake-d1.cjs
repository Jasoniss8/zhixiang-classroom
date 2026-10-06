'use strict';
// Minimal D1 stand-in over node:sqlite for server tests.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function createD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.resolve(__dirname, '../schema.sql'), 'utf8'));
  const statement = (sql, args = []) => ({
    bind: (...next) => statement(sql, next),
    async first(column) {
      const row = db.prepare(sql).get(...args);
      if (!row) return null;
      return column ? row[column] : { ...row };
    },
    async all() {
      return { results: db.prepare(sql).all(...args).map((row) => ({ ...row })) };
    },
    async run() {
      const info = db.prepare(sql).run(...args);
      return { meta: { changes: Number(info.changes) } };
    },
  });
  return {
    raw: db,
    prepare: (sql) => statement(sql),
    async batch(statements) {
      const out = [];
      for (const s of statements) out.push(await s.run());
      return out;
    },
  };
}
module.exports = { createD1 };
