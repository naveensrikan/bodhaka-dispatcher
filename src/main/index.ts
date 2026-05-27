import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase } from './db/database';
import { registerConfigHandlers } from './ipc/config';
import { registerAgentHandlers } from './ipc/agents';
import { registerLLMHandlers } from './ipc/llm';
import { registerKnowledgeHandlers } from './ipc/knowledge';
import { registerExecutionHandlers } from './ipc/execution';
import { startScheduler } from './services/scheduler';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0905',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize SQLite database
  await initDatabase();

  // Register all IPC handlers
  registerConfigHandlers();
  registerAgentHandlers();
  registerLLMHandlers();
  registerKnowledgeHandlers();
  registerExecutionHandlers();

  // Start the cron scheduler for scheduled agents
  startScheduler();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
