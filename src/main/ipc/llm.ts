import { ipcMain } from 'electron';
import { callLLM, testProviderKey, listProviderModels } from '../services/llm';
import { testTwilio } from '../services/whatsapp';
import { testSmtp } from '../services/email';

export function registerLLMHandlers() {
  ipcMain.handle('llm:testKey', async (_event, provider: string, apiKey: string, ollamaUrl?: string) => {
    try {
      await testProviderKey(provider, apiKey, ollamaUrl);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('llm:listModels', (_event, provider: string) => listProviderModels(provider));

  ipcMain.handle('llm:chat', async (_event, params: any) => await callLLM(params));

  ipcMain.handle('smtp:test', async () => {
    try {
      await testSmtp();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('twilio:test', async (_event, accountSid: string, authToken: string) => {
    return await testTwilio(accountSid, authToken);
  });
}
