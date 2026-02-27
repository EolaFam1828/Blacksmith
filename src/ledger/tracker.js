import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { loadConfig } from "../utils/config.js";

let cachedDb;

const createSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      command TEXT NOT NULL,
      backend TEXT NOT NULL,
      model TEXT NOT NULL,
      workflow TEXT,
      department TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      success INTEGER NOT NULL,
      escalated INTEGER DEFAULT 0,
      session_id TEXT,
      project TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_summary (
      date TEXT PRIMARY KEY,
      total_tokens INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      calls_by_backend TEXT,
      calls_by_workflow TEXT,
      calls_by_department TEXT
    );
  `);

  const columns = db.prepare(`PRAGMA table_info(ledger_entries)`).all().map((row) => row.name);
  const ensureColumn = (name, definition) => {
    if (!columns.includes(name)) {
      db.exec(`ALTER TABLE ledger_entries ADD COLUMN ${name} ${definition}`);
    }
  };

  ensureColumn("escalated", "INTEGER DEFAULT 0");
  ensureColumn("session_id", "TEXT");
  ensureColumn("project", "TEXT");
};

export const getLedgerDb = async () => {
  if (cachedDb) {
    return cachedDb;
  }

  const config = await loadConfig();
  const dbPath = config.ledger?.db_path;
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  cachedDb = new Database(dbPath);
  createSchema(cachedDb);
  return cachedDb;
};

export const logLedgerEntry = async (entry) => {
  const db = await getLedgerDb();
  const statement = db.prepare(`
    INSERT INTO ledger_entries (
      created_at, command, backend, model, workflow, department,
      prompt_tokens, completion_tokens, estimated_cost, duration_ms, success, escalated, session_id, project, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.run(
    entry.created_at,
    entry.command,
    entry.backend,
    entry.model,
    entry.workflow || null,
    entry.department || null,
    entry.prompt_tokens || 0,
    entry.completion_tokens || 0,
    entry.estimated_cost || 0,
    entry.duration_ms || 0,
    entry.success ? 1 : 0,
    entry.escalated ? 1 : 0,
    entry.session_id || null,
    entry.project || null,
    JSON.stringify(entry.metadata || {})
  );

  await updateDailySummary(db, entry);
};

const updateDailySummary = async (db, entry) => {
  const date = entry.created_at.slice(0, 10);
  const existing = db
    .prepare(`SELECT * FROM daily_summary WHERE date = ?`)
    .get(date);

  const base = existing || {
    total_tokens: 0,
    total_cost: 0,
    calls_by_backend: "{}",
    calls_by_workflow: "{}",
    calls_by_department: "{}"
  };

  const bump = (raw, key) => {
    const parsed = JSON.parse(raw || "{}");
    parsed[key] = (parsed[key] || 0) + 1;
    return JSON.stringify(parsed);
  };

  const values = {
    total_tokens: Number(base.total_tokens || 0) + Number(entry.prompt_tokens || 0) + Number(entry.completion_tokens || 0),
    total_cost: Number(base.total_cost || 0) + Number(entry.estimated_cost || 0),
    calls_by_backend: bump(base.calls_by_backend, entry.backend),
    calls_by_workflow: bump(base.calls_by_workflow, entry.workflow || "unknown"),
    calls_by_department: bump(base.calls_by_department, entry.department || "unknown")
  };

  db.prepare(`
    INSERT INTO daily_summary (date, total_tokens, total_cost, calls_by_backend, calls_by_workflow, calls_by_department)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_tokens = excluded.total_tokens,
      total_cost = excluded.total_cost,
      calls_by_backend = excluded.calls_by_backend,
      calls_by_workflow = excluded.calls_by_workflow,
      calls_by_department = excluded.calls_by_department
  `).run(
    date,
    values.total_tokens,
    values.total_cost,
    values.calls_by_backend,
    values.calls_by_workflow,
    values.calls_by_department
  );
};
