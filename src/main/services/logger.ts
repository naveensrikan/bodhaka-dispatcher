import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Simple file logger. Writes to <userData>/logs/main.log.
 * Captures startup, errors, and crash/hang diagnostics so problems in the
 * packaged app (where there is no console) can be inspected after the fact.
 */

let logFilePath: string | null = null;

function ensureLogFile(): string {
  if (logFilePath) return logFilePath;
  const dir = path.join(app.getPath('userData'), 'logs');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
  logFilePath = path.join(dir, 'main.log');
  return logFilePath;
}

export function getLogDir(): string {
  return path.join(app.getPath('userData'), 'logs');
}

function write(level: string, msg: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  try {
    fs.appendFileSync(ensureLogFile(), line);
  } catch { /* never let logging crash the app */ }
  // Also echo to console for dev
  if (level === 'ERROR') console.error(line.trim());
  else console.log(line.trim());
}

export const logger = {
  info: (msg: string) => write('INFO', msg),
  warn: (msg: string) => write('WARN', msg),
  error: (msg: string) => write('ERROR', msg),
};

/**
 * Rotate the log if it gets large (keep it from growing without bound).
 */
function rotateIfLarge() {
  try {
    const p = ensureLogFile();
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.size > 2 * 1024 * 1024) { // 2 MB
        const bak = p.replace(/\.log$/, '.prev.log');
        try { fs.unlinkSync(bak); } catch { /* ignore */ }
        fs.renameSync(p, bak);
      }
    }
  } catch { /* ignore */ }
}

/**
 * Install global handlers that record crashes and hangs.
 * Call once at app startup, and pass the main window once created.
 */
export function installCrashDiagnostics(getWindow: () => Electron.BrowserWindow | null) {
  rotateIfLarge();
  logger.info(`=== Bodhaka Forge starting (v${app.getVersion()}, ${process.platform}, electron ${process.versions.electron}) ===`);

  process.on('uncaughtException', (err) => {
    logger.error(`uncaughtException: ${err?.stack || err}`);
  });
  process.on('unhandledRejection', (reason: any) => {
    logger.error(`unhandledRejection: ${reason?.stack || reason}`);
  });

  app.on('child-process-gone', (_e, details) => {
    logger.error(`child-process-gone: type=${details.type} reason=${details.reason} exitCode=${details.exitCode}`);
  });

  app.on('render-process-gone', (_e, _wc, details) => {
    logger.error(`render-process-gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  // Hook window-specific events once the window exists
  const tryHookWindow = () => {
    const win = getWindow();
    if (!win) { setTimeout(tryHookWindow, 1000); return; }

    win.on('unresponsive', () => {
      logger.error('window UNRESPONSIVE (hang detected) — the renderer stopped responding');
    });
    win.on('responsive', () => {
      logger.info('window responsive again (recovered from hang)');
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      logger.error(`renderer gone: reason=${details.reason} exitCode=${details.exitCode}`);
    });
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      // Capture renderer console errors/warnings into the file log
      if (level >= 2) { // 2=warning, 3=error
        logger.error(`renderer console: ${message} (${sourceId}:${line})`);
      }
    });
    win.webContents.on('preload-error', (_e, preloadPath, error) => {
      logger.error(`preload-error in ${preloadPath}: ${error?.stack || error}`);
    });
  };
  tryHookWindow();
}
