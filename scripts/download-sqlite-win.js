#!/usr/bin/env node

/**
 * 从GitHub下载预编译的Windows版本better-sqlite3
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ELECTRON_VERSION = '28.3.3';
const SQLITE_VERSION = '12.4.1';

// better-sqlite3的预编译版本URL
// 格式: https://github.com/WiseLibs/better-sqlite3/releases/download/v{version}/better-sqlite3-v{version}-electron-v{electron_abi}-{platform}-{arch}.tar.gz

// Electron 28.3.3 对应的 ABI 版本是 119
const ELECTRON_ABI = '119';

const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${SQLITE_VERSION}/better-sqlite3-v${SQLITE_VERSION}-electron-v${ELECTRON_ABI}-win32-x64.tar.gz`;

console.log('🔍 尝试下载预编译的Windows版本...');
console.log('URL:', url);

const backendPath = path.join(__dirname, '..', 'backend');
const buildPath = path.join(backendPath, 'node_modules', 'better-sqlite3', 'build', 'Release');
const tempFile = path.join(backendPath, 'better-sqlite3-win.tar.gz');

// 创建build目录
if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath, { recursive: true });
}

// 下载文件
const file = fs.createWriteStream(tempFile);
https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // 跟随重定向
        https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
                file.close();
                extractAndInstall();
            });
        });
    } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            extractAndInstall();
        });
    } else {
        console.error('❌ 下载失败，状态码:', response.statusCode);
        console.log('\n💡 尝试方法4：使用electron-builder的内置功能');
        process.exit(1);
    }
}).on('error', (err) => {
    fs.unlink(tempFile, () => {});
    console.error('❌ 下载错误:', err.message);
    console.log('\n💡 尝试方法4：使用electron-builder的内置功能');
    process.exit(1);
});

function extractAndInstall() {
    console.log('📦 解压文件...');
    try {
        execSync(`tar -xzf "${tempFile}" -C "${buildPath}"`, { stdio: 'inherit' });
        fs.unlinkSync(tempFile);
        
        const nodePath = path.join(buildPath, 'better_sqlite3.node');
        if (fs.existsSync(nodePath)) {
            console.log('✅ Windows版本安装成功！');
            console.log('   文件:', nodePath);
            const stats = fs.statSync(nodePath);
            console.log('   大小:', Math.round(stats.size / 1024), 'KB');
        } else {
            console.error('❌ 未找到better_sqlite3.node');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ 解压失败:', error.message);
        process.exit(1);
    }
}
