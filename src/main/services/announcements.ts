import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Remote announcements shown on the Dashboard.
 *
 * Source of truth is a JSON file you control:
 *   https://bodhaka.org/bodhaka-forge/announcements.json
 *
 * To add an announcement: add an entry to the "announcements" array.
 * To remove one: delete its entry. The app mirrors the file exactly, so on the
 * next sync the removed entry disappears for everyone.
 *
 * Expected JSON shape:
 * {
 *   "announcements": [
 *     { "id": "2026-05-28-1", "date": "2026-05-28", "text": "Welcome! **New** templates added." }
 *   ]
 * }
 *
 * "text" supports light markdown (bold, italics, links) since the renderer
 * already uses a markdown component.
 */

const ANNOUNCEMENTS_URL = 'https://bodhaka.org/bodhaka-forge/announcements.json';

export interface Announcement {
  id: string;
  date?: string;
  text: string;
}

function cacheFile(): string {
  return path.join(app.getPath('userData'), 'announcements-cache.json');
}

function readCache(): Announcement[] {
  try {
    const raw = fs.readFileSync(cacheFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(items: Announcement[]) {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify(items));
  } catch { /* ignore cache write failures */ }
}

function normalize(data: any): Announcement[] {
  const arr = data && Array.isArray(data.announcements) ? data.announcements : [];
  return arr
    .filter((a: any) => a && typeof a.text === 'string' && a.text.trim().length > 0)
    .map((a: any, i: number) => ({
      id: String(a.id ?? i),
      date: typeof a.date === 'string' ? a.date : undefined,
      text: String(a.text),
    }));
}

/**
 * Fetch announcements from the remote file. On success, updates the cache and
 * returns fresh data. On failure (offline, server down), returns the last cached
 * data so the card is never blank for a returning user.
 *
 * Returns { items, fromCache, fetchedAt }.
 */
export async function getAnnouncements(): Promise<{ items: Announcement[]; fromCache: boolean; fetchedAt: number | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // do not hang the UI
    const res = await fetch(ANNOUNCEMENTS_URL, {
      signal: controller.signal,
      // cache-bust so edits show promptly
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = normalize(data);
    writeCache(items);
    return { items, fromCache: false, fetchedAt: Date.now() };
  } catch {
    // Offline or fetch failed — fall back to cache
    return { items: readCache(), fromCache: true, fetchedAt: null };
  }
}
