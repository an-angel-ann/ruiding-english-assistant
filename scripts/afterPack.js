const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
    const appOutDir = context.appOutDir;
    const platform = context.electronPlatformName;
    
    console.log('\n🔧 afterPack: 检查native模块...');
    console.log(`  平台: ${platform}`);
    console.log(`  输出目录: ${appOutDir}`);
    
    // 跳过native模块重新编译，直接使用npm安装的预编译版本
    console.log(`  ℹ️  跳过native模块重新编译`);
    console.log(`  ℹ️  使用npm install时下载的预编译版本`);
    
    // 验证better-sqlite3是否存在
    let backendPath;
    if (platform === 'darwin') {
        backendPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources', 'backend');
    } else if (platform === 'win32') {
        backendPath = path.join(appOutDir, 'resources', 'backend');
    }
    
    const sqliteNodePath = path.join(backendPath, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(sqliteNodePath)) {
        console.log(`  ✅ better_sqlite3.node 已存在: ${sqliteNodePath}`);
    } else {
        console.error(`  ❌ better_sqlite3.node 不存在: ${sqliteNodePath}`);
        throw new Error(`better_sqlite3.node not found at ${sqliteNodePath}. Build must be stopped.`);
    }
    
    console.log(`  ✅ afterPack 完成`);
};
