#!/bin/bash

# 在Mac上构建Windows版本的脚本
# 注意：这个脚本会尝试下载Windows预编译的better-sqlite3

set -e

echo "🔧 准备在Mac上构建Windows版本..."
echo ""

# 1. 备份当前的backend/node_modules
echo "📦 备份backend/node_modules..."
if [ -d "backend/node_modules" ]; then
    mv backend/node_modules backend/node_modules.mac.backup
    echo "✅ 已备份到 backend/node_modules.mac.backup"
fi

# 2. 为Windows平台安装依赖
echo ""
echo "📥 为Windows平台安装backend依赖..."
cd backend

# 设置环境变量，告诉npm我们要为Windows安装
export npm_config_platform=win32
export npm_config_arch=x64
export npm_config_target_platform=win32
export npm_config_target_arch=x64

# 安装依赖（会下载Windows预编译版本）
npm install --platform=win32 --arch=x64

cd ..

echo "✅ Windows依赖安装完成"
echo ""

# 3. 构建Windows版本
echo "🏗️  开始构建Windows版本..."
npm run build:win

echo ""
echo "✅ 构建完成！"
echo ""

# 4. 恢复macOS的node_modules
echo "🔄 恢复macOS的backend/node_modules..."
rm -rf backend/node_modules
if [ -d "backend/node_modules.mac.backup" ]; then
    mv backend/node_modules.mac.backup backend/node_modules
    echo "✅ 已恢复macOS版本的依赖"
fi

echo ""
echo "🎉 Windows安装包已生成:"
ls -lh dist/*.exe

echo ""
echo "⚠️  重要提示:"
echo "   由于在Mac上无法完全测试Windows版本，"
echo "   请在Windows系统上测试安装包是否能正常运行。"
echo "   如果仍然无法运行，需要在Windows系统上重新构建。"
