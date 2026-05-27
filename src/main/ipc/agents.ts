import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database';
import { executeAgent } from '../services/executor';
import { scheduleAgent, unscheduleAgent } from '../services/scheduler';

interface AgentPayload {
  id?: string;
  name: string;
  description?: string;
  definition: unknown; // React Flow nodes + edges
  schedule?: string; // cron expression
  enabled?: boolean;
}

export function registerAgentHandlers() {
  ipcMain.handle('agents:list', () => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM agents ORDER BY updated_at DESC').all() as any[];
    return rows.map((row) => ({
      ...row,
      definition: JSON.parse(row.definition),
      enabled: !!row.enabled,
    }));
  });

  ipcMain.handle('agents:get', (_event, id: string) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!row) return null;
    return { ...row, definition: JSON.parse(row.definition), enabled: !!row.enabled };
  });

  ipcMain.handle('agents:save', (_event, agent: AgentPayload) => {
    const db = getDb();
    const now = Date.now();
    const id = agent.id || randomUUID();
    const enabled = agent.enabled !== false ? 1 : 0;

    const existing = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);

    if (existing) {
      db.prepare(`
        UPDATE agents SET name = ?, description = ?, definition = ?, schedule = ?, enabled = ?, updated_at = ?
        WHERE id = ?
      `).run(agent.name, agent.description || '', JSON.stringify(agent.definition), agent.schedule || null, enabled, now, id);
    } else {
      db.prepare(`
        INSERT INTO agents (id, name, description, definition, schedule, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, agent.name, agent.description || '', JSON.stringify(agent.definition), agent.schedule || null, enabled, now, now);
    }

    // Re-schedule
    unscheduleAgent(id);
    if (enabled && agent.schedule) scheduleAgent(id, agent.schedule);

    return { id };
  });

  ipcMain.handle('agents:delete', (_event, id: string) => {
    const db = getDb();
    unscheduleAgent(id);
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('agents:runNow', async (_event, id: string) => {
    return await executeAgent(id);
  });

  ipcMain.handle('agents:getRuns', (_event, id: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM agent_runs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 50').all(id);
  });
}
