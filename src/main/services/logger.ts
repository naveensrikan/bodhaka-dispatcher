import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Bulletproof file logger. Writes to <userData>/logs/main.log.
 * Designed to NEVER throw and NEVER lose the ability to log:
 *  - Falls back to a temp dir if userData is unavailable (e.g. called too early).
 *  - Creates the directory on every write attempt (cheap, survives deletion).
 *  - Swallows all I/O errors so logging can never crash the app.
 */

let logDirCached: string | null = null;

function resolveLogDir(): string {
  // Try the proper userData path first
  try {
    if (app && app.getPath) {
      const dir = path.join(app.getPath('userData'), 'logs');
      return dir;
    }
  } catch { /* app not ready yet */ }
  // Fallback: a stable temp location so we never lose logging entirely
  try {
    return path.join(os.tmpdir(), 'bodhaka-forge', 'logs');
  } catch {
    return path.join('.', 'logs');
  }
}

function ensureLogDir(): string {
  const dir = resolveLogDir();
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
  logDirCached = dir;
  return dir;
}

function logFile(): string {
  return path.join(ensureLogDir(), 'main.log');
}

/**
 * Returns the directory where logs are stored. Always returns a usable path,
 * creating it if needed, so the "Open logs folder" button never fails.
 */
export function getLogDir(): string {
  return ensureLogDir();
}

function write(level: string, msg: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile(), line);
  } catch {
    // Last-resort: try once more after forcing the dir, then give up silently.
    try { ensureLogDir(); fs.appendFileSync(logFile(), line); } catch { /* never crash */ }
  }
  // Also echo to console for dev
  try {
    if (level === 'ERROR') console.error(line.trim());
    else console.log(line.trim());
  } catch { /* ignore */ }
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
    const p = logFile();
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
  logger.info(`log file location: ${logFile()}`);

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
