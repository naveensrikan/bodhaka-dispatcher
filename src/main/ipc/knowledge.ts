import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/database';
import { extractText, chunkText, embedTexts, cosineSimilarity, keywordScore } from '../services/knowledge';

export function registerKnowledgeHandlers() {
  ipcMain.handle('knowledge:upload', async (_event, filePaths: string[]) => {
    const db = getDb();
    const results = [];
    for (const filePath of filePaths) {
      try {
        const filename = path.basename(filePath);
        const stat = fs.statSync(filePath);
        const text = await extractText(filePath);
        const chunks = chunkText(text, 1000, 200);
        const docId = randomUUID();
        const now = Date.now();

        db.prepare(`INSERT INTO knowledge_docs (id, filename, file_path, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(docId, filename, filePath, path.extname(filename), stat.size, now);

        const embeddings = await embedTexts(chunks);
        const insertChunk = db.prepare(`INSERT INTO knowledge_chunks (id, doc_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?)`);
        const tx = db.transaction(() => {
          chunks.forEach((chunk, i) => {
            const emb = embeddings[i];
            const buf = emb ? Buffer.from(new Float32Array(emb).buffer) : null;
            insertChunk.run(randomUUID(), docId, i, chunk, buf);
          });
        });
        tx();
        results.push({ docId, filename, chunks: chunks.length });
      } catch (err: any) {
        results.push({ filename: path.basename(filePath), error: err.message });
      }
    }
    return results;
  });

  ipcMain.handle('knowledge:list', () => {
    const db = getDb();
    return db.prepare(`
      SELECT d.*, COUNT(c.id) as chunk_count
      FROM knowledge_docs d
      LEFT JOIN knowledge_chunks c ON c.doc_id = d.id
      GROUP BY d.id ORDER BY d.created_at DESC
    `).all();
  });

  ipcMain.handle('knowledge:delete', (_event, id: string) => {
    const db = getDb();
    db.prepare('DELETE FROM knowledge_docs WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('knowledge:search', async (_event, query: string, topK: number = 5, docIds?: string[]) => {
    const db = getDb();
    const [queryEmb] = await embedTexts([query]);

    let sql = `
      SELECT c.id, c.content, c.embedding, d.filename
      FROM knowledge_chunks c JOIN knowledge_docs d ON d.id = c.doc_id
    `;
    const params: any[] = [];
    if (docIds && docIds.length > 0) {
      sql += ` WHERE c.doc_id IN (${docIds.map(() => '?').join(',')})`;
      params.push(...docIds);
    }
    const rows = db.prepare(sql).all(...params) as any[];

    const scored = rows.map((row) => {
      let score = 0;
      if (queryEmb && row.embedding) {
        const emb = Array.from(new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4));
        score = cosineSimilarity(queryEmb, emb);
      } else {
        score = keywordScore(query, row.content);
      }
      return { ...row, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(({ embedding, ...rest }) => rest);
  });
}
