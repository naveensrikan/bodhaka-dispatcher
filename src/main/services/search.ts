import { getDb } from '../db/database';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Web search supporting three modes:
 * 1. Tavily API if user has provided a Tavily key (best quality, free tier 1000/mo)
 * 2. Brave Search if user has provided a Brave key
 * 3. Fallback to Anthropic's built-in web_search tool if using Claude
 */
export async function searchWeb(query: string, maxResults = 5): Promise<string> {
  const db = getDb();
  const searchRow = db.prepare('SELECT value FROM config WHERE key = ?').get('search') as { value: string } | undefined;
  const llmRow = db.prepare('SELECT value FROM config WHERE key = ?').get('llm') as { value: string } | undefined;

  const searchCfg = searchRow ? JSON.parse(searchRow.value) : {};
  const llmCfg = llmRow ? JSON.parse(llmRow.value) : {};

  // Try Tavily first
  if (searchCfg.tavilyKey) {
    try {
      return await tavilySearch(query, searchCfg.tavilyKey, maxResults);
    } catch (err: any) {
      console.error('Tavily failed, trying next:', err.message);
    }
  }

  // Try Brave
  if (searchCfg.braveKey) {
    try {
      return await braveSearch(query, searchCfg.braveKey, maxResults);
    } catch (err: any) {
      console.error('Brave failed, trying next:', err.message);
    }
  }

  // Fallback: Anthropic's built-in web search tool
  if (llmCfg.provider === 'anthropic' && llmCfg.apiKey) {
    try {
      return await anthropicWebSearch(query, llmCfg);
    } catch (err: any) {
      return `(Web search failed: ${err.message})`;
    }
  }

  return `(No search provider configured. Add a Tavily or Brave API key in Settings → Search.\nQuery: "${query}")`;
}

async function tavilySearch(query: string, apiKey: string, maxResults: number): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: maxResults,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const data: any = await res.json();
  const parts: string[] = [];
  if (data.answer) parts.push(`Quick answer: ${data.answer}\n`);
  parts.push('Sources:');
  for (const r of data.results || []) {
    parts.push(`- ${r.title}\n  ${r.url}\n  ${r.content?.slice(0, 250) || ''}\n`);
  }
  return parts.join('\n');
}

async function braveSearch(query: string, apiKey: string, maxResults: number): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data: any = await res.json();
  const results: SearchResult[] = (data.web?.results || []).slice(0, maxResults).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.description || '',
  }));
  return results.map((r) => `- ${r.title}\n  ${r.url}\n  ${r.snippet}`).join('\n\n');
}

async function anthropicWebSearch(query: string, cfg: any): Promise<string> {
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey: cfg.apiKey });
  const res = await client.messages.create({
    model: cfg.model || 'claude-3-5-sonnet-latest',
    max_tokens: 2048,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: `Search the web for: ${query}\n\nReturn a clear summary with source URLs.` }],
  });
  return res.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n') || '(no results)';
}
