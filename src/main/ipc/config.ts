import { ipcMain } from 'electron';
import { getDb } from '../db/database';
import { sendEmailOtp, verifyEmailOtp, unlockEmail } from '../services/otp';
import { encryptConfigValue, decryptConfigValue, encryptionAvailable } from '../services/secrets';

export function registerConfigHandlers() {
  ipcMain.handle('config:get', () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[];
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.value);
      } catch {
        parsed = row.value;
      }
      // Decrypt any secret fields so the rest of the app sees plaintext
      result[row.key] = decryptConfigValue(row.key, parsed);
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
        // Encrypt secret fields before writing to disk
        const toStore = encryptConfigValue(key, value);
        stmt.run(key, JSON.stringify(toStore), now);
      }
    });
    tx(updates);
    return { success: true };
  });

  // Report whether OS-backed encryption is active (for an honest UI status)
  ipcMain.handle('config:encryptionStatus', () => {
    return { available: encryptionAvailable() };
  });

  // Email OTP
  ipcMain.handle('otp:sendEmail', async (_e, email: string) => await sendEmailOtp(email));
  ipcMain.handle('otp:verifyEmail', (_e, email: string, code: string) => verifyEmailOtp(email, code));
  ipcMain.handle('otp:unlockEmail', () => { unlockEmail(); return { ok: true }; });
}
