const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let backendProcess;
let frontendServer;

// 单实例锁 - 防止多个实例同时运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('应用已在运行，退出当前实例');
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // 当运行第二个实例时，聚焦到已存在的窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// 禁用硬件加速（解决某些Mac上的显示问题）
app.disableHardwareAcceleration();

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        title: '睿叮AI英语学习助手',
        icon: path.join(__dirname, '../build/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        backgroundColor: '#ffffff',
        show: false,
        titleBarStyle: 'default'
    });

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 加载应用
    mainWindow.loadURL('http://localhost:8080');

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // 添加快捷键：Cmd+Option+I 切换开发者工具
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.meta && input.alt && input.key.toLowerCase() === 'i') {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        }
    });

    // 窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 处理外部链接
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
}

// 启动后端服务器
function startBackendServer() {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        
        // 获取正确的资源路径
        let backendPath;
        if (app.isPackaged) {
            // 打包后的路径 - extraResources放在Resources目录下
            backendPath = path.join(process.resourcesPath, 'backend');
            
            // 如果不存在，尝试app.asar.unpacked
            if (!fs.existsSync(backendPath)) {
                const appPath = app.getAppPath();
                backendPath = path.join(appPath, '..', 'app.asar.unpacked', 'backend');
            }
            
            // 再尝试其他路径
            if (!fs.existsSync(backendPath)) {
                backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
            }
        } else {
            backendPath = path.join(__dirname, '../backend');
        }

        const serverScript = path.join(backendPath, 'server.js');

        console.log('=== 后端服务器启动信息 ===');
        console.log('应用路径:', app.getAppPath());
        console.log('资源路径:', process.resourcesPath);
        console.log('后端路径:', backendPath);
        console.log('服务器脚本:', serverScript);
        console.log('是否打包:', app.isPackaged);
        console.log('脚本是否存在:', fs.existsSync(serverScript));

        // 验证路径是否存在
        if (!fs.existsSync(backendPath)) {
            const error = new Error(`后端目录不存在: ${backendPath}`);
            console.error(error);
            dialog.showErrorBox('启动失败', `后端目录不存在:\n${backendPath}\n\n请重新安装应用`);
            reject(error);
            return;
        }

        if (!fs.existsSync(serverScript)) {
            const error = new Error(`服务器脚本不存在: ${serverScript}`);
            console.error(error);
            dialog.showErrorBox('启动失败', `服务器脚本不存在:\n${serverScript}\n\n请重新安装应用`);
            reject(error);
            return;
        }
        
        // 检查node_modules是否存在
        const nodeModulesPath = path.join(backendPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            const error = new Error(`后端依赖缺失: ${nodeModulesPath}`);
            console.error(error);
            dialog.showErrorBox('启动失败', `后端依赖缺失:\n${nodeModulesPath}\n\n请重新安装应用`);
            reject(error);
            return;
        }

        try {
            // 设置环境变量
            process.env.NODE_ENV = 'production';
            process.env.PORT = '3001';
            
            // 改变工作目录
            const originalCwd = process.cwd();
            try {
                process.chdir(backendPath);
                console.log('工作目录已切换到:', process.cwd());
            } catch (chdirError) {
                console.error('切换目录失败:', chdirError);
                dialog.showErrorBox('启动失败', `切换目录失败:\n${chdirError.message}`);
                reject(chdirError);
                return;
            }
            
            // 直接require服务器脚本
            console.log('正在加载服务器脚本...');
            require(serverScript);
            
            // 恢复工作目录
            process.chdir(originalCwd);
            
            console.log('后端服务器已启动');
            
            // 等待服务器完全启动
            setTimeout(() => {
                resolve();
            }, 2000);
        } catch (error) {
            console.error('后端启动失败:', error);
            dialog.showErrorBox('启动失败', `后端服务器启动失败:\n${error.message}\n\n${error.stack}`);
            reject(error);
        }
    });
}

// 启动前端服务器
function startFrontendServer() {
    return new Promise((resolve, reject) => {
        // 获取正确的资源路径
        let frontendPath;
        if (app.isPackaged) {
            const fs = require('fs');
            
            // 优先使用app.asar.unpacked（frontend在asarUnpack中）
            const appPath = app.getAppPath();
            frontendPath = path.join(appPath, '..', 'app.asar.unpacked', 'frontend');
            
            if (!fs.existsSync(frontendPath)) {
                frontendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend');
            }
            if (!fs.existsSync(frontendPath)) {
                frontendPath = path.join(process.resourcesPath, 'frontend');
            }
        } else {
            frontendPath = path.join(__dirname, '../frontend');
        }

        const http = require('http');
        const fs = require('fs');
        const pathModule = require('path');

        console.log('前端路径:', frontendPath);
        console.log('前端目录是否存在:', fs.existsSync(frontendPath));

        const server = http.createServer((req, res) => {
            // 处理URL参数
            let urlPath = req.url.split('?')[0];
            let filePath = pathModule.join(frontendPath, urlPath === '/' ? 'index.html' : urlPath);
            
            const extname = pathModule.extname(filePath);
            const contentType = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'text/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2'
            }[extname] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        console.error('文件未找到:', filePath);
                        res.writeHead(404);
                        res.end('File not found: ' + urlPath);
                    } else {
                        console.error('读取文件错误:', error);
                        res.writeHead(500);
                        res.end('Server error: ' + error.code);
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });

        server.listen(8080, '127.0.0.1', () => {
            console.log('前端服务器已启动: http://localhost:8080');
            frontendServer = server;
            resolve();
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log('端口8080已被占用，尝试使用其他端口...');
                server.listen(0, '127.0.0.1', () => {
                    const port = server.address().port;
                    console.log(`前端服务器已启动: http://localhost:${port}`);
                    frontendServer = server;
                    resolve();
                });
            } else {
                console.error('前端服务器启动失败:', error);
                reject(error);
            }
        });
    });
}

// 创建应用菜单
function createMenu() {
    const { shell } = require('electron');
    
    const template = [
        {
            label: app.name,
            submenu: [
                { role: 'about', label: '关于' },
                { type: 'separator' },
                {
                    label: '联系我们',
                    click: async () => {
                        await shell.openExternal('mailto:o_oangela@163.com');
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
                { role: 'paste', label: '粘贴' }
            ]
        },
        {
            label: '窗口',
            submenu: [
                { role: 'minimize', label: '最小化' },
                { role: 'zoom', label: '缩放' },
                { type: 'separator' },
                { role: 'close', label: '关闭' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// 应用准备就绪
app.whenReady().then(async () => {
    try {
        // 创建菜单
        createMenu();
        
        // 启动后端服务器
        await startBackendServer();
        
        // 启动前端服务器
        await startFrontendServer();
        
        // 创建窗口
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    } catch (error) {
        console.error('应用启动失败:', error);
        dialog.showErrorBox('启动失败', '应用启动失败，请重试或联系技术支持。\n\n错误信息: ' + error.message);
        app.quit();
    }
});

// 所有窗口关闭
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前清理
app.on('before-quit', () => {
    console.log('应用退出，清理资源...');
    
    if (backendProcess) {
        backendProcess.kill();
    }
    
    if (frontendServer) {
        frontendServer.close();
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

// IPC通信
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
    return app.getAppPath();
});

// 保存PDF文件
ipcMain.handle('save-pdf', async (event, htmlContent, defaultFilename) => {
    const { dialog, BrowserWindow } = require('electron');
    const fs = require('fs');
    const path = require('path');
    
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: '保存PDF文件',
            defaultPath: defaultFilename,
            filters: [
                { name: 'PDF文件', extensions: ['pdf'] }
            ]
        });
        
        if (result.canceled) {
            return { success: false, canceled: true };
        }
        
        // 创建隐藏的BrowserWindow来生成PDF
        const pdfWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false
            }
        });
        
        // 加载HTML内容
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 生成PDF
        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: {
                top: 0.5,
                bottom: 0.5,
                left: 0.5,
                right: 0.5
            }
        });
        
        // 保存PDF文件
        fs.writeFileSync(result.filePath, pdfData);
        
        // 关闭临时窗口
        pdfWindow.close();
        
        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('保存PDF失败:', error);
        return { success: false, error: error.message };
    }
});

// 保存Word文件
ipcMain.handle('save-word', async (event, htmlContent, defaultFilename) => {
    const { dialog } = require('electron');
    const fs = require('fs');
    
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: '保存Word文件',
            defaultPath: defaultFilename,
            filters: [
                { name: 'Word文档', extensions: ['doc'] },
                { name: 'HTML文件', extensions: ['html'] }
            ]
        });
        
        if (result.canceled) {
            return { success: false, canceled: true };
        }
        
        // 保存HTML内容为Word文件
        fs.writeFileSync(result.filePath, htmlContent, 'utf-8');
        
        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('保存Word失败:', error);
        return { success: false, error: error.message };
    }
});
