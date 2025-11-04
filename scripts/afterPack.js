const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
    const appOutDir = context.appOutDir;
    const platform = context.electronPlatformName;
    const arch = context.arch;
    const hostPlatform = process.platform;
    
    console.log('\n🔧 afterPack: 重新编译native模块...');
    console.log(`  平台: ${platform}`);
    console.log(`  架构: ${arch}`);
    console.log(`  主机平台: ${hostPlatform}`);
    console.log(`  输出目录: ${appOutDir}`);
    
    // 如果在Mac上打包Windows版本，使用预编译版本
    if (hostPlatform === 'darwin' && platform === 'win32') {
        console.log(`  ⚠️  在Mac上打包Windows版本`);
        console.log(`  ℹ️  Mac无法为Windows编译native模块`);
        console.log(`  ℹ️  将使用npm安装的预编译版本`);
        console.log(`  ⚠️  如果应用无法启动，请在Windows系统上重新构建`);
        return; // 跳过重新编译，使用npm install时下载的预编译版本
    }
    
    let backendPath;
    if (platform === 'darwin') {
        backendPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources', 'backend');
    } else if (platform === 'win32') {
        backendPath = path.join(appOutDir, 'resources', 'backend');
    }
    
    console.log(`  Backend路径: ${backendPath}`);
    
    if (!fs.existsSync(backendPath)) {
        console.log(`  ⚠️  Backend路径不存在，跳过`);
        return;
    }
    
    try {
        // 针对Electron重新编译better-sqlite3
        console.log(`  🔨 重新编译 better-sqlite3 for Electron...`);
        
        // 从package.json读取Electron版本
        const packageJson = require(path.join(__dirname, '..', 'package.json'));
        const electronVersion = packageJson.devDependencies.electron.replace('^', '');
        
        console.log(`  Electron版本: ${electronVersion}`);
        console.log(`  目标架构: ${arch}`);
        
        // 使用electron-rebuild重新编译
        const archMap = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64', 4: 'universal' };
        const targetArch = archMap[arch] || 'x64';
        
        const rebuildCmd = `npx electron-rebuild -v ${electronVersion} -f -w better-sqlite3 -a ${targetArch} -o better-sqlite3`;
        console.log(`  执行命令: ${rebuildCmd}`);
        
        try {
            execSync(rebuildCmd, {
                cwd: backendPath,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    npm_config_target: electronVersion,
                    npm_config_arch: targetArch,
                    npm_config_target_arch: targetArch,
                    npm_config_disturl: 'https://electronjs.org/headers',
                    npm_config_runtime: 'electron',
                    npm_config_build_from_source: 'true'
                }
            });
        } catch (rebuildError) {
            console.log(`  ⚠️  electron-rebuild失败，尝试使用node-gyp直接编译...`);
            
            // 尝试直接使用node-gyp编译better-sqlite3
            const sqlitePath = path.join(backendPath, 'node_modules', 'better-sqlite3');
            if (fs.existsSync(sqlitePath)) {
                try {
                    execSync(`npm rebuild better-sqlite3 --build-from-source`, {
                        cwd: backendPath,
                        stdio: 'inherit',
                        env: {
                            ...process.env,
                            npm_config_target: electronVersion,
                            npm_config_arch: targetArch,
                            npm_config_runtime: 'electron',
                            npm_config_disturl: 'https://electronjs.org/headers'
                        }
                    });
                } catch (nodeGypError) {
                    console.log(`  ⚠️  node-gyp也失败了，使用预编译版本`);
                    // 继续，使用npm安装的预编译版本
                }
            }
        }
        
        const sqliteNodePath = path.join(backendPath, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
        
        if (fs.existsSync(sqliteNodePath)) {
            console.log(`  ✅ better_sqlite3.node 编译成功`);
        } else {
            throw new Error('better_sqlite3.node not found after rebuild');
        }
    } catch (error) {
        console.error(`  ❌ 编译失败:`, error.message);
        throw error;
    }
};
