#!/bin/bash

set -e

echo "🔧 为Electron重新构建backend的native模块..."

# 获取Electron版本
ELECTRON_VERSION=$(node -p "require('./package.json').devDependencies.electron.replace('^', '')")
echo "📦 Electron版本: $ELECTRON_VERSION"

# 进入backend目录
cd backend

# 删除旧的构建
echo "🗑️  删除旧的构建..."
rm -rf node_modules/better-sqlite3/build

# 使用electron-rebuild重新构建
echo "🔨 使用electron-rebuild重新构建..."
cd ..
npx @electron/rebuild -f -w better-sqlite3 -p backend -v $ELECTRON_VERSION

# 验证
echo ""
echo "✅ 验证构建结果..."
if [ -f "backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ better_sqlite3.node 已生成"
    file backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node
    echo ""
    echo "🎉 重新构建完成！"
else
    echo "❌ better_sqlite3.node 未找到"
    exit 1
fi
