#!/usr/bin/env node

// Windows构建脚本 - 禁用代码签名
// 必须在require之前设置环境变量
delete process.env.WIN_CSC_LINK;
delete process.env.WIN_CSC_KEY_PASSWORD;
delete process.env.CSC_LINK;
delete process.env.CSC_KEY_PASSWORD;
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const { execSync } = require('child_process');
const path = require('path');

// 使用命令行方式构建，通过环境变量完全禁用签名
try {
  console.log('🔨 开始构建Windows版本（无签名）...\n');
  
  execSync('npx electron-builder --win --x64', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      WIN_CSC_LINK: '',
      CSC_LINK: ''
    }
  });
  
  console.log('\n✅ Windows构建完成！');
} catch (error) {
  console.error('\n❌ 构建失败:', error.message);
  process.exit(1);
}
