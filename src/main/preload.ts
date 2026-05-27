import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, typed API to the renderer
const api = {
  // Configuration
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:update', updates),
  },

  // Agents (workflow definitions)
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
    get: (id: string) => ipcRenderer.invoke('agents:get', id),
    save: (agent: unknown) => ipcRenderer.invoke('agents:save', agent),
    delete: (id: string) => ipcRenderer.invoke('agents:delete', id),
    runNow: (id: string) => ipcRenderer.invoke('agents:runNow', id),
    getRuns: (id: string) => ipcRenderer.invoke('agents:getRuns', id),
  },

  // LLM
  llm: {
    listModels: (provider: string) => ipcRenderer.invoke('llm:listModels', provider),
    testKey: (provider: string, apiKey: string) =>
      ipcRenderer.invoke('llm:testKey', provider, apiKey),
    chat: (params: unknown) => ipcRenderer.invoke('llm:chat', params),
  },

  // Knowledge base
  knowledge: {
    upload: (filePaths: string[]) => ipcRenderer.invoke('knowledge:upload', filePaths),
    list: () => ipcRenderer.invoke('knowledge:list'),
    delete: (id: string) => ipcRenderer.invoke('knowledge:delete', id),
    search: (query: string, topK?: number) => ipcRenderer.invoke('knowledge:search', query, topK),
  },

  // Execution
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
