export interface ConfigShape {
  profile: { name: string; grade: string; interests: string[] };
  contact: { email: string; whatsapp: string };
  llm: { provider: 'openai' | 'anthropic' | 'gemini' | 'ollama'; apiKey: string; model: string; ollamaUrl?: string };
  smtp: { host: string; port: number; user: string; pass: string; from: string };
  twilio: { accountSid: string; authToken: string; from: string };
  search: { tavilyKey: string; braveKey: string };
  ui: { theme: 'light' | 'dark'; onboardingDone: boolean };
  verified?: {
    llm?: boolean;
    smtp?: boolean;
    twilio?: boolean;
  };
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
  agent_name?: string;
  status: 'running' | 'success' | 'failed';
  started_at: number;
  finished_at: number | null;
  logs: string | null;
  output: string | null;
  error: string | null;
  cost: number;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  schedule: string | null;
}

export interface Stats {
  totalCost: number;
  last7Days: { cost: number; runs: number };
}

export interface AcceptanceRecord {
  accepted: boolean;
  acceptedAt: string;
  acceptedDate: string;
  acceptedTime: string;
  appVersion: string;
  hostname: string;
  platform: string;
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
        duplicate: (id: string) => Promise<{ id: string }>;
        runNow: (id: string) => Promise<{ runId: string; status: string; error?: string }>;
        getRuns: (id: string) => Promise<AgentRun[]>;
        getAllRuns: () => Promise<AgentRun[]>;
        export: (id: string) => Promise<{ exported: boolean; path?: string }>;
        import: () => Promise<{ imported: boolean; id?: string }>;
        stats: () => Promise<Stats>;
      };
      llm: {
        listModels: (provider: string) => Promise<string[]>;
        testKey: (provider: string, apiKey: string, ollamaUrl?: string) => Promise<{ success: boolean; error?: string }>;
        chat: (params: any) => Promise<any>;
      };
      smtp: { test: () => Promise<{ success: boolean; error?: string }> };
      twilio: { test: (accountSid: string, authToken: string) => Promise<{ ok: boolean; error?: string }> };
      knowledge: {
        upload: (filePaths: string[]) => Promise<any[]>;
        list: () => Promise<any[]>;
        delete: (id: string) => Promise<{ success: boolean }>;
        search: (query: string, topK?: number) => Promise<any[]>;
      };
      dialog: { openFiles: (options?: any) => Promise<string[]> };
      templates: {
        list: () => Promise<TemplateInfo[]>;
        create: (templateId: string) => Promise<{ id: string }>;
      };
      acceptance: {
        get: () => Promise<AcceptanceRecord | null>;
        accept: () => Promise<AcceptanceRecord>;
        getPath: () => Promise<string>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      execution: {
        onRunUpdate: (callback: (data: any) => void) => () => void;
      };
    };
  }
}

export {};
