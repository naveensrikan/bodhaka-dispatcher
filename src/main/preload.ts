import { contextBridge, ipcRenderer } from 'electron';

const api = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:update', updates),
  },
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
    get: (id: string) => ipcRenderer.invoke('agents:get', id),
    save: (agent: unknown) => ipcRenderer.invoke('agents:save', agent),
    delete: (id: string) => ipcRenderer.invoke('agents:delete', id),
    duplicate: (id: string) => ipcRenderer.invoke('agents:duplicate', id),
    runNow: (id: string) => ipcRenderer.invoke('agents:runNow', id),
    getRuns: (id: string) => ipcRenderer.invoke('agents:getRuns', id),
    getAllRuns: () => ipcRenderer.invoke('agents:getAllRuns'),
    export: (id: string) => ipcRenderer.invoke('agents:export', id),
    import: () => ipcRenderer.invoke('agents:import'),
    stats: () => ipcRenderer.invoke('agents:stats'),
  },
  llm: {
    listModels: (provider: string) => ipcRenderer.invoke('llm:listModels', provider),
    testKey: (provider: string, apiKey: string, ollamaUrl?: string) =>
      ipcRenderer.invoke('llm:testKey', provider, apiKey, ollamaUrl),
    chat: (params: unknown) => ipcRenderer.invoke('llm:chat', params),
  },
  smtp: {
    test: () => ipcRenderer.invoke('smtp:test'),
  },
  twilio: {
    test: (accountSid: string, authToken: string) => ipcRenderer.invoke('twilio:test', accountSid, authToken),
  },
  knowledge: {
    upload: (filePaths: string[]) => ipcRenderer.invoke('knowledge:upload', filePaths),
    list: () => ipcRenderer.invoke('knowledge:list'),
    delete: (id: string) => ipcRenderer.invoke('knowledge:delete', id),
    search: (query: string, topK?: number) => ipcRenderer.invoke('knowledge:search', query, topK),
  },
  dialog: {
    openFiles: (options?: any) => ipcRenderer.invoke('dialog:openFiles', options),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    create: (templateId: string) => ipcRenderer.invoke('templates:create', templateId),
  },
  execution: {
    onRunUpdate: (callback: (data: unknown) => void) => {
      const listener = (_: unknown, data: unknown) => callback(data);
      ipcRenderer.on('execution:update', listener);
      return () => ipcRenderer.removeListener('execution:update', listener);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
