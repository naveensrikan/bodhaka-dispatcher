import { ipcMain } from 'electron';
import {
  provisionAllTemplates,
  provisionSingleTemplate,
  refreshApprovalStatuses,
  getTemplateStates,
  initTemplateTable,
  saveCustomTemplate,
  listCustomTemplates,
  deleteCustomTemplate,
  syncFromTwilio,
} from '../services/whatsappProvisioning';

export function registerWhatsAppHandlers() {
  initTemplateTable();

  ipcMain.handle('whatsapp:listTemplates', () => {
    try { return getTemplateStates(); }
    catch (err: any) { return { error: err.message }; }
  });

  ipcMain.handle('whatsapp:provisionTemplates', async () => {
    try { return await provisionAllTemplates(); }
    catch (err: any) { return { error: err.message }; }
  });

  ipcMain.handle('whatsapp:provisionOne', async (_e, name: string) => {
    try { return await provisionSingleTemplate(name); }
    catch (err: any) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('whatsapp:refreshStatus', async () => {
    try { return await refreshApprovalStatuses(); }
    catch (err: any) { return { error: err.message }; }
  });

  ipcMain.handle('whatsapp:saveCustom', (_e, spec: any) => {
    try { return saveCustomTemplate(spec); }
    catch (err: any) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('whatsapp:listCustom', () => {
    try { return listCustomTemplates(); }
    catch { return []; }
  });

  ipcMain.handle('whatsapp:deleteCustom', (_e, name: string) => {
    try { deleteCustomTemplate(name); return { ok: true }; }
    catch (err: any) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('whatsapp:syncFromTwilio', async () => {
    try { return await syncFromTwilio(); }
    catch (err: any) { return { error: err.message }; }
  });
}
