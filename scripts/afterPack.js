const path = require('path');
const fs = require('fs-extra');

exports.default = async function(context) {
    const appOutDir = context.appOutDir;
    const platform = context.electronPlatformName;
    
    console.log('\n🔧 afterPack: 处理 backend/node_modules...');
    console.log(`  平台: ${platform}`);
    console.log(`  输出目录: ${appOutDir}`);
    
    // 确定源和目标路径
    const sourceNodeModules = path.join(context.packager.projectDir, 'backend', 'node_modules');
    let targetBackendPath;
    
    if (platform === 'darwin') {
        targetBackendPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources', 'backend');
    } else if (platform === 'win32') {
        targetBackendPath = path.join(appOutDir, 'resources', 'backend');
    }
    
    const targetNodeModules = path.join(targetBackendPath, 'node_modules');
    
    console.log(`  源路径: ${sourceNodeModules}`);
    console.log(`  目标路径: ${targetNodeModules}`);
    
    // 检查源目录是否存在
    if (!fs.existsSync(sourceNodeModules)) {
        console.error(`  ❌ 源 node_modules 不存在: ${sourceNodeModules}`);
        throw new Error(`backend/node_modules not found. Run 'cd backend && npm install' first.`);
    }
    
    // 如果目标已存在，先删除
    if (fs.existsSync(targetNodeModules)) {
        console.log(`  ℹ️  删除现有的 node_modules...`);
        fs.removeSync(targetNodeModules);
    }
    
    // 复制 node_modules
    console.log(`  📦 复制 backend/node_modules...`);
    fs.copySync(sourceNodeModules, targetNodeModules, {
        dereference: true,
        filter: (src) => {
            // 排除不需要的文件
            if (src.includes('.bin')) return false;
            if (src.includes('test')) return false;
            if (src.includes('.md')) return false;
            return true;
        }
    });
    
    // 验证关键模块
    const nodemailerPath = path.join(targetNodeModules, 'nodemailer');
    const sqliteNodePath = path.join(targetNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
    
    if (fs.existsSync(nodemailerPath)) {
        console.log(`  ✅ nodemailer 已复制`);
    } else {
        console.error(`  ❌ nodemailer 未找到`);
        throw new Error(`nodemailer not found after copy`);
    }
    
    if (fs.existsSync(sqliteNodePath)) {
        console.log(`  ✅ better_sqlite3.node 已复制`);
    } else {
        console.error(`  ❌ better_sqlite3.node 未找到`);
        throw new Error(`better_sqlite3.node not found after copy`);
    }
    
    console.log(`  ✅ afterPack 完成`);
};
