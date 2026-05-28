import { contextBridge, ipcRenderer } from 'electron';

const api = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:update', updates),
    sendEmailOtp: (email: string) => ipcRenderer.invoke('otp:sendEmail', email),
    verifyEmailOtp: (email: string, code: string) => ipcRenderer.invoke('otp:verifyEmail', email, code),
    unlockEmail: () => ipcRenderer.invoke('otp:unlockEmail'),
  },
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
    get: (id: string) => ipcRenderer.invoke('agents:get', id),
    save: (agent: unknown) => ipcRenderer.invoke('agents:save', agent),
    delete: (id: string) => ipcRenderer.invoke('agents:delete', id),
    duplicate: (id: string) => ipcRenderer.invoke('agents:duplicate', id),
    runNow: (id: string) => ipcRenderer.invoke('agents:runNow', id),
    memoryKeys: (id: string) => ipcRenderer.invoke('agents:memoryKeys', id),
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
  smtp: { test: () => ipcRenderer.invoke('smtp:test') },
  twilio: { test: (sid: string, token: string) => ipcRenderer.invoke('twilio:test', sid, token) },
  knowledge: {
    upload: (filePaths: string[]) => ipcRenderer.invoke('knowledge:upload', filePaths),
    list: () => ipcRenderer.invoke('knowledge:list'),
    delete: (id: string) => ipcRenderer.invoke('knowledge:delete', id),
    search: (query: string, topK?: number) => ipcRenderer.invoke('knowledge:search', query, topK),
  },
  dialog: { openFiles: (options?: any) => ipcRenderer.invoke('dialog:openFiles', options) },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    create: (templateId: string) => ipcRenderer.invoke('templates:create', templateId),
  },
  acceptance: {
    get: () => ipcRenderer.invoke('acceptance:get'),
    accept: () => ipcRenderer.invoke('acceptance:accept'),
    getPath: () => ipcRenderer.invoke('acceptance:getPath'),
  },
  whatsapp: {
    listTemplates: () => ipcRenderer.invoke('whatsapp:listTemplates'),
    provisionTemplates: () => ipcRenderer.invoke('whatsapp:provisionTemplates'),
    provisionOne: (name: string) => ipcRenderer.invoke('whatsapp:provisionOne', name),
    refreshStatus: () => ipcRenderer.invoke('whatsapp:refreshStatus'),
    saveCustom: (spec: unknown) => ipcRenderer.invoke('whatsapp:saveCustom', spec),
    listCustom: () => ipcRenderer.invoke('whatsapp:listCustom'),
    deleteCustom: (name: string) => ipcRenderer.invoke('whatsapp:deleteCustom', name),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    forceQuit: () => ipcRenderer.invoke('app:forceQuit'),
  },
  catchup: {
    find: () => ipcRenderer.invoke('catchup:find'),
    run: (agentId: string) => ipcRenderer.invoke('catchup:run', agentId),
    onMissed: (callback: (data: unknown) => void) => {
      const listener = (_: unknown, data: unknown) => callback(data);
      ipcRenderer.on('catchup:missed', listener);
      return () => ipcRenderer.removeListener('catchup:missed', listener);
    },
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    onAvailable: (cb: (info: unknown) => void) => {
      const l = (_: unknown, info: unknown) => cb(info);
      ipcRenderer.on('update:available', l);
      return () => ipcRenderer.removeListener('update:available', l);
    },
    onProgress: (cb: (pct: number) => void) => {
      const l = (_: unknown, pct: number) => cb(pct);
      ipcRenderer.on('update:progress', l);
      return () => ipcRenderer.removeListener('update:progress', l);
    },
    onDownloaded: (cb: () => void) => {
      const l = () => cb();
      ipcRenderer.on('update:downloaded', l);
      return () => ipcRenderer.removeListener('update:downloaded', l);
    },
    onNone: (cb: () => void) => {
      const l = () => cb();
      ipcRenderer.on('update:none', l);
      return () => ipcRenderer.removeListener('update:none', l);
    },
    onError: (cb: (msg: string) => void) => {
      const l = (_: unknown, msg: string) => cb(msg);
      ipcRenderer.on('update:error', l);
      return () => ipcRenderer.removeListener('update:error', l);
    },
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
