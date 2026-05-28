import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, powerMonitor, Notification, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDb } from './db/database';
import { registerConfigHandlers } from './ipc/config';
import { registerAgentHandlers } from './ipc/agents';
import { registerLLMHandlers } from './ipc/llm';
import { registerKnowledgeHandlers } from './ipc/knowledge';
import { registerExecutionHandlers } from './ipc/execution';
import { registerDialogHandlers } from './ipc/dialog';
import { registerTemplateHandlers } from './ipc/templates';
import { registerAcceptanceHandlers } from './ipc/acceptance';
import { registerWhatsAppHandlers } from './ipc/whatsapp';
import { startScheduler } from './services/scheduler';
import { findMissedRuns, runMissed } from './services/catchup';
import { setupAutoUpdater } from './services/updater';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let quitConfirmed = false;

function getSchedulingPrefs() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get('scheduling') as { value: string } | undefined;
    return row ? JSON.parse(row.value) : { launchOnStartup: false, minimizeToTray: true, catchUpMode: 'ask', missedPolicy: 'recent' };
  } catch {
    return { launchOnStartup: false, minimizeToTray: true, catchUpMode: 'ask', missedPolicy: 'recent' };
  }
}

function migrateLegacyData() {
  try {
    const newDir = app.getPath('userData');
    const newDbPath = path.join(newDir, 'student-agent.db');
    if (fs.existsSync(newDbPath)) return;
    const legacyDir = path.join(path.dirname(newDir), 'Student Agent Builder');
    const legacyDb = path.join(legacyDir, 'student-agent.db');
    if (!fs.existsSync(legacyDb)) return;
    fs.mkdirSync(newDir, { recursive: true });
    for (const f of ['student-agent.db', 'student-agent.db-wal', 'student-agent.db-shm']) {
      const src = path.join(legacyDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(newDir, f));
    }
  } catch (err) {
    console.error('[migrate] failed (non-fatal):', err);
  }
}

function iconPath() {
  return path.join(__dirname, '..', '..', 'resources', 'icon.ico');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f4f5f9',
    title: 'Bodhaka Forge',
    icon: iconPath(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    // If launched at startup (hidden), don't pop the window
    const launchedHidden = process.argv.includes('--hidden');
    if (!launchedHidden) mainWindow?.show();
  });

  // Window close behaviour:
  //  - If minimize-to-tray is on and this isn't an explicit Quit, just hide.
  //  - Otherwise it's a real quit via the window X: confirm first.
  mainWindow.on('close', (e) => {
    const prefs = getSchedulingPrefs();

    // Already confirmed (e.g. via tray Quit) — allow close
    if (quitConfirmed) return;

    // Just hiding to tray — no confirmation needed
    if (prefs.minimizeToTray) {
      e.preventDefault();
      mainWindow?.hide();
      return;
    }

    // Real quit via the window X — confirm first
    e.preventDefault();
    if (confirmQuit()) {
      quitConfirmed = true;
      isQuitting = true;
      app.quit();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

/** Show the "are you sure" dialog. Returns true if the user chose to close. */
function confirmQuit(): boolean {
  const win = mainWindow || BrowserWindow.getAllWindows()[0];
  const opts = {
    type: 'question' as const,
    buttons: ['Cancel', 'Close anyway'],
    defaultId: 0,
    cancelId: 0,
    title: 'Close Bodhaka Forge?',
    message: 'Are you sure you want to close Bodhaka Forge?',
    detail: 'Any unsaved changes (an open canvas or settings you have not saved) will be lost. Scheduled agents will not run while the app is fully closed.',
  };
  const choice = win ? dialog.showMessageBoxSync(win, opts) : dialog.showMessageBoxSync(opts);
  return choice === 1;
}

function createTray() {
  if (tray) return;
  let img = nativeImage.createFromPath(iconPath());
  if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('Bodhaka Forge');

  const menu = Menu.buildFromTemplate([
    { label: 'Open Bodhaka Forge', click: () => { if (mainWindow) { mainWindow.show(); } else createWindow(); } },
    { label: 'Run due agents now', click: async () => { await doCatchUp(true); } },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      if (confirmQuit()) {
        quitConfirmed = true;
        isQuitting = true;
        app.quit();
      }
    } },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
}

function applyLaunchOnStartup() {
  const prefs = getSchedulingPrefs();
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: !!prefs.launchOnStartup,
      args: ['--hidden'],
    });
  }
}

/**
 * Run the catch-up flow. If `force` is true (manual "Run due now"), always runs
 * using the missedPolicy. Otherwise respects catchUpMode (auto vs ask).
 */
async function doCatchUp(force = false) {
  try {
    const prefs = getSchedulingPrefs();
    const missed = findMissedRuns();
    if (missed.length === 0) {
      if (force) {
        new Notification({ title: 'Bodhaka Forge', body: 'No agents are due right now.' }).show();
      }
      return;
    }

    if (force || prefs.catchUpMode === 'auto') {
      const ran = await runMissed(missed, prefs.missedPolicy === 'skip' && force ? 'recent' : prefs.missedPolicy);
      if (ran > 0) {
        new Notification({ title: 'Bodhaka Forge', body: `Ran ${ran} catch-up agent${ran > 1 ? 's' : ''} that were missed while your PC was off.` }).show();
      }
    } else {
      // Ask mode: notify and let the renderer show the review UI
      const total = missed.reduce((s, m) => s + m.missedCount, 0);
      new Notification({
        title: 'Missed scheduled agents',
        body: `${missed.length} agent${missed.length > 1 ? 's' : ''} (${total} run${total > 1 ? 's' : ''}) were missed while your PC was off. Open Bodhaka Forge to review.`,
      }).show();
      // Push to renderer if open
      mainWindow?.webContents.send('catchup:missed', missed);
    }
  } catch (err) {
    console.error('[catchup] error:', err);
  }
}

// Single instance lock so startup + manual launch don't double-run
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });

  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('Bodhaka Forge');

    try {
      migrateLegacyData();
      await initDatabase();
      registerConfigHandlers();
      registerAgentHandlers();
      registerLLMHandlers();
      registerKnowledgeHandlers();
      registerExecutionHandlers();
      registerDialogHandlers();
      registerTemplateHandlers();
      registerAcceptanceHandlers();
      registerWhatsAppHandlers();

      ipcMain.handle('shell:openExternal', (_e, url: string) => {
        if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
          return shell.openExternal(url);
        }
      });

      // Catch-up IPC for the renderer review UI
      ipcMain.handle('catchup:find', () => findMissedRuns());
      ipcMain.handle('catchup:run', async (_e, agentId: string) => {
        const { executeAgent } = require('./services/executor');
        return await executeAgent(agentId);
      });

      applyLaunchOnStartup();
      startScheduler();

      // Catch up on missed runs shortly after launch
      setTimeout(() => { doCatchUp(false); }, 4000);

      // Also catch up when the PC wakes from sleep
      powerMonitor.on('resume', () => { setTimeout(() => doCatchUp(false), 3000); });
    } catch (err) {
      console.error('Init failed:', err);
    }

    createWindow();
    createTray();
    if (mainWindow && !isDev) setupAutoUpdater(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('before-quit', () => { isQuitting = true; });

app.on('window-all-closed', () => {
  // Don't quit on window close — we live in the tray. Only quit explicitly.
  const prefs = getSchedulingPrefs();
  if (!prefs.minimizeToTray && process.platform !== 'darwin') app.quit();
});
