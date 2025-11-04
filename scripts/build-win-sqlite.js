#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 为Windows编译better-sqlite3...');

const backendPath = path.join(__dirname, '..', 'backend');
const electronVersion = require('../package.json').devDependencies.electron.replace('^', '');

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
try {
    execSync(`npm_config_target=${electronVersion} npm_config_arch=x64 npm_config_target_arch=x64 npm_config_platform=win32 npm_config_disturl=https://electronjs.org/headers npm_config_runtime=electron npm_config_build_from_source=true npm rebuild better-sqlite3`, {
        stdio: 'inherit',
        env: {
            ...process.env,
            npm_config_target: electronVersion,
            npm_config_arch: 'x64',
            npm_config_target_arch: 'x64',
            npm_config_platform: 'win32',
            npm_config_disturl: 'https://electronjs.org/headers',
            npm_config_runtime: 'electron',
            npm_config_build_from_source: 'true'
        }
    });
    
    console.log('✅ Windows版本编译完成');
    
    // 验证文件
    const nodePath = path.join(buildPath, 'Release', 'better_sqlite3.node');
    if (fs.existsSync(nodePath)) {
        const stats = fs.statSync(nodePath);
        console.log('✅ better_sqlite3.node已生成');
        console.log('   大小:', Math.round(stats.size / 1024), 'KB');
    } else {
        console.error('❌ better_sqlite3.node未生成');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ 编译失败:', error.message);
    console.log('\n⚠️  在macOS上为Windows编译可能需要额外的工具');
    console.log('建议：在Windows机器上运行 npm install 来编译native模块');
    process.exit(1);
}
