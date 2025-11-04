#!/usr/bin/env node

/**
 * 为Windows打包准备better-sqlite3
 * 在macOS上交叉编译Windows版本的native模块
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 为Windows准备better-sqlite3...');

const backendPath = path.join(__dirname, '..', 'backend');
const electronVersion = '28.3.3'; // 固定版本，与package.json一致

console.log('📦 Electron版本:', electronVersion);
console.log('📁 Backend路径:', backendPath);

// 进入backend目录
process.chdir(backendPath);

// 清理旧的build
console.log('🗑️  清理旧的build...');
const buildPath = path.join(backendPath, 'node_modules', 'better-sqlite3', 'build');
if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true, force: true });
}

// 为Windows x64编译
console.log('🔨 为Windows x64编译better-sqlite3...');
console.log('   这可能需要几分钟...');

try {
    // 使用electron-rebuild为Windows编译
    const rebuildCmd = `npx electron-rebuild -f -w better-sqlite3 -v ${electronVersion} --arch=x64 --platform=win32`;
    console.log('   执行命令:', rebuildCmd);
    
    execSync(rebuildCmd, {
        stdio: 'inherit',
        cwd: backendPath
    });
    
    console.log('✅ Windows版本编译完成');
    
    // 验证文件
    const nodePath = path.join(buildPath, 'Release', 'better_sqlite3.node');
    if (fs.existsSync(nodePath)) {
        const stats = fs.statSync(nodePath);
        console.log('✅ better_sqlite3.node已生成');
        console.log('   大小:', Math.round(stats.size / 1024), 'KB');
        
        // 尝试检查文件类型（在macOS上可能无法准确识别Windows PE文件）
        try {
            const fileType = execSync(`file "${nodePath}"`, { encoding: 'utf8' });
            console.log('   文件类型:', fileType.trim());
        } catch (e) {
            // 忽略file命令错误
        }
    } else {
        console.error('❌ better_sqlite3.node未生成');
        process.exit(1);
    }
    
    console.log('\n✅ 准备完成！现在可以运行: npm run build:win');
} catch (error) {
    console.error('❌ 编译失败:', error.message);
    console.log('\n⚠️  可能的原因:');
    console.log('1. 缺少编译工具');
    console.log('2. 在macOS上交叉编译Windows模块可能不支持');
    console.log('\n💡 建议:');
    console.log('1. 在Windows机器上运行: npm install && npm run build:win');
    console.log('2. 或使用GitHub Actions进行跨平台编译');
    process.exit(1);
}
