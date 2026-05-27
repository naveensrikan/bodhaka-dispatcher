import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/database';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface ChatParams {
  provider?: Provider;
  apiKey?: string;
  model?: string;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  provider: Provider;
  usage?: { inputTokens?: number; outputTokens?: number };
  costEstimate?: number;
}

const MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
  ],
  gemini: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'],
  ollama: ['llama3.2', 'llama3.1', 'qwen2.5', 'mistral', 'phi3'],
};

// Approximate token costs per 1K tokens (input, output) for cost tracking
const PRICING: Record<string, [number, number]> = {
  'gpt-4o': [0.0025, 0.01],
  'gpt-4o-mini': [0.00015, 0.0006],
  'gpt-4-turbo': [0.01, 0.03],
  'gpt-3.5-turbo': [0.0005, 0.0015],
  'claude-opus-4-7': [0.015, 0.075],
  'claude-sonnet-4-6': [0.003, 0.015],
  'claude-haiku-4-5-20251001': [0.0008, 0.004],
  'claude-3-5-sonnet-latest': [0.003, 0.015],
  'claude-3-5-haiku-latest': [0.0008, 0.004],
  'gemini-1.5-pro-latest': [0.00125, 0.005],
  'gemini-1.5-flash-latest': [0.000075, 0.0003],
};

export function listProviderModels(provider: string): string[] {
  return MODELS[provider as Provider] || [];
}

function estimateCost(model: string, inTok: number, outTok: number): number {
  const price = PRICING[model];
  if (!price) return 0;
  return (inTok / 1000) * price[0] + (outTok / 1000) * price[1];
}

function loadLLMConfig() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('llm') as { value: string } | undefined;
  if (!row) throw new Error('LLM config not set');
  return JSON.parse(row.value) as { provider: Provider; apiKey: string; model: string; ollamaUrl?: string };
}

export async function testProviderKey(provider: string, apiKey: string, ollamaUrl?: string): Promise<void> {
  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    await client.models.list();
  } else if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    });
  } else if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) throw new Error(`Gemini API error: HTTP ${res.status}`);
  } else if (provider === 'ollama') {
    const url = ollamaUrl || 'http://localhost:11434';
    const res = await fetch(`${url}/api/tags`);
    if (!res.ok) throw new Error(`Could not reach Ollama at ${url}. Is it running?`);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function callLLM(params: ChatParams): Promise<ChatResult> {
  const cfg = loadLLMConfig();
  const provider = params.provider || cfg.provider;
  const apiKey = params.apiKey || cfg.apiKey;
  const model = params.model || cfg.model;

  if (provider === 'openai') {
    if (!apiKey) throw new Error('No OpenAI API key configured.');
    const client = new OpenAI({ apiKey });
    const messages: any[] = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    for (const m of params.messages) messages.push(m);

    const res = await client.chat.completions.create({
      model, messages,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
    });
    const inTok = res.usage?.prompt_tokens || 0;
    const outTok = res.usage?.completion_tokens || 0;
    return {
      content: res.choices[0]?.message?.content || '',
      model, provider: 'openai',
      usage: { inputTokens: inTok, outputTokens: outTok },
      costEstimate: estimateCost(model, inTok, outTok),
    };
  }

  if (provider === 'anthropic') {
    if (!apiKey) throw new Error('No Anthropic API key configured.');
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model, max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      system: params.system, messages: params.messages,
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text).join('\n');
    return {
      content: text, model, provider: 'anthropic',
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
      costEstimate: estimateCost(model, res.usage.input_tokens, res.usage.output_tokens),
    };
  }

  if (provider === 'gemini') {
    if (!apiKey) throw new Error('No Gemini API key configured.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents: any[] = [];
    if (params.system) contents.push({ role: 'user', parts: [{ text: 'System: ' + params.system }] });
    for (const m of params.messages) {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens || 1024,
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    const usage = data.usageMetadata || {};
    return {
      content: text, model, provider: 'gemini',
      usage: { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount },
      costEstimate: estimateCost(model, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0),
    };
  }

  if (provider === 'ollama') {
    const url = cfg.ollamaUrl || 'http://localhost:11434';
    const messages: any[] = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    for (const m of params.messages) messages.push(m);
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, messages, stream: false,
        options: { temperature: params.temperature ?? 0.7, num_predict: params.maxTokens || 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return {
      content: data.message?.content || '',
      model, provider: 'ollama',
      usage: { inputTokens: data.prompt_eval_count, outputTokens: data.eval_count },
      costEstimate: 0,
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
