import { ipcMain } from 'electron';
import { getDb } from '../db/database';

export function registerConfigHandlers() {
  ipcMain.handle('config:get', () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[];
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  });

  ipcMain.handle('config:update', (_event, updates: Record<string, unknown>) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    const now = Date.now();
    const tx = db.transaction((updatesToApply: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(updatesToApply)) {
        stmt.run(key, JSON.stringify(value), now);
      }
    });
    tx(updates);
    return { success: true };
  });
}
