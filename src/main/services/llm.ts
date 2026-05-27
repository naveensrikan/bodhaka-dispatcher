import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/database';

export type Provider = 'openai' | 'anthropic';

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
};

export function listProviderModels(provider: string): string[] {
  return MODELS[provider as Provider] || [];
}

function loadLLMConfig() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('llm') as { value: string } | undefined;
  if (!row) throw new Error('LLM config not set');
  return JSON.parse(row.value) as { provider: Provider; apiKey: string; model: string };
}

export async function testProviderKey(provider: string, apiKey: string): Promise<void> {
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
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function callLLM(params: ChatParams): Promise<ChatResult> {
  const cfg = loadLLMConfig();
  const provider = params.provider || cfg.provider;
  const apiKey = params.apiKey || cfg.apiKey;
  const model = params.model || cfg.model;

  if (!apiKey) throw new Error('No API key configured. Add one in Settings.');

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const messages: any[] = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    for (const m of params.messages) messages.push(m);

    const res = await client.chat.completions.create({
      model,
      messages,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
    });
    return {
      content: res.choices[0]?.message?.content || '',
      model,
      provider: 'openai',
      usage: {
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
      },
    };
  }

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      system: params.system,
      messages: params.messages,
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return {
      content: text,
      model,
      provider: 'anthropic',
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
