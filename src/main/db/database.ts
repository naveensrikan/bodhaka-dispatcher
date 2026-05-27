import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export async function initDatabase() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });

  const dbPath = path.join(userDataPath, 'student-agent.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      definition TEXT NOT NULL,
      schedule TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      logs TEXT,
      output TEXT,
      error TEXT,
      cost REAL DEFAULT 0,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_memory (
      agent_id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      FOREIGN KEY (doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON knowledge_chunks(doc_id);
    CREATE INDEX IF NOT EXISTS idx_runs_agent ON agent_runs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_runs_started ON agent_runs(started_at DESC);
  `);

  // Backfill missing columns for upgrades
  const cols = db.prepare("PRAGMA table_info('agent_runs')").all() as any[];
  if (!cols.find((c) => c.name === 'cost')) {
    db.exec('ALTER TABLE agent_runs ADD COLUMN cost REAL DEFAULT 0');
  }

  // Seed defaults
  const seedDefaults: Record<string, unknown> = {
    profile: { name: '', grade: '', interests: [] },
    contact: { email: '', whatsapp: '' },
    llm: { provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4-6', ollamaUrl: 'http://localhost:11434' },
    smtp: { host: '', port: 587, user: '', pass: '', from: '' },
    twilio: { accountSid: '', authToken: '', from: '' },
    search: { tavilyKey: '', braveKey: '' },
    ui: { theme: 'light', onboardingDone: false },
  };

  const stmt = db.prepare('SELECT key FROM config WHERE key = ?');
  const insert = db.prepare('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)');
  const now = Date.now();
  for (const [key, value] of Object.entries(seedDefaults)) {
    if (!stmt.get(key)) insert.run(key, JSON.stringify(value), now);
  }

  console.log('[db] initialized at', dbPath);
}
