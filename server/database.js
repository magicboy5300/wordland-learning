import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

export async function openDatabase(filename) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(filename && fs.existsSync(filename) ? fs.readFileSync(filename) : undefined);
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL, grade INTEGER NOT NULL DEFAULT 1, semester TEXT NOT NULL DEFAULT '上册', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, lesson_id TEXT NOT NULL, content_version INTEGER NOT NULL,
      step INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress',
      active_ms INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS attempts_owner ON attempts(owner, lesson_id);
    CREATE TABLE IF NOT EXISTS hints (
      attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL, PRIMARY KEY (attempt_id, question_id)
    );
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL, prompt TEXT NOT NULL, answer_json TEXT NOT NULL,
      correct INTEGER NOT NULL, hinted INTEGER NOT NULL, explanation TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS review_sessions (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, questions_json TEXT NOT NULL,
      step INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress',
      active_ms INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS review_sessions_owner ON review_sessions(owner, updated_at);
    CREATE TABLE IF NOT EXISTS review_responses (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL, question_id TEXT NOT NULL, prompt TEXT NOT NULL, answer_json TEXT NOT NULL,
      correct INTEGER NOT NULL, hinted INTEGER NOT NULL, explanation TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS review_hints (
      session_id TEXT NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL, PRIMARY KEY(session_id, question_id)
    );
    CREATE TABLE IF NOT EXISTS review_marks (
      owner TEXT NOT NULL, lesson_id TEXT NOT NULL, need_version TEXT NOT NULL, last_reviewed_at TEXT NOT NULL,
      PRIMARY KEY(owner, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS practice_records (
      owner TEXT NOT NULL, lesson_id TEXT NOT NULL, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL,
      content_json TEXT NOT NULL, checked_by TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY(owner,lesson_id,activity_id)
    );
    CREATE TABLE IF NOT EXISTS room_preferences (
      owner TEXT PRIMARY KEY, placed_json TEXT NOT NULL DEFAULT '[]', revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
  function all(sql, values = []) {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(values);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally { stmt.free(); }
  }
  const get = (sql, values = []) => all(sql, values)[0];
  const run = (sql, values = []) => db.run(sql, values);
  function persist() {
    if (!filename) return;
    fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    fs.writeFileSync(`${filename}.tmp`, Buffer.from(db.export()), { mode: 0o600 });
    fs.renameSync(`${filename}.tmp`, filename);
  }
  function transaction(work) {
    db.run('BEGIN');
    let result;
    try { result = work(); db.run('COMMIT'); }
    catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
    return result;
  }
  persist();
  return { get, all, run, transaction, close: () => { persist(); db.close(); } };
}
