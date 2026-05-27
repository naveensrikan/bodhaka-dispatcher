import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { getDb } from '../db/database';

// Lazy require to avoid load issues with pdf-parse
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

/**
 * Split text into overlapping chunks for embedding.
 * Default ~1000 chars per chunk with 200 char overlap.
 */
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
 * Embed an array of texts using the user's configured LLM provider.
 * Falls back to no embedding (returns nulls) if no embedding model is available.
 */
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('llm') as { value: string } | undefined;
  if (!row) return texts.map(() => null);
  const cfg = JSON.parse(row.value) as { provider: string; apiKey: string };

  // Only OpenAI exposes embeddings in v1. For Anthropic users, we still store
  // chunks but skip embedding and fall back to keyword search.
  if (cfg.provider !== 'openai' || !cfg.apiKey) return texts.map(() => null);

  const client = new OpenAI({ apiKey: cfg.apiKey });
  const out: (number[] | null)[] = [];
  // Batch in groups of 100
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const res = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });
    for (const item of res.data) out.push(item.embedding);
  }
  return out;
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
