const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const https = require('https');

// Express服务器
let server;
let mainWindow;
const PORT = 8080;

// 创建Express应用
function createServer() {
    const expressApp = express();
    
    // MIME类型映射
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    
    // CORS中间件
    expressApp.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });
    
    // API代理
    expressApp.post('/api/proxy', (req, res) => {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const apiKey = req.headers['x-api-key'];
                
                if (!apiKey) {
                    res.status(400).json({ error: 'Missing API Key' });
                    return;
                }
                
                console.log(`📡 代理API请求: ${requestData.endpoint}`);
                
                const apiData = JSON.stringify(requestData.data);
                
                const options = {
                    hostname: 'dashscope.aliyuncs.com',
                    port: 443,
                    path: requestData.endpoint,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Length': Buffer.byteLength(apiData)
                    }
                };
                
                const apiReq = https.request(options, (apiRes) => {
                    let responseData = '';
                    
                    apiRes.on('data', chunk => {
                        responseData += chunk;
                    });
                    
                    apiRes.on('end', () => {
                        console.log(`✅ API响应: ${apiRes.statusCode}`);
                        res.status(apiRes.statusCode).json(JSON.parse(responseData));
                    });
                });
                
                apiReq.on('error', (error) => {
                    console.error(`❌ API请求失败:`, error.message);
                    res.status(500).json({ error: error.message });
                });
                
                apiReq.write(apiData);
                apiReq.end();
                
            } catch (error) {
                console.error('❌ 处理请求失败:', error.message);
                res.status(400).json({ error: error.message });
            }
        });
    });
    
    // 静态文件服务
    expressApp.use(express.static(__dirname));
    
    // 启动服务器
    server = expressApp.listen(PORT, () => {
        console.log('🚀 内置服务器启动成功！');
        console.log(`📡 监听端口: ${PORT}`);
    });
}

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        title: '睿叮AI英语学习助手 v2.3',
        backgroundColor: '#f5f5f5',
        show: false // 先不显示，等加载完成
    });
    
    // 加载应用
    mainWindow.loadURL(`http://localhost:${PORT}/index.html`);
    
    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('✅ 应用窗口已显示');
    });
    
    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
    
    // 窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // 创建菜单
    createMenu();
}

// 创建应用菜单
function createMenu() {
    const template = [
        {
            label: '睿叮AI英语学习助手',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于睿叮AI英语学习助手',
                            message: '睿叮AI英语学习助手 v2.3',
                            detail: 'OCR识别 + AI分析 + 互动学习\n\n功能特点：\n• 图片文字识别\n• AI智能分析\n• 词义辨别练习\n• 句子结构分析\n• 句子重组训练\n• 遮盖式生词记忆\n• 导出学习成果\n\nCopyright © 2025 睿叮AI',
                            buttons: ['确定']
                        });
                    }
                },
                { type: 'separator' },
                { role: 'quit', label: '退出' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' }
            ]
        },
        {
            label: '查看',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'forceReload', label: '强制刷新' },
                { type: 'separator' },
                { role: 'resetZoom', label: '实际大小' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '全屏' }
            ]
        },
        {
            label: '窗口',
            submenu: [
                { role: 'minimize', label: '最小化' },
                { role: 'zoom', label: '缩放' },
                { type: 'separator' },
                { role: 'close', label: '关闭窗口' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '使用指南',
                    click: () => {
                        const { shell } = require('electron');
                        // 可以打开本地的帮助文档
                        console.log('打开使用指南');
                    }
                },
                {
                    label: '开发者工具',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC处理：保存Word文档
ipcMain.handle('save-word-document', async (event, htmlContent, defaultFilename) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            title: '保存Word文档',
            defaultPath: defaultFilename,
            filters: [
                { name: 'Word文档', extensions: ['doc'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });
        
        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }
        
        // 写入文件
        fs.writeFileSync(filePath, '\ufeff' + htmlContent, 'utf-8');
        
        return { success: true, filePath };
    } catch (error) {
        console.error('❌ 保存文件失败:', error);
        return { success: false, error: error.message };
    }
});

// 应用准备就绪
app.whenReady().then(() => {
    console.log('🎯 Electron应用启动中...');
    console.log('📱 平台:', process.platform);
    console.log('🖥️  架构:', process.arch);
    console.log('📍 应用路径:', app.getAppPath());
    
    // 启动服务器
    createServer();
    
    // 等待服务器启动
    setTimeout(() => {
        createWindow();
    }, 1000);
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前
app.on('before-quit', () => {
    console.log('🛑 应用正在退出...');
    if (server) {
        server.close();
        console.log('✅ 服务器已关闭');
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
});
