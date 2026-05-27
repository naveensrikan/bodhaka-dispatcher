import { ipcMain, dialog, BrowserWindow } from 'electron';

export function registerDialogHandlers() {
  ipcMain.handle('dialog:openFiles', async (event, options: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: ('openFile' | 'multiSelections')[];
  } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(win!, {
      title: options.title || 'Select files',
      properties: options.properties || ['openFile', 'multiSelections'],
      filters: options.filters || [
        { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });
}
