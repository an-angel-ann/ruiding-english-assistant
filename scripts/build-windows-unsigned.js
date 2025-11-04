#!/usr/bin/env node

// Windows构建脚本 - 禁用代码签名
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
process.env.WIN_CSC_LINK = undefined;
process.env.WIN_CSC_KEY_PASSWORD = undefined;

const { build } = require('electron-builder');

build({
  targets: require('electron-builder').Platform.WINDOWS.createTarget(),
  config: {
    win: {
      sign: null,  // 明确设置为null
      signingHashAlgorithms: null,
      signDlls: false,
      verifyUpdateCodeSignature: false
    }
  }
}).then(() => {
  console.log('✅ Windows构建完成！');
}).catch((error) => {
  console.error('❌ 构建失败:', error);
  process.exit(1);
});
