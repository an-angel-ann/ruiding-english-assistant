const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 [Preload] preload.js 开始执行');
console.log('🔧 [Preload] contextBridge:', typeof contextBridge);
console.log('🔧 [Preload] ipcRenderer:', typeof ipcRenderer);

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
console.log('🔧 [Preload] 准备暴露 electron 对象到 window');
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        on: (channel, func) => {
            console.log(`🔧 [Preload] 注册监听器: ${channel}`);
            const validChannels = ['show-splash'];
            if (validChannels.includes(channel)) {
                // 移除 event 参数，直接传递数据
                ipcRenderer.on(channel, (event, ...args) => {
                    console.log(`[Preload] 收到 ${channel} 事件，参数:`, args);
                    func(...args);
                });
                console.log(`🔧 [Preload] 监听器注册成功: ${channel}`);
            } else {
                console.warn(`🔧 [Preload] 无效的频道: ${channel}`);
            }
        },
        // 添加 once 方法
        once: (channel, func) => {
            console.log(`🔧 [Preload] 注册一次性监听器: ${channel}`);
            const validChannels = ['show-splash'];
            if (validChannels.includes(channel)) {
                ipcRenderer.once(channel, (event, ...args) => {
                    console.log(`[Preload] 收到一次性 ${channel} 事件，参数:`, args);
                    func(...args);
                });
                console.log(`🔧 [Preload] 一次性监听器注册成功: ${channel}`);
            } else {
                console.warn(`🔧 [Preload] 无效的频道: ${channel}`);
            }
        }
    }
});
console.log('🔧 [Preload] electron 对象已暴露到 window');
