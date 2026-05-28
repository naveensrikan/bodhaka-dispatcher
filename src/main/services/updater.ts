import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

/**
 * Auto-update via GitHub Releases.
 *
 * Important design choices:
 *  - We ONLY check published GitHub *Releases*, never commits. So routine pushes
 *    to the branch do not trigger update prompts. An update appears only when a
 *    real Release (from a version tag) is published. This is the "final version"
 *    gate the product owner asked for.
 *  - autoDownload is OFF. We notify the user and only download+install when they
 *    click Update. Then it is fully automatic (download, then quit and install).
 */

let updateWindowRef: BrowserWindow | null = null;

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  updateWindowRef = mainWindow;

  autoUpdater.autoDownload = false;            // wait for explicit user click
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:none');
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update:error', String(err?.message || err));
  });

  autoUpdater.on('download-progress', (p) => {
    mainWindow.webContents.send('update:progress', Math.round(p.percent));
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded');
    // Install immediately (full auto). isSilent=false shows the installer,
    // isForceRunAfter=true relaunches the app afterwards.
    autoUpdater.quitAndInstall(false, true);
  });

  // Register IPC the renderer uses
  ipcMain.handle('update:check', async () => {
    try {
      // In dev, electron-updater throws because there's no real installer.
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, version: result?.updateInfo?.version || null };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  // Quietly check once on startup (only finds published releases)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* offline or dev; ignore */ });
  }, 8000);
}
