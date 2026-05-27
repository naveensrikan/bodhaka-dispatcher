import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDatabase } from './db/database';
import { registerConfigHandlers } from './ipc/config';
import { registerAgentHandlers } from './ipc/agents';
import { registerLLMHandlers } from './ipc/llm';
import { registerKnowledgeHandlers } from './ipc/knowledge';
import { registerExecutionHandlers } from './ipc/execution';
import { registerDialogHandlers } from './ipc/dialog';
import { registerTemplateHandlers } from './ipc/templates';
import { startScheduler } from './services/scheduler';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f3f3f3',
    title: 'Student Agent Builder',
    autoHideMenuBar: true,
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
  try {
    await initDatabase();
    registerConfigHandlers();
    registerAgentHandlers();
    registerLLMHandlers();
    registerKnowledgeHandlers();
    registerExecutionHandlers();
    registerDialogHandlers();
    registerTemplateHandlers();
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
