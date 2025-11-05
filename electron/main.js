const { app, BrowserWindow, ipcMain, dialog, Menu, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const os = require('os');

// 设置日志文件
const logFile = path.join(os.tmpdir(), 'ruiding-english-assistant.log');
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (err) {
        console.error('写入日志失败:', err);
    }
}

log('=== 应用启动 ===');
log(`Electron版本: ${process.versions.electron}`);
log(`Node版本: ${process.versions.node}`);
log(`平台: ${process.platform}`);
log(`架构: ${process.arch}`);
log(`应用路径: ${app.getAppPath()}`);
log(`日志文件: ${logFile}`);

const store = new Store();
let mainWindow;
let splashWindow;
let smtpSetupWindow;
let backendProcess;
let frontendServer;

// 单实例锁 - 防止多个实例同时运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    log('应用已在运行，退出当前实例');
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        log('检测到第二个实例，聚焦到现有窗口');
        // 当运行第二个实例时，聚焦到已存在的窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// 禁用硬件加速（解决某些Mac上的显示问题）
app.disableHardwareAcceleration();

// 捕获未处理的错误
process.on('uncaughtException', (error) => {
    log(`未捕获的异常: ${error.message}`);
    log(error.stack);
    dialog.showErrorBox('应用错误', `发生未处理的错误:\n\n${error.message}\n\n日志文件: ${logFile}`);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`未处理的Promise拒绝: ${reason}`);
});

// 创建启动画面窗口
function createSplashWindow() {
    log('创建启动画面');
    splashWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 确定视频文件路径
    let videoPath;
    if (app.isPackaged) {
        // 打包后从 app.asar.unpacked 加载
        videoPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'welcomeflash.mp4');
    } else {
        // 开发模式从项目根目录加载
        videoPath = path.join(__dirname, '..', 'welcomeflash.mp4');
    }
    
    log(`视频文件路径: ${videoPath}`);
    log(`视频文件是否存在: ${fs.existsSync(videoPath)}`);

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    
    // 等待页面加载完成后发送视频路径
    splashWindow.webContents.on('did-finish-load', () => {
        splashWindow.webContents.send('video-path', videoPath);
    });

    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

// 关闭启动画面
function closeSplashWindow() {
    if (splashWindow) {
        log('关闭启动画面');
        splashWindow.close();
        splashWindow = null;
    }
}

// 创建SMTP配置窗口
function createSmtpSetupWindow() {
    log('创建SMTP配置窗口');
    smtpSetupWindow = new BrowserWindow({
        width: 700,
        height: 800,
        resizable: false,
        title: '邮件服务配置',
        icon: path.join(__dirname, '../build/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#ffffff',
        show: false
    });

    smtpSetupWindow.once('ready-to-show', () => {
        smtpSetupWindow.show();
        // 默认打开开发者工具以便调试
        smtpSetupWindow.webContents.openDevTools();
    });

    smtpSetupWindow.loadFile(path.join(__dirname, 'smtp-setup.html'));

    smtpSetupWindow.on('closed', () => {
        smtpSetupWindow = null;
    });
}

// 测试SMTP配置
async function testSmtpConfig(config) {
    return new Promise((resolve) => {
        try {
            // 动态加载nodemailer - 需要从backend的node_modules加载
            let nodemailer;
            try {
                // 确定backend路径 - 打包后需要从app.asar.unpacked加载native模块
                let backendPath;
                if (app.isPackaged) {
                    // 尝试从unpacked目录加载（用于native模块）
                    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
                    const regularPath = path.join(process.resourcesPath, 'backend');
                    
                    // 优先使用unpacked路径
                    backendPath = fs.existsSync(unpackedPath) ? unpackedPath : regularPath;
                    log(`打包模式 - Unpacked路径: ${unpackedPath}, 存在: ${fs.existsSync(unpackedPath)}`);
                    log(`打包模式 - Regular路径: ${regularPath}, 存在: ${fs.existsSync(regularPath)}`);
                } else {
                    backendPath = path.join(__dirname, '../backend');
                }
                
                log(`Backend路径: ${backendPath}`);
                log(`Backend路径是否存在: ${fs.existsSync(backendPath)}`);
                
                // 检查 node_modules 目录
                const nodeModulesPath = path.join(backendPath, 'node_modules');
                log(`node_modules路径: ${nodeModulesPath}`);
                log(`node_modules是否存在: ${fs.existsSync(nodeModulesPath)}`);
                
                if (fs.existsSync(nodeModulesPath)) {
                    try {
                        const modules = fs.readdirSync(nodeModulesPath);
                        log(`node_modules中的模块数量: ${modules.length}`);
                        log(`是否包含nodemailer: ${modules.includes('nodemailer')}`);
                        if (modules.includes('nodemailer')) {
                            const nodemailerDir = path.join(nodeModulesPath, 'nodemailer');
                            const nodemailerFiles = fs.readdirSync(nodemailerDir);
                            log(`nodemailer目录内容: ${nodemailerFiles.join(', ')}`);
                        }
                    } catch (e) {
                        log(`读取node_modules失败: ${e.message}`);
                    }
                }
                
                // 尝试多种方式加载nodemailer
                const nodemailerPaths = [
                    path.join(backendPath, 'node_modules', 'nodemailer'),
                    path.join(backendPath, 'node_modules', 'nodemailer', 'lib', 'nodemailer.js'),
                ];
                
                let loaded = false;
                for (const nodemailerPath of nodemailerPaths) {
                    log(`尝试加载: ${nodemailerPath}`);
                    if (fs.existsSync(nodemailerPath)) {
                        try {
                            nodemailer = require(nodemailerPath);
                            log(`✅ 成功从 ${nodemailerPath} 加载nodemailer`);
                            loaded = true;
                            break;
                        } catch (e) {
                            log(`从 ${nodemailerPath} 加载失败: ${e.message}`);
                        }
                    } else {
                        log(`路径不存在: ${nodemailerPath}`);
                    }
                }
                
                if (!loaded) {
                    // 最后尝试：切换工作目录后require
                    const originalCwd = process.cwd();
                    try {
                        process.chdir(backendPath);
                        log(`切换工作目录到: ${backendPath}`);
                        nodemailer = require('nodemailer');
                        log('✅ 通过切换工作目录成功加载nodemailer');
                        loaded = true;
                    } catch (e) {
                        log(`切换目录后加载失败: ${e.message}`);
                    } finally {
                        process.chdir(originalCwd);
                    }
                }
                
                if (!loaded) {
                    throw new Error('所有加载方式都失败');
                }
            } catch (e) {
                log(`❌ 加载nodemailer失败: ${e.message}`);
                log(`Stack: ${e.stack}`);
                resolve({ 
                    success: false, 
                    error: '无法加载邮件模块。请确保应用已正确安装，或联系技术支持。' 
                });
                return;
            }

            log('开始测试SMTP连接...');
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.port === 465,
                auth: {
                    user: config.user,
                    pass: config.pass
                }
            });

            // 验证连接
            transporter.verify((error, success) => {
                if (error) {
                    log(`SMTP测试失败: ${error.message}`);
                    resolve({ success: false, error: error.message });
                } else {
                    log('✅ SMTP测试成功');
                    resolve({ success: true });
                }
            });
        } catch (error) {
            log(`SMTP测试异常: ${error.message}`);
            log(`Stack: ${error.stack}`);
            resolve({ success: false, error: error.message });
        }
    });
}

// 保存SMTP配置
function saveSmtpConfig(config) {
    try {
        store.set('smtpConfig', config);
        log('SMTP配置已保存');
        return true;
    } catch (error) {
        log(`保存SMTP配置失败: ${error.message}`);
        return false;
    }
}

// 获取SMTP配置
function getSmtpConfig() {
    return store.get('smtpConfig', null);
}

// 检查是否需要显示SMTP配置向导
function needsSmtpSetup() {
    const config = getSmtpConfig();
    return !config || !config.user || !config.pass;
}

// 创建主窗口
function createWindow() {
    log('开始创建主窗口');
    try {
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
        // 默认打开开发者工具以便调试
        mainWindow.webContents.openDevTools();
    });

    // 加载应用
    mainWindow.loadURL('http://localhost:8080');
    
    // 页面加载完成后发送视频路径以显示启动动画
    mainWindow.webContents.on('did-finish-load', () => {
        // 确定视频文件路径
        let videoPath;
        if (app.isPackaged) {
            videoPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'welcomeflash.mp4');
        } else {
            videoPath = path.join(__dirname, '..', 'welcomeflash.mp4');
        }
        
        log(`视频文件路径: ${videoPath}`);
        log(`视频文件是否存在: ${fs.existsSync(videoPath)}`);
        
        // 使用自定义协议 URL
        const videoUrl = `local-video://${encodeURIComponent(videoPath)}`;
        log(`视频 URL: ${videoUrl}`);
        
        // 发送视频 URL 给渲染进程
        mainWindow.webContents.send('show-splash', videoUrl);
    });

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
    
    log('主窗口创建成功');
    } catch (error) {
        log(`创建主窗口失败: ${error.message}`);
        log(error.stack);
        dialog.showErrorBox('窗口创建失败', `无法创建应用窗口:\n\n${error.message}\n\n日志文件: ${logFile}`);
        app.quit();
    }
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

        log('=== 后端服务器启动信息 ===');
        log(`应用路径: ${app.getAppPath()}`);
        log(`资源路径: ${process.resourcesPath}`);
        log(`后端路径: ${backendPath}`);
        log(`服务器脚本: ${serverScript}`);
        log(`是否打包: ${app.isPackaged}`);
        log(`脚本是否存在: ${fs.existsSync(serverScript)}`);

        // 验证路径是否存在
        if (!fs.existsSync(backendPath)) {
            const error = new Error(`后端目录不存在: ${backendPath}`);
            log(`错误: ${error.message}`);
            dialog.showErrorBox('启动失败', `后端目录不存在:\n${backendPath}\n\n日志文件: ${logFile}`);
            reject(error);
            return;
        }

        if (!fs.existsSync(serverScript)) {
            const error = new Error(`服务器脚本不存在: ${serverScript}`);
            log(`错误: ${error.message}`);
            dialog.showErrorBox('启动失败', `服务器脚本不存在:\n${serverScript}\n\n日志文件: ${logFile}`);
            reject(error);
            return;
        }
        
        // 检查node_modules是否存在
        const nodeModulesPath = path.join(backendPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            const error = new Error(`后端依赖缺失: ${nodeModulesPath}`);
            log(`错误: ${error.message}`);
            dialog.showErrorBox('启动失败', `后端依赖缺失:\n${nodeModulesPath}\n\n日志文件: ${logFile}`);
            reject(error);
            return;
        }
        
        // 检查better-sqlite3
        const sqlitePath = path.join(nodeModulesPath, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
        log(`检查better-sqlite3: ${sqlitePath}`);
        log(`better-sqlite3存在: ${fs.existsSync(sqlitePath)}`);
        if (!fs.existsSync(sqlitePath)) {
            const error = new Error(`better-sqlite3.node不存在: ${sqlitePath}`);
            log(`错误: ${error.message}`);
            dialog.showErrorBox('启动失败', `数据库模块缺失:\n${sqlitePath}\n\n日志文件: ${logFile}`);
            reject(error);
            return;
        }

        try {
            // 设置环境变量
            process.env.NODE_ENV = 'production';
            process.env.PORT = '3001';
            
            // 配置SMTP邮件服务
            // 从electron-store读取用户配置的SMTP
            const smtpConfig = getSmtpConfig();
            if (smtpConfig && smtpConfig.user && smtpConfig.pass) {
                process.env.SMTP_HOST = smtpConfig.host;
                process.env.SMTP_PORT = smtpConfig.port.toString();
                process.env.SMTP_USER = smtpConfig.user;
                process.env.SMTP_PASS = smtpConfig.pass;
                log(`✅ SMTP配置已加载: ${smtpConfig.user}`);
            } else {
                log('⚠️ SMTP未配置，邮件功能将不可用');
                process.env.SMTP_HOST = '';
                process.env.SMTP_PORT = '';
                process.env.SMTP_USER = '';
                process.env.SMTP_PASS = '';
            }
            
            // 改变工作目录
            const originalCwd = process.cwd();
            try {
                process.chdir(backendPath);
                log(`工作目录已切换到: ${process.cwd()}`);
            } catch (chdirError) {
                log(`切换目录失败: ${chdirError.message}`);
                dialog.showErrorBox('启动失败', `切换目录失败:\n${chdirError.message}\n\n日志文件: ${logFile}`);
                reject(chdirError);
                return;
            }
            
            // 直接require服务器脚本
            log('正在加载服务器脚本...');
            try {
                require(serverScript);
                log('服务器脚本加载成功');
            } catch (requireError) {
                log(`服务器脚本加载失败: ${requireError.message}`);
                log(requireError.stack);
                dialog.showErrorBox('启动失败', `服务器脚本加载失败:\n${requireError.message}\n\n日志文件: ${logFile}`);
                reject(requireError);
                return;
            }
            
            // 恢复工作目录
            process.chdir(originalCwd);
            
            log('后端服务器脚本已加载，等待服务器启动...');
            
            // 等待服务器完全启动
            setTimeout(() => {
                log('后端服务器启动等待完成');
                resolve();
            }, 3000);
        } catch (error) {
            log(`后端启动失败: ${error.message}`);
            log(error.stack);
            dialog.showErrorBox('启动失败', `后端服务器启动失败:\n${error.message}\n\n日志文件: ${logFile}`);
            reject(error);
        }
    });
}

// 启动前端服务器
function startFrontendServer() {
    log('=== 开始启动前端服务器 ===');
    return new Promise((resolve, reject) => {
        try {
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

            log(`前端路径: ${frontendPath}`);
            log(`前端目录是否存在: ${fs.existsSync(frontendPath)}`);
            
            if (!fs.existsSync(frontendPath)) {
                const error = new Error(`前端目录不存在: ${frontendPath}`);
                log(`错误: ${error.message}`);
                dialog.showErrorBox('启动失败', `前端目录不存在:\n${frontendPath}\n\n日志文件: ${logFile}`);
                reject(error);
                return;
            }
            
            log('创建HTTP服务器...');

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
            log('前端服务器已启动: http://localhost:8080');
            frontendServer = server;
            resolve();
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                log('端口8080已被占用，尝试使用其他端口...');
                server.listen(0, '127.0.0.1', () => {
                    const port = server.address().port;
                    log(`前端服务器已启动: http://localhost:${port}`);
                    frontendServer = server;
                    resolve();
                });
            } else {
                log(`前端服务器启动失败: ${error.message}`);
                log(error.stack);
                reject(error);
            }
        });
        } catch (error) {
            log(`前端服务器初始化失败: ${error.message}`);
            log(error.stack);
            dialog.showErrorBox('启动失败', `前端服务器初始化失败:\n${error.message}\n\n日志文件: ${logFile}`);
            reject(error);
        }
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

// IPC处理程序
ipcMain.handle('test-smtp-config', async (event, config) => {
    return await testSmtpConfig(config);
});

ipcMain.on('smtp-config-complete', (event, config) => {
    log('用户完成SMTP配置');
    saveSmtpConfig(config);
    if (smtpSetupWindow) {
        smtpSetupWindow.close();
        smtpSetupWindow = null;
    }
    // 通知主窗口配置已完成
    if (mainWindow) {
        mainWindow.webContents.send('smtp-config-updated');
    }
});

ipcMain.on('smtp-config-cancel', () => {
    log('用户取消SMTP配置');
    if (smtpSetupWindow) {
        smtpSetupWindow.close();
        smtpSetupWindow = null;
    }
});

// 从前端打开SMTP配置窗口
ipcMain.on('open-smtp-setup', () => {
    log('前端请求打开SMTP配置窗口');
    if (smtpSetupWindow) {
        smtpSetupWindow.focus();
    } else {
        createSmtpSetupWindow();
    }
});

// 启动画面播放完成
ipcMain.on('splash-finished', () => {
    log('启动画面播放完成');
    closeSplashWindow();
});

// 启动应用主流程
async function startApplication() {
    log('开始启动应用主流程...');
    try {
        // 创建菜单
        log('创建菜单...');
        createMenu();
        log('菜单创建完成');
        
        // 启动后端服务器
        log('启动后端服务器...');
        await startBackendServer();
        log('✅ 后端服务器启动成功，继续启动前端...');
        
        // 启动前端服务器
        log('启动前端服务器...');
        await startFrontendServer();
        log('✅ 前端服务器启动成功，继续创建窗口...');
        
        // 创建窗口
        log('创建主窗口...');
        await createWindow();
        log('✅ 主窗口创建成功');
        
        log('🎉 应用初始化完成');
    } catch (error) {
        log(`❌ 应用启动失败: ${error.message}`);
        log(error.stack);
        dialog.showErrorBox('启动失败', `应用启动失败:\n\n${error.message}\n\n日志文件: ${logFile}`);
        app.quit();
    }
}

// 应用准备就绪
app.whenReady().then(async () => {
    log('应用准备就绪，开始初始化...');
    
    // 注册自定义协议用于加载本地视频
    protocol.registerFileProtocol('local-video', (request, callback) => {
        const url = request.url.replace('local-video://', '');
        try {
            return callback(decodeURIComponent(url));
        } catch (error) {
            log(`加载视频失败: ${error.message}`);
            return callback({ error: -2 });
        }
    });
    
    // 直接启动应用（启动画面将在主窗口内显示）
    await startApplication();

    app.on('activate', () => {
        log('应用被激活');
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
