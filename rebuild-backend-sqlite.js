#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 为Electron重新构建backend的better-sqlite3...\n');

// 获取Electron版本
const electronVersion = require('./package.json').devDependencies.electron.replace('^', '');
console.log(`📦 Electron版本: ${electronVersion}`);

// 设置环境变量
process.env.npm_config_target = electronVersion;
process.env.npm_config_arch = 'arm64';
process.env.npm_config_target_arch = 'arm64';
process.env.npm_config_disturl = 'https://electronjs.org/headers';
process.env.npm_config_runtime = 'electron';
process.env.npm_config_build_from_source = 'true';

// 进入backend目录
const backendDir = path.join(__dirname, 'backend');
const sqlitePath = path.join(backendDir, 'node_modules', 'better-sqlite3');

console.log(`📁 Backend目录: ${backendDir}`);
console.log(`📁 SQLite路径: ${sqlitePath}\n`);

// 删除旧的build
const buildPath = path.join(sqlitePath, 'build');
if (fs.existsSync(buildPath)) {
    console.log('🗑️  删除旧的build目录...');
    fs.rmSync(buildPath, { recursive: true, force: true });
}

// 重新构建
console.log('🔨 重新构建better-sqlite3...\n');
try {
    execSync('npm run install', {
        cwd: sqlitePath,
        stdio: 'inherit',
        env: process.env
    });
    
    console.log('\n✅ 重新构建成功！');
    
    // 验证
    const nodePath = path.join(buildPath, 'Release', 'better_sqlite3.node');
    if (fs.existsSync(nodePath)) {
        console.log('✅ better_sqlite3.node 已生成');
        
        // 显示文件信息
        execSync(`file "${nodePath}"`, { stdio: 'inherit' });
    } else {
        console.error('❌ better_sqlite3.node 未找到');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ 重新构建失败:', error.message);
    process.exit(1);
}
