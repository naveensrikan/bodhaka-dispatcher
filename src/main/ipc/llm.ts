import { ipcMain } from 'electron';
import { callLLM, testProviderKey, listProviderModels } from '../services/llm';

export function registerLLMHandlers() {
  ipcMain.handle('llm:testKey', async (_event, provider: string, apiKey: string) => {
    try {
      await testProviderKey(provider, apiKey);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('llm:listModels', (_event, provider: string) => {
    return listProviderModels(provider);
  });

  ipcMain.handle('llm:chat', async (_event, params: any) => {
    return await callLLM(params);
  });
}
