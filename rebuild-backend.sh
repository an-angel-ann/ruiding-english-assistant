#!/bin/bash

echo "🔧 重新构建backend的native模块..."

# 获取Electron版本
ELECTRON_VERSION=$(node -p "require('./package.json').devDependencies.electron.replace('^', '')")
echo "📦 Electron版本: $ELECTRON_VERSION"

# 进入backend目录
cd backend

# 设置环境变量
export npm_config_target=$ELECTRON_VERSION
export npm_config_arch=arm64
export npm_config_target_arch=arm64
export npm_config_disturl=https://electronjs.org/headers
export npm_config_runtime=electron
export npm_config_build_from_source=true

echo ""
echo "🔨 重新构建 better-sqlite3..."
cd node_modules/better-sqlite3
rm -rf build
npm run install --build-from-source
cd ../..

echo ""
echo "✅ 重新构建完成！"

# 验证.node文件是否存在
if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ better_sqlite3.node 文件已生成"
    file node_modules/better-sqlite3/build/Release/better_sqlite3.node
else
    echo "❌ better_sqlite3.node 文件未找到"
    exit 1
fi
