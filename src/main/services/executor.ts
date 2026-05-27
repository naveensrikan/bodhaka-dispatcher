import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { app, Notification } from 'electron';
import { getDb } from '../db/database';
import { callLLM } from './llm';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
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
}

function log(ctx: RunContext, msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  ctx.logs.push(line);
  console.log(`[run ${ctx.runId.slice(0, 8)}] ${msg}`);
  broadcastRunUpdate({ runId: ctx.runId, type: 'log', message: line });
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
      let rows: { content: string }[];
      if (docIds.length === 0) {
        rows = db.prepare('SELECT content FROM knowledge_chunks LIMIT 50').all() as { content: string }[];
      } else {
        const placeholders = docIds.map(() => '?').join(',');
        rows = db.prepare(
          `SELECT content FROM knowledge_chunks WHERE doc_id IN (${placeholders}) ORDER BY doc_id, chunk_index`
        ).all(...docIds) as { content: string }[];
      }
      const text = rows.map((r) => r.content).join('\n\n');
      log(ctx, `  loaded ${rows.length} chunks (${text.length} chars)`);
      return text;
    }

    case 'webSearch': {
      const query = node.data.query || inputText || '';
      if (!query.trim()) return '(no search query)';
      log(ctx, `  searching: ${query.slice(0, 80)}`);
      return await withRetry(() => searchWeb(query), 2, ctx, 'web search');
    }

    case 'llmPrompt': {
      const prompt = (node.data.prompt || 'Summarize the input.').replaceAll('{{input}}', inputText)
        .replaceAll('{{memory}}', JSON.stringify(ctx.memory));
      const result = await withRetry(() => callLLM({
        system: node.data.system || 'You are a helpful assistant for a student.',
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
        system: 'You are an expert at clear summarization.',
        messages: [{ role: 'user', content: `Summarize the following in ${node.data.style || 'bullet points'}:\n\n${inputText}` }],
        maxTokens: 800,
      }), 3, ctx, 'LLM call');
      ctx.totalCost += result.costEstimate || 0;
      return result.content;
    }

    case 'generateQuiz': {
      const n = node.data.numQuestions || 5;
      const result = await withRetry(() => callLLM({
        system: 'You generate clear, well-structured study quizzes.',
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
      // Save current input to agent's memory under a key
      const key = node.data.key || 'last';
      ctx.memory[key] = inputText;
      saveMemory(ctx.agentId, ctx.memory);
      log(ctx, `  saved to memory: ${key}`);
      return inputText;
    }

    case 'sendEmail': {
      const to = node.data.to;
      const subject = node.data.subject || 'From your Student Agent';
      if (!to) throw new Error('Email recipient is empty');
      const result = await withRetry(() => sendEmail(to, subject, inputText), 2, ctx, 'email send');
      log(ctx, `  email sent to ${to}`);
      return { sent: true, to, subject, messageId: result.messageId };
    }

    case 'sendWhatsApp': {
      const to = node.data.to;
      if (!to) throw new Error('WhatsApp recipient is empty');
      const result = await sendWhatsApp(to, inputText);
      if (!result.sent) throw new Error(result.error || 'WhatsApp send failed');
      log(ctx, `  WhatsApp sent to ${to}`);
      return result;
    }

    case 'saveToFile': {
      const filename = (node.data.filename || `output-${Date.now()}.txt`).replace(/[<>:"/\\|?*]/g, '_');
      const outDir = path.join(app.getPath('documents'), 'Student Agent Builder');
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
  const ctx: RunContext = {
    runId,
    agentId,
    agentName: agent.name,
    outputs: {},
    logs: [],
    skipped: new Set(),
    totalCost: 0,
    memory: loadMemory(agentId),
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
