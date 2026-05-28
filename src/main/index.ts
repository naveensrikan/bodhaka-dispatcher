import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database';
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

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

/**
 * Migrate data from the previous "Student Agent Builder" install if present.
 * Runs only once — if Bodhaka Forge data already exists, skip.
 */
function migrateLegacyData() {
  try {
    const newDir = app.getPath('userData');
    const newDbPath = path.join(newDir, 'student-agent.db');
    if (fs.existsSync(newDbPath)) return;  // already have data, skip

    const legacyDir = path.join(path.dirname(newDir), 'Student Agent Builder');
    const legacyDb = path.join(legacyDir, 'student-agent.db');
    if (!fs.existsSync(legacyDb)) return;

    console.log('[migrate] copying data from legacy install...');
    fs.mkdirSync(newDir, { recursive: true });
    // Copy db, wal, shm files
    for (const f of ['student-agent.db', 'student-agent.db-wal', 'student-agent.db-shm']) {
      const src = path.join(legacyDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(newDir, f));
    }
    console.log('[migrate] done');
  } catch (err) {
    console.error('[migrate] failed (non-fatal):', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f4f5f9',
    title: 'Bodhaka Forge',
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links in default browser, never inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // Set the App User Model ID so Windows notifications show "Bodhaka Forge"
  // instead of "electron.app.Bodhaka Forge"
  if (process.platform === 'win32') {
    app.setAppUserModelId('Bodhaka Forge');
  }

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

    // Expose shell.openExternal for renderer
    ipcMain.handle('shell:openExternal', (_e, url: string) => {
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        return shell.openExternal(url);
      }
    });

    startScheduler();
  } catch (err) {
    console.error('Init failed:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
