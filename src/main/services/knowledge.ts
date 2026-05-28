import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import OpenAI from 'openai';
import { getDb } from '../db/database';

async function extractPdf(filePath: string): Promise<string> {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractDocx(filePath: string): Promise<string> {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return await extractPdf(filePath);
  if (ext === '.docx') return await extractDocx(filePath);
  if (['.txt', '.md', '.json'].includes(ext)) return fs.readFileSync(filePath, 'utf-8');
  throw new Error(`Unsupported file type: ${ext}`);
}

export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= chunkSize) return [cleaned];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = end - overlap;
  }
  return chunks;
}

/**
 * Local embedding model via Transformers.js (all-MiniLM-L6-v2, 384-dim).
 * Lazily loaded and cached. Model weights (~25MB) download once on first use
 * and are cached in the app's userData folder so it works offline afterward.
 */
let localEmbedder: any = null;
let localEmbedderLoading: Promise<any> | null = null;

async function getLocalEmbedder(): Promise<any> {
  if (localEmbedder) return localEmbedder;
  if (localEmbedderLoading) return localEmbedderLoading;

  localEmbedderLoading = (async () => {
    try {
      const { pipeline, env } = await import('@xenova/transformers');
      // Cache models inside the app's userData so they persist
      env.cacheDir = path.join(app.getPath('userData'), 'models');
      env.allowRemoteModels = true;
      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      localEmbedder = embedder;
      console.log('[knowledge] local embedder ready');
      return embedder;
    } catch (err) {
      console.error('[knowledge] local embedder failed to load:', err);
      return null;
    }
  })();

  return localEmbedderLoading;
}

/**
 * Embed texts. Strategy:
 * 1. If OpenAI key present → use OpenAI embeddings (best quality)
 * 2. Else → use local Transformers.js model (works for all providers, offline)
 * 3. If both fail → return nulls (search falls back to keyword matching)
 */
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('llm') as { value: string } | undefined;
  const cfg = row ? JSON.parse(row.value) : {};

  // Path 1: OpenAI embeddings
  if (cfg.provider === 'openai' && cfg.apiKey) {
    try {
      const client = new OpenAI({ apiKey: cfg.apiKey });
      const out: (number[] | null)[] = [];
      for (let i = 0; i < texts.length; i += 100) {
        const batch = texts.slice(i, i + 100);
        const res = await client.embeddings.create({ model: 'text-embedding-3-small', input: batch });
        for (const item of res.data) out.push(item.embedding);
      }
      return out;
    } catch (err) {
      console.error('[knowledge] OpenAI embeddings failed, falling back to local:', err);
    }
  }

  // Path 2: Local embeddings (works regardless of provider)
  const embedder = await getLocalEmbedder();
  if (embedder) {
    try {
      const out: (number[] | null)[] = [];
      for (const text of texts) {
        const result = await embedder(text, { pooling: 'mean', normalize: true });
        out.push(Array.from(result.data as Float32Array));
      }
      return out;
    } catch (err) {
      console.error('[knowledge] local embedding failed:', err);
    }
  }

  // Path 3: no embeddings
  return texts.map(() => null);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

/** Simple keyword score fallback when no embeddings exist */
export function keywordScore(query: string, content: string): number {
  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const lc = content.toLowerCase();
  let hits = 0;
  for (const w of qWords) if (lc.includes(w)) hits++;
  return qWords.length ? hits / qWords.length : 0;
}
