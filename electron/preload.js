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

// 暴露 electron 对象用于启动动画
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        on: (channel, func) => {
            const validChannels = ['show-splash'];
            if (validChannels.includes(channel)) {
                // 移除 event 参数，直接传递数据
                ipcRenderer.on(channel, (event, ...args) => {
                    console.log(`[Preload] 收到 ${channel} 事件，参数:`, args);
                    func(...args);
                });
            }
        },
        // 添加 once 方法
        once: (channel, func) => {
            const validChannels = ['show-splash'];
            if (validChannels.includes(channel)) {
                ipcRenderer.once(channel, (event, ...args) => {
                    console.log(`[Preload] 收到一次性 ${channel} 事件，参数:`, args);
                    func(...args);
                });
            }
        }
    }
});
