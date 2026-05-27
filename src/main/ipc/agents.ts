import { ipcMain, dialog, BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/database';
import { executeAgent } from '../services/executor';
import { scheduleAgent, unscheduleAgent } from '../services/scheduler';

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

  ipcMain.handle('agents:save', (_event, agent: any) => {
    const db = getDb();
    const now = Date.now();
    const id = agent.id || randomUUID();
    const enabled = agent.enabled !== false ? 1 : 0;
    const existing = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);

    if (existing) {
      db.prepare(`UPDATE agents SET name = ?, description = ?, definition = ?, schedule = ?, enabled = ?, updated_at = ? WHERE id = ?`)
        .run(agent.name, agent.description || '', JSON.stringify(agent.definition), agent.schedule || null, enabled, now, id);
    } else {
      db.prepare(`INSERT INTO agents (id, name, description, definition, schedule, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, agent.name, agent.description || '', JSON.stringify(agent.definition), agent.schedule || null, enabled, now, now);
    }

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

  ipcMain.handle('agents:duplicate', (_event, id: string) => {
    const db = getDb();
    const original = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!original) throw new Error('Agent not found');
    const newId = randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO agents (id, name, description, definition, schedule, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(newId, `${original.name} (copy)`, original.description, original.definition, original.schedule, 0, now, now);
    return { id: newId };
  });

  ipcMain.handle('agents:runNow', async (_event, id: string) => await executeAgent(id));

  ipcMain.handle('agents:getRuns', (_event, id: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM agent_runs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 100').all(id);
  });

  ipcMain.handle('agents:getAllRuns', () => {
    const db = getDb();
    return db.prepare(`
      SELECT r.*, a.name as agent_name FROM agent_runs r
      LEFT JOIN agents a ON a.id = r.agent_id
      ORDER BY r.started_at DESC LIMIT 200
    `).all();
  });

  ipcMain.handle('agents:export', async (event, id: string) => {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!agent) throw new Error('Agent not found');
    const exportData = {
      version: 1,
      name: agent.name,
      description: agent.description,
      definition: JSON.parse(agent.definition),
      schedule: agent.schedule,
    };
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export agent',
      defaultPath: `${agent.name.replace(/[<>:"/\\|?*]/g, '_')}.agent.json`,
      filters: [{ name: 'Agent JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { exported: false };
    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
    return { exported: true, path: result.filePath };
  });

  ipcMain.handle('agents:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import agent',
      properties: ['openFile'],
      filters: [{ name: 'Agent JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { imported: false };
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
    if (!data.definition || !data.name) throw new Error('Invalid agent file');
    const db = getDb();
    const id = randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO agents (id, name, description, definition, schedule, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, data.name, data.description || '', JSON.stringify(data.definition), data.schedule || null, 0, now, now);
    return { imported: true, id };
  });

  ipcMain.handle('agents:stats', () => {
    const db = getDb();
    const totalCost = db.prepare('SELECT SUM(cost) as total FROM agent_runs').get() as any;
    const last7Days = db.prepare('SELECT SUM(cost) as total, COUNT(*) as runs FROM agent_runs WHERE started_at > ?')
      .get(Date.now() - 7 * 24 * 60 * 60 * 1000) as any;
    return {
      totalCost: totalCost?.total || 0,
      last7Days: { cost: last7Days?.total || 0, runs: last7Days?.runs || 0 },
    };
  });
}
