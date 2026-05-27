import { randomUUID } from 'crypto';
import { getDb } from '../db/database';
import { callLLM } from './llm';
import { sendEmail } from './email';
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
  outputs: Record<string, any>; // nodeId -> output value
  logs: string[];
}

function log(ctx: RunContext, msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  ctx.logs.push(line);
  console.log(`[run ${ctx.runId.slice(0, 8)}] ${msg}`);
  broadcastRunUpdate({ runId: ctx.runId, type: 'log', message: line });
}

/**
 * Build a topological order of nodes starting from trigger nodes.
 */
function topologicalOrder(def: AgentDefinition): FlowNode[] {
  const nodeMap = new Map(def.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, Set<string>>();
  for (const n of def.nodes) incoming.set(n.id, new Set());
  for (const e of def.edges) incoming.get(e.target)?.add(e.source);

  const order: FlowNode[] = [];
  const visited = new Set<string>();
  // Start with nodes that have no incoming edges (triggers)
  const queue = def.nodes.filter((n) => incoming.get(n.id)!.size === 0).map((n) => n.id);

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeMap.get(id);
    if (node) order.push(node);
    // Add downstream nodes whose dependencies are all visited
    for (const e of def.edges.filter((e) => e.source === id)) {
      const deps = incoming.get(e.target)!;
      if (Array.from(deps).every((d) => visited.has(d))) {
        queue.push(e.target);
      }
    }
  }
  return order;
}

function getUpstreamOutputs(node: FlowNode, def: AgentDefinition, ctx: RunContext): any[] {
  return def.edges
    .filter((e) => e.target === node.id)
    .map((e) => ctx.outputs[e.source])
    .filter((v) => v !== undefined);
}

async function executeNode(node: FlowNode, def: AgentDefinition, ctx: RunContext): Promise<any> {
  const inputs = getUpstreamOutputs(node, def, ctx);
  const inputText = inputs.map((i) => (typeof i === 'string' ? i : JSON.stringify(i))).join('\n\n');

  log(ctx, `Executing ${node.type}: ${node.data.label || node.id}`);

  switch (node.type) {
    case 'trigger':
    case 'manualTrigger':
    case 'scheduleTrigger':
      return { triggered: true, at: Date.now() };

    case 'userInput':
      return node.data.value || '';

    case 'knowledgeBase': {
      // Pull text from selected knowledge documents
      const db = getDb();
      const docIds: string[] = node.data.docIds || [];
      if (docIds.length === 0) {
        const rows = db.prepare('SELECT content FROM knowledge_chunks LIMIT 50').all() as { content: string }[];
        return rows.map((r) => r.content).join('\n\n');
      }
      const placeholders = docIds.map(() => '?').join(',');
      const rows = db.prepare(
        `SELECT content FROM knowledge_chunks WHERE doc_id IN (${placeholders}) ORDER BY doc_id, chunk_index`
      ).all(...docIds) as { content: string }[];
      return rows.map((r) => r.content).join('\n\n');
    }

    case 'webSearch': {
      // Stub: in production, plug in a real search API (Brave, Serper, Tavily)
      const query = node.data.query || inputText;
      log(ctx, `[stub] Would search web for: ${query}`);
      return `(Web search results for "${query}" would appear here. Wire up a search API in src/main/services/search.ts.)`;
    }

    case 'llmPrompt': {
      const prompt = (node.data.prompt || 'Summarize the input.').replace('{{input}}', inputText);
      const result = await callLLM({
        system: node.data.system || 'You are a helpful assistant for a student.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: node.data.maxTokens || 1024,
        temperature: node.data.temperature ?? 0.7,
      });
      log(ctx, `LLM used ${result.usage?.inputTokens || '?'} input / ${result.usage?.outputTokens || '?'} output tokens`);
      return result.content;
    }

    case 'summarize': {
      const result = await callLLM({
        system: 'You are an expert at concise, clear summarization.',
        messages: [{ role: 'user', content: `Summarize the following content in ${node.data.style || 'bullet points'}:\n\n${inputText}` }],
        maxTokens: 800,
      });
      return result.content;
    }

    case 'generateQuiz': {
      const n = node.data.numQuestions || 5;
      const result = await callLLM({
        system: 'You generate clear, well-structured study quizzes.',
        messages: [{ role: 'user', content: `Generate ${n} quiz questions (with answers at the end) from this material:\n\n${inputText}` }],
        maxTokens: 1500,
      });
      return result.content;
    }

    case 'sendEmail': {
      const to = node.data.to;
      const subject = node.data.subject || 'From your Student Agent';
      if (!to) throw new Error('Email recipient not configured');
      const result = await sendEmail(to, subject, inputText);
      log(ctx, `Email sent: ${result.messageId}`);
      return { sent: true, to, subject };
    }

    case 'sendWhatsApp': {
      // Stub: integrate Twilio or WhatsApp Cloud API
      log(ctx, `[stub] WhatsApp send to ${node.data.to}. Wire up Twilio in src/main/services/whatsapp.ts.`);
      return { sent: false, reason: 'whatsapp not implemented yet' };
    }

    case 'output':
    case 'displayResult':
      return inputText;

    default:
      log(ctx, `Unknown node type: ${node.type}, passing input through`);
      return inputText;
  }
}

export async function executeAgent(agentId: string): Promise<{ runId: string; status: string }> {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any;
  if (!agent) throw new Error('Agent not found');

  const def: AgentDefinition = JSON.parse(agent.definition);
  const runId = randomUUID();
  const ctx: RunContext = { runId, agentId, outputs: {}, logs: [] };

  db.prepare(`
    INSERT INTO agent_runs (id, agent_id, status, started_at) VALUES (?, ?, ?, ?)
  `).run(runId, agentId, 'running', Date.now());

  broadcastRunUpdate({ runId, agentId, type: 'start' });

  try {
    const order = topologicalOrder(def);
    log(ctx, `Starting agent "${agent.name}" with ${order.length} nodes`);

    let lastOutput: any = null;
    for (const node of order) {
      const output = await executeNode(node, def, ctx);
      ctx.outputs[node.id] = output;
      lastOutput = output;
      broadcastRunUpdate({ runId, type: 'node', nodeId: node.id, output });
    }

    log(ctx, 'Agent completed successfully');
    db.prepare(`
      UPDATE agent_runs SET status = ?, finished_at = ?, logs = ?, output = ? WHERE id = ?
    `).run('success', Date.now(), JSON.stringify(ctx.logs), JSON.stringify(lastOutput), runId);

    broadcastRunUpdate({ runId, type: 'complete', status: 'success' });
    return { runId, status: 'success' };
  } catch (err: any) {
    log(ctx, `ERROR: ${err.message}`);
    db.prepare(`
      UPDATE agent_runs SET status = ?, finished_at = ?, logs = ?, error = ? WHERE id = ?
    `).run('failed', Date.now(), JSON.stringify(ctx.logs), err.message, runId);
    broadcastRunUpdate({ runId, type: 'complete', status: 'failed', error: err.message });
    return { runId, status: 'failed' };
  }
}
