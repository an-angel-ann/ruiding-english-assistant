const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    platform: process.platform,
    // 文件保存相关API
    saveFile: (options) => ipcRenderer.invoke('save-file', options),
    savePDF: (htmlContent, defaultFilename) => ipcRenderer.invoke('save-pdf', htmlContent, defaultFilename),
    saveWord: (htmlContent, defaultFilename) => ipcRenderer.invoke('save-word', htmlContent, defaultFilename),
    // SMTP配置相关API
    openSmtpSetup: () => ipcRenderer.send('open-smtp-setup'),
    onSmtpConfigUpdated: (callback) => ipcRenderer.on('smtp-config-updated', callback)
});
