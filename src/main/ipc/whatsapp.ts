import { ipcMain } from 'electron';
import {
  provisionAllTemplates,
  refreshApprovalStatuses,
  getTemplateStates,
  initTemplateTable,
} from '../services/whatsappProvisioning';

export function registerWhatsAppHandlers() {
  initTemplateTable();

  ipcMain.handle('whatsapp:listTemplates', () => {
    try {
      return getTemplateStates();
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('whatsapp:provisionTemplates', async () => {
    try {
      return await provisionAllTemplates();
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('whatsapp:refreshStatus', async () => {
    try {
      return await refreshApprovalStatuses();
    } catch (err: any) {
      return { error: err.message };
    }
  });
}
