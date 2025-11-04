#!/usr/bin/env node

// Windows构建脚本 - 禁用代码签名
// 必须在require之前设置环境变量
delete process.env.WIN_CSC_LINK;
delete process.env.WIN_CSC_KEY_PASSWORD;
delete process.env.CSC_LINK;
delete process.env.CSC_KEY_PASSWORD;
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const { build, Arch } = require('electron-builder');
const { Platform } = require('electron-builder');

// 读取package.json配置
const packageConfig = require('../package.json');

build({
  targets: Platform.WINDOWS.createTarget(['nsis', 'portable'], Arch.x64),
  config: {
    ...packageConfig.build,
    // 完全禁用签名
    forceCodeSigning: false,
    win: {
      ...packageConfig.build.win,
      // 不提供sign函数，electron-builder就不会尝试签名
      sign: undefined,
      signingHashAlgorithms: ['sha256'],
      signDlls: false
    }
  }
}).then(() => {
  console.log('✅ Windows构建完成！');
}).catch((error) => {
  console.error('❌ 构建失败:', error);
  process.exit(1);
});
