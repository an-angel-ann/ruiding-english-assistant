const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    // 文件保存相关API
    saveFile: (options) => ipcRenderer.invoke('save-file', options),
    savePDF: (htmlContent, defaultFilename) => ipcRenderer.invoke('save-pdf', htmlContent, defaultFilename),
    saveWord: (htmlContent, defaultFilename) => ipcRenderer.invoke('save-word', htmlContent, defaultFilename)
});
