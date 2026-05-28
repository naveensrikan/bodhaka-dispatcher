import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { app, Notification } from 'electron';
import { getDb } from '../db/database';
import { callLLM } from './llm';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
import { sendTemplatedWhatsApp } from './whatsappProvisioning';
import { searchWeb } from './search';
import { broadcastRunUpdate } from '../ipc/execution';

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

interface AgentDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface RunContext {
  runId: string;
  agentId: string;
  agentName: string;
  outputs: Record<string, any>;
  logs: string[];
  skipped: Set<string>;
  totalCost: number;
  memory: Record<string, any>;
  interests: string[];
}

function log(ctx: RunContext, msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  ctx.logs.push(line);
  console.log(`[run ${ctx.runId.slice(0, 8)}] ${msg}`);
  broadcastRunUpdate({ runId: ctx.runId, type: 'log', message: line });
}

/**
 * If the student listed hobbies/interests in their profile, return a short
 * instruction so the model can relate examples and analogies to those interests.
 * Returns an empty string when no interests are set, so default behaviour is unchanged.
 */
function interestsHint(ctx: RunContext): string {
  if (!ctx.interests || ctx.interests.length === 0) return '';
  const list = ctx.interests.join(', ');
  return ` When it helps understanding, relate examples, analogies, or scenarios to the student's interests (${list}), but only where it fits naturally. Do not force it.`;
}

/**
 * Replace memory tokens in a prompt.
 *  {{memory.someKey}} → just that key's saved value (or empty if missing)
 *  {{memory}}         → all saved memory as a readable list (backward compatible)
 */
function applyMemoryTokens(text: string, memory: Record<string, any>): string {
  // First handle specific keys: {{memory.key}}
  let out = text.replace(/\{\{memory\.([a-zA-Z0-9_]+)\}\}/g, (_m, key) => {
    const val = memory[key];
    if (val === undefined || val === null) return '';
    return typeof val === 'string' ? val : JSON.stringify(val);
  });
  // Then the catch-all {{memory}} → readable "key: value" lines
  if (out.includes('{{memory}}')) {
    const all = Object.entries(memory)
      .filter(([k]) => k !== '__order')
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n');
    out = out.replaceAll('{{memory}}', all);
  }
  return out;
}

function topologicalOrder(def: AgentDefinition): FlowNode[] {
  const nodeMap = new Map(def.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, Set<string>>();
  for (const n of def.nodes) incoming.set(n.id, new Set());
  for (const e of def.edges) incoming.get(e.target)?.add(e.source);

  const order: FlowNode[] = [];
  const visited = new Set<string>();
  const queue = def.nodes.filter((n) => incoming.get(n.id)!.size === 0).map((n) => n.id);

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeMap.get(id);
    if (node) order.push(node);
    for (const e of def.edges.filter((e) => e.source === id)) {
      const deps = incoming.get(e.target)!;
      if (Array.from(deps).every((d) => visited.has(d))) queue.push(e.target);
    }
  }
  return order;
}

function getUpstreamOutputs(node: FlowNode, def: AgentDefinition, ctx: RunContext): any[] {
  return def.edges
    .filter((e) => e.target === node.id)
    .filter((e) => !ctx.skipped.has(e.source))
    .map((e) => ctx.outputs[e.source])
    .filter((v) => v !== undefined);
}

function loadMemory(agentId: string): Record<string, any> {
  const db = getDb();
  const row = db.prepare('SELECT value FROM agent_memory WHERE agent_id = ?').get(agentId) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : {};
}

function saveMemory(agentId: string, memory: Record<string, any>) {
  const db = getDb();
  const exists = db.prepare('SELECT agent_id FROM agent_memory WHERE agent_id = ?').get(agentId);
  if (exists) {
    db.prepare('UPDATE agent_memory SET value = ?, updated_at = ? WHERE agent_id = ?')
      .run(JSON.stringify(memory), Date.now(), agentId);
  } else {
    db.prepare('INSERT INTO agent_memory (agent_id, value, updated_at) VALUES (?, ?, ?)')
      .run(agentId, JSON.stringify(memory), Date.now());
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number, ctx: RunContext, label: string): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err: any) {
      lastErr = err;
      if (i < attempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 8000);
        log(ctx, `  ${label} failed: ${err.message}. Retrying in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function executeNode(node: FlowNode, def: AgentDefinition, ctx: RunContext): Promise<any> {
  const incoming = def.edges.filter((e) => e.target === node.id);
  if (incoming.length > 0 && incoming.every((e) => ctx.skipped.has(e.source))) {
    ctx.skipped.add(node.id);
    return undefined;
  }

  const inputs = getUpstreamOutputs(node, def, ctx);
  let inputText = inputs.map((i) => (typeof i === 'string' ? i : JSON.stringify(i, null, 2))).join('\n\n');

  // Handle conditional inputs
  const conditionalInput = inputs.find((i) => i && typeof i === 'object' && i.__conditional);
  if (conditionalInput) {
    if (!conditionalInput.matches) {
      ctx.skipped.add(node.id);
      log(ctx, `Skipping ${node.data.label || node.type} (condition was false)`);
      return undefined;
    }
    inputText = conditionalInput.value;
  }

  log(ctx, `→ ${node.data.label || node.type}`);

  switch (node.type) {
    case 'manualTrigger':
    case 'scheduleTrigger':
      return { triggered: true, at: new Date().toISOString() };

    case 'userInput':
      return node.data.value || '';

    case 'knowledgeBase': {
      const db = getDb();
      const docIds: string[] = node.data.docIds || [];
      const topic: string = (node.data.topic || '').trim();
      const fullSummary: boolean = node.data.fullSummary !== false; // default true

      // If a topic is specified and not in full-summary mode, do semantic retrieval
      if (topic && !fullSummary) {
        const { embedTexts, cosineSimilarity, keywordScore } = require('./knowledge');
        const [queryEmb] = await embedTexts([topic]);
        let sql = `SELECT c.content, c.embedding FROM knowledge_chunks c`;
        const params: any[] = [];
        if (docIds.length > 0) {
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
            score = keywordScore(topic, row.content);
          }
          return { content: row.content, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, node.data.topK || 8);
        const text = top.map((r) => r.content).join('\n\n');
        log(ctx, `  retrieved ${top.length} chunks on topic "${topic}"`);
        return text;
      }

      // Full summary mode: load all chunks from selected docs
      let rows: { content: string }[];
      if (docIds.length === 0) {
        rows = db.prepare('SELECT content FROM knowledge_chunks LIMIT 100').all() as { content: string }[];
      } else {
        const placeholders = docIds.map(() => '?').join(',');
        rows = db.prepare(
          `SELECT content FROM knowledge_chunks WHERE doc_id IN (${placeholders}) ORDER BY doc_id, chunk_index`
        ).all(...docIds) as { content: string }[];
      }
      const text = rows.map((r) => r.content).join('\n\n');
      log(ctx, `  loaded ${rows.length} chunks (full)`);
      return text;
    }

    case 'webSearch': {
      const query = node.data.query || inputText || '';
      if (!query.trim()) return '(no search query)';
      log(ctx, `  searching: ${query.slice(0, 80)}`);
      return await withRetry(() => searchWeb(query), 2, ctx, 'web search');
    }

    case 'llmPrompt': {
      const prompt = applyMemoryTokens(
        (node.data.prompt || 'Summarize the input.').replaceAll('{{input}}', inputText),
        ctx.memory,
      );
      const baseSystem = node.data.system || 'You are a helpful assistant for a student.';
      const result = await withRetry(() => callLLM({
        system: baseSystem + interestsHint(ctx),
        messages: [{ role: 'user', content: prompt }],
        maxTokens: node.data.maxTokens || 1024,
        temperature: node.data.temperature ?? 0.7,
      }), 3, ctx, 'LLM call');
      ctx.totalCost += result.costEstimate || 0;
      log(ctx, `  ${result.usage?.inputTokens ?? '?'}→${result.usage?.outputTokens ?? '?'} tokens · $${(result.costEstimate || 0).toFixed(4)}`);
      return result.content;
    }

    case 'summarize': {
      const result = await withRetry(() => callLLM({
        system: 'You are an expert at clear summarization.' + interestsHint(ctx),
        messages: [{ role: 'user', content: `Summarize the following in ${node.data.style || 'bullet points'}:\n\n${inputText}` }],
        maxTokens: 800,
      }), 3, ctx, 'LLM call');
      ctx.totalCost += result.costEstimate || 0;
      return result.content;
    }

    case 'generateQuiz': {
      const n = node.data.numQuestions || 5;
      const result = await withRetry(() => callLLM({
        system: 'You generate clear, well-structured study quizzes.' + interestsHint(ctx),
        messages: [{ role: 'user', content: `Generate ${n} quiz questions (with answers at the end) from this material:\n\n${inputText}` }],
        maxTokens: 1500,
      }), 3, ctx, 'LLM call');
      ctx.totalCost += result.costEstimate || 0;
      return result.content;
    }

    case 'ifElse': {
      const condition = (node.data.condition || '').toLowerCase().trim();
      const text = inputText.toLowerCase();
      const matches = condition && text.includes(condition);
      log(ctx, `  condition "${condition}" → ${matches ? 'TRUE' : 'FALSE'}`);
      return { __conditional: true, matches, value: inputText };
    }

    case 'delay': {
      const seconds = Math.max(0, Math.min(node.data.seconds || 5, 300));
      log(ctx, `  waiting ${seconds}s...`);
      await new Promise((r) => setTimeout(r, seconds * 1000));
      return inputText;
    }

    case 'rememberThis': {
      // Save current input to agent's memory under a key, capping at 10 entries.
      const key = node.data.key || 'last';
      const MAX_MEMORIES = 10;

      ctx.memory[key] = inputText;

      // Maintain insertion order in a hidden bookkeeping array
      const order: string[] = Array.isArray(ctx.memory.__order) ? ctx.memory.__order : [];
      const without = order.filter((k) => k !== key);
      without.push(key); // most recent at the end

      // Evict oldest keys beyond the cap
      while (without.length > MAX_MEMORIES) {
        const oldest = without.shift();
        if (oldest && oldest !== key) delete ctx.memory[oldest];
      }
      ctx.memory.__order = without;

      saveMemory(ctx.agentId, ctx.memory);
      log(ctx, `  saved to memory: ${key} (${without.length}/${MAX_MEMORIES} kept)`);
      return inputText;
    }

    case 'sendEmail': {
      const db = getDb();
      const contactRow = db.prepare('SELECT value FROM config WHERE key = ?').get('contact') as { value: string } | undefined;
      const contact = contactRow ? JSON.parse(contactRow.value) : {};
      const to = contact.email;  // always the user's verified email
      const subject = node.data.subject || 'From your Bodhaka Forge agent';
      if (!to) throw new Error('No verified email in Settings. Add and verify your email first.');
      const { renderEmailHtml } = require('./emailRender');
      const html = await renderEmailHtml(inputText, subject);
      const result = await withRetry(() => sendEmail(to, subject, html, true), 2, ctx, 'email send');
      log(ctx, `  email sent to ${to}`);
      return { sent: true, to, subject, messageId: result.messageId };
    }

    case 'sendWhatsApp': {
      const db = getDb();
      const contactRow = db.prepare('SELECT value FROM config WHERE key = ?').get('contact') as { value: string } | undefined;
      const contact = contactRow ? JSON.parse(contactRow.value) : {};
      const to = contact.whatsapp;  // always the user's own number
      if (!to) throw new Error('No WhatsApp number in Settings. Add your number first.');
      const templateName = node.data.templateName;

      if (templateName) {
        // Build template variables from the node's variable map (set in the
        // WhatsApp node settings). One variable is the AI output; the rest are
        // fixed values the user typed. This guarantees the right number of
        // variables with the right content, so Twilio accepts the message.
        const varMap = (node.data.varMap && typeof node.data.varMap === 'object')
          ? node.data.varMap as Record<string, { mode: 'ai' | 'fixed'; value?: string }>
          : null;

        let variables: Record<string, string> = {};
        if (varMap && Object.keys(varMap).length > 0) {
          for (const [num, conf] of Object.entries(varMap)) {
            variables[num] = conf.mode === 'ai' ? inputText : (conf.value || '');
          }
        } else {
          // Backward compatibility: no map set — put AI output in {{1}}.
          variables = { '1': inputText };
        }
        const result = await sendTemplatedWhatsApp(templateName, to, variables);
        if (!result.sent) throw new Error(result.error || 'WhatsApp send failed');
        log(ctx, `  WhatsApp template "${templateName}" sent to ${to}`);
        return result;
      } else {
        const result = await sendWhatsApp(to, inputText);
        if (!result.sent) throw new Error(result.error || 'WhatsApp send failed');
        log(ctx, `  WhatsApp (freeform) sent to ${to}`);
        return result;
      }
    }

    case 'saveToFile': {
      const filename = (node.data.filename || `output-${Date.now()}.txt`).replace(/[<>:"/\\|?*]/g, '_');
      const outDir = path.join(app.getPath('documents'), 'Bodhaka Forge');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const filepath = path.join(outDir, filename);
      fs.writeFileSync(filepath, inputText, 'utf-8');
      log(ctx, `  wrote ${filepath}`);
      return { saved: true, path: filepath };
    }

    case 'displayResult':
    case 'output':
      return inputText;

    default:
      log(ctx, `  unknown node type ${node.type}, passing through`);
      return inputText;
  }
}

export async function executeAgent(agentId: string): Promise<{ runId: string; status: string; error?: string }> {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any;
  if (!agent) throw new Error('Agent not found');

  const def: AgentDefinition = JSON.parse(agent.definition);
  const runId = randomUUID();

  // Load the student's hobbies/interests so generated content can relate to them
  let interests: string[] = [];
  try {
    const profileRow = db.prepare('SELECT value FROM config WHERE key = ?').get('profile') as { value: string } | undefined;
    if (profileRow) {
      const profile = JSON.parse(profileRow.value);
      if (Array.isArray(profile.interests)) interests = profile.interests.filter((i: any) => typeof i === 'string' && i.trim());
    }
  } catch { /* no interests */ }

  const ctx: RunContext = {
    runId,
    agentId,
    agentName: agent.name,
    outputs: {},
    logs: [],
    skipped: new Set(),
    totalCost: 0,
    memory: loadMemory(agentId),
    interests,
  };

  db.prepare(`INSERT INTO agent_runs (id, agent_id, status, started_at) VALUES (?, ?, ?, ?)`)
    .run(runId, agentId, 'running', Date.now());

  broadcastRunUpdate({ runId, agentId, type: 'start' });

  try {
    const order = topologicalOrder(def);
    log(ctx, `Starting "${agent.name}" — ${order.length} nodes`);

    let lastOutput: any = null;
    for (const node of order) {
      const output = await executeNode(node, def, ctx);
      ctx.outputs[node.id] = output;
      if (output !== undefined) lastOutput = output;
      broadcastRunUpdate({ runId, type: 'node', nodeId: node.id });
    }

    log(ctx, `✓ Completed · total cost $${ctx.totalCost.toFixed(4)}`);
    db.prepare(`UPDATE agent_runs SET status = ?, finished_at = ?, logs = ?, output = ?, cost = ? WHERE id = ?`)
      .run('success', Date.now(), JSON.stringify(ctx.logs), JSON.stringify(lastOutput), ctx.totalCost, runId);

    // Native Windows notification
    try {
      new Notification({
        title: 'Agent completed',
        body: `"${agent.name}" finished successfully.`,
        silent: false,
      }).show();
    } catch {}

    broadcastRunUpdate({ runId, type: 'complete', status: 'success' });
    return { runId, status: 'success' };
  } catch (err: any) {
    log(ctx, `✗ Failed: ${err.message}`);
    try { require('./logger').logger.error(`agent "${agent.name}" (${agentId}) failed: ${err?.stack || err.message}`); } catch {}
    db.prepare(`UPDATE agent_runs SET status = ?, finished_at = ?, logs = ?, error = ?, cost = ? WHERE id = ?`)
      .run('failed', Date.now(), JSON.stringify(ctx.logs), err.message, ctx.totalCost, runId);

    try {
      new Notification({
        title: 'Agent failed',
        body: `"${agent.name}": ${err.message.slice(0, 100)}`,
        silent: false,
      }).show();
    } catch {}

    broadcastRunUpdate({ runId, type: 'complete', status: 'failed', error: err.message });
    return { runId, status: 'failed', error: err.message };
  }
}
