#!/usr/bin/env node

// Windows构建脚本 - 禁用代码签名
const { execSync } = require('child_process');
const path = require('path');

// 准备环境变量
const env = { ...process.env };
// 删除所有签名相关的环境变量
delete env.WIN_CSC_LINK;
delete env.WIN_CSC_KEY_PASSWORD;
delete env.CSC_LINK;
delete env.CSC_KEY_PASSWORD;
// 禁用自动发现签名证书
env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

// 使用命令行方式构建
try {
  console.log('🔨 开始构建Windows版本（无签名）...\n');
  
  execSync('npx electron-builder --win --x64', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: env
  });
  
  console.log('\n✅ Windows构建完成！');
} catch (error) {
  console.error('\n❌ 构建失败:', error.message);
  process.exit(1);
}
