export interface ConfigShape {
  profile: { name: string; grade: string; interests: string[] };
  contact: { email: string; whatsapp: string };
  llm: { provider: 'openai' | 'anthropic'; apiKey: string; model: string };
  smtp: { host: string; port: number; user: string; pass: string; from: string };
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  definition: { nodes: any[]; edges: any[] };
  schedule: string | null;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  status: 'running' | 'success' | 'failed';
  started_at: number;
  finished_at: number | null;
  logs: string | null;
  output: string | null;
  error: string | null;
}

declare global {
  interface Window {
    api: {
      config: {
        get: () => Promise<ConfigShape>;
        update: (updates: Partial<ConfigShape>) => Promise<{ success: boolean }>;
      };
      agents: {
        list: () => Promise<Agent[]>;
        get: (id: string) => Promise<Agent | null>;
        save: (agent: Partial<Agent>) => Promise<{ id: string }>;
        delete: (id: string) => Promise<{ success: boolean }>;
        runNow: (id: string) => Promise<{ runId: string; status: string }>;
        getRuns: (id: string) => Promise<AgentRun[]>;
      };
      llm: {
        listModels: (provider: string) => Promise<string[]>;
        testKey: (provider: string, apiKey: string) => Promise<{ success: boolean; error?: string }>;
        chat: (params: any) => Promise<any>;
      };
      knowledge: {
        upload: (filePaths: string[]) => Promise<any[]>;
        list: () => Promise<any[]>;
        delete: (id: string) => Promise<{ success: boolean }>;
        search: (query: string, topK?: number) => Promise<any[]>;
      };
      execution: {
        onRunUpdate: (callback: (data: any) => void) => () => void;
      };
    };
  }
}

export {};
