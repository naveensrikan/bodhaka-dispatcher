import { ipcMain, BrowserWindow } from 'electron';

export function registerExecutionHandlers() {
  // Currently a placeholder — the executor pushes to all windows directly.
  // Could be used for renderer to subscribe to specific run IDs.
}

export function broadcastRunUpdate(payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('execution:update', payload);
  }
}
