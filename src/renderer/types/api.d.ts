export interface ConfigShape {
  profile: { name: string; grade: string; interests: string[]; ownershipConfirmed?: boolean };
  contact: {
    email: string; whatsapp: string;
    emailVerified?: boolean; emailLocked?: boolean;
    phoneChangeCount?: number; phoneLocked?: boolean;
  };
  llm: { provider: 'openai' | 'anthropic' | 'gemini' | 'ollama'; apiKey: string; model: string; ollamaUrl?: string };
  smtp: { host: string; port: number; user: string; pass: string; from: string };
  twilio: { accountSid: string; authToken: string; from: string };
  search: { tavilyKey: string; braveKey: string };
  ui: { theme: 'light' | 'dark'; onboardingDone: boolean };
  scheduling?: {
    launchOnStartup: boolean;
    minimizeToTray: boolean;
    catchUpMode: 'auto' | 'ask';
    missedPolicy: 'recent' | 'all' | 'skip';
  };
  verified?: {
    llm?: boolean;
    smtp?: boolean;
    twilio?: boolean;
  };
  currency?: { code: string; symbol: string; rateFromUsd: number };
  pricing?: Record<string, [number, number]>;
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

export interface WhatsAppTemplateState {
  name: string;
  displayName: string;
  description: string;
  category: string;
  contentSid: string | null;
  approvalStatus: 'not_provisioned' | 'received' | 'pending' | 'approved' | 'rejected' | 'unsubmitted';
  rejectionReason: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  builtin?: boolean;
}

export interface ProvisionResult {
  provisioned?: number;
  skipped?: number;
  failed?: { name: string; error: string }[];
  states?: WhatsAppTemplateState[];
  error?: string;
}

declare global {
  interface Window {
    api: {
      config: {
        get: () => Promise<ConfigShape>;
        update: (updates: Partial<ConfigShape>) => Promise<{ success: boolean }>;
        sendEmailOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
        verifyEmailOtp: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
        unlockEmail: () => Promise<{ ok: boolean }>;
      };
      agents: {
        list: () => Promise<Agent[]>;
        get: (id: string) => Promise<Agent | null>;
        save: (agent: Partial<Agent>) => Promise<{ id: string }>;
        delete: (id: string) => Promise<{ success: boolean }>;
        duplicate: (id: string) => Promise<{ id: string }>;
        runNow: (id: string) => Promise<{ runId: string; status: string; error?: string }>;
        memoryKeys: (id: string) => Promise<string[]>;
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
      whatsapp: {
        listTemplates: () => Promise<WhatsAppTemplateState[] | { error: string }>;
        provisionTemplates: () => Promise<ProvisionResult>;
        provisionOne: (name: string) => Promise<{ ok: boolean; state?: WhatsAppTemplateState; error?: string }>;
        refreshStatus: () => Promise<WhatsAppTemplateState[] | { error: string }>;
        saveCustom: (spec: any) => Promise<{ ok: boolean; error?: string }>;
        listCustom: () => Promise<any[]>;
        deleteCustom: (name: string) => Promise<{ ok: boolean; error?: string }>;
        syncFromTwilio: () => Promise<{ matchedBuiltin: number; matchedCustom: number; importedCustom: number; total: number; importedNames: string[]; error?: string }>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
        forceQuit: () => Promise<void>;
        openLogs: () => Promise<string>;
      };
      catchup: {
        find: () => Promise<any[]>;
        run: (agentId: string) => Promise<{ runId: string; status: string; error?: string }>;
        onMissed: (callback: (data: any) => void) => () => void;
      };
      update: {
        check: () => Promise<{ ok: boolean; version?: string | null; error?: string }>;
        download: () => Promise<{ ok: boolean; error?: string }>;
        onAvailable: (cb: (info: { version: string; releaseDate?: string; notes?: string }) => void) => () => void;
        onProgress: (cb: (pct: number) => void) => () => void;
        onDownloaded: (cb: () => void) => () => void;
        onNone: (cb: () => void) => () => void;
        onError: (cb: (msg: string) => void) => () => void;
      };
      execution: {
        onRunUpdate: (callback: (data: any) => void) => () => void;
      };
    };
  }
}

export {};
