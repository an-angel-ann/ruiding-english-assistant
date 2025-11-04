#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 重新构建backend的native模块...');

const backendDir = path.join(__dirname, 'backend');
const electronVersion = require('./package.json').devDependencies.electron.replace('^', '');

console.log(`📦 Electron版本: ${electronVersion}`);
console.log(`📁 Backend目录: ${backendDir}`);

// 检查backend/node_modules是否存在
if (!fs.existsSync(path.join(backendDir, 'node_modules'))) {
    console.log('❌ backend/node_modules不存在，请先运行: cd backend && npm install');
    process.exit(1);
}

// 查找所有需要重新构建的native模块
const nativeModules = ['better-sqlite3', 'bcrypt'];

for (const moduleName of nativeModules) {
    const modulePath = path.join(backendDir, 'node_modules', moduleName);
    
    if (fs.existsSync(modulePath)) {
        console.log(`\n🔨 重新构建 ${moduleName}...`);
        
        try {
            // 删除旧的build目录
            const buildPath = path.join(modulePath, 'build');
            if (fs.existsSync(buildPath)) {
                fs.rmSync(buildPath, { recursive: true, force: true });
                console.log(`  ✓ 已删除旧的build目录`);
            }
            
            // 使用electron-rebuild重新构建
            execSync(
                `npx @electron/rebuild -f -w ${moduleName} -m ${backendDir}/node_modules`,
                {
                    cwd: __dirname,
                    stdio: 'inherit'
                }
            );
            
            console.log(`  ✅ ${moduleName} 重新构建成功`);
        } catch (error) {
            console.error(`  ❌ ${moduleName} 重新构建失败:`, error.message);
            process.exit(1);
        }
    } else {
        console.log(`  ⚠️  ${moduleName} 未安装，跳过`);
    }
}

console.log('\n✅ 所有native模块重新构建完成！');
