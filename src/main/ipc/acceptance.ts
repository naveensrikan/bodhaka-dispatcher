import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ACCEPTANCE_FILE = 'acceptance.json';

interface Acceptance {
  accepted: boolean;
  acceptedAt: string;          // ISO timestamp
  acceptedDate: string;        // YYYY-MM-DD for easy reading
  acceptedTime: string;        // HH:mm:ss
  appVersion: string;
  hostname: string;            // local machine hostname (not personal data)
  platform: string;
}

function getAcceptancePath(): string {
  // App's user data folder (AppData/Roaming/Bodhaka Dispatcher on Windows)
  return path.join(app.getPath('userData'), ACCEPTANCE_FILE);
}

export function registerAcceptanceHandlers() {
  ipcMain.handle('acceptance:get', () => {
    const p = getAcceptancePath();
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as Acceptance;
    } catch {
      return null;
    }
  });

  ipcMain.handle('acceptance:accept', () => {
    const now = new Date();
    const record: Acceptance = {
      accepted: true,
      acceptedAt: now.toISOString(),
      acceptedDate: now.toISOString().split('T')[0],
      acceptedTime: now.toTimeString().split(' ')[0],
      appVersion: app.getVersion(),
      hostname: os.hostname(),
      platform: process.platform,
    };
    const p = getAcceptancePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(record, null, 2), 'utf-8');
    console.log('[acceptance] recorded at', p);
    return record;
  });

  // For owner-only inspection: get the path to the acceptance file
  ipcMain.handle('acceptance:getPath', () => getAcceptancePath());
}
