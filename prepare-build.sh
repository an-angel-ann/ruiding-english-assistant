#!/bin/bash

echo "🔧 准备打包..."

# 获取Electron版本
ELECTRON_VERSION=$(node -p "require('./package.json').devDependencies.electron.replace('^', '')")
echo "📦 Electron版本: $ELECTRON_VERSION"

# 进入backend目录
cd backend

echo "🗑️  清理旧的build..."
rm -rf node_modules/better-sqlite3/build

echo "🔨 为Electron编译better-sqlite3 (x64)..."
npm_config_target=$ELECTRON_VERSION \
npm_config_arch=x64 \
npm_config_target_arch=x64 \
npm_config_disturl=https://electronjs.org/headers \
npm_config_runtime=electron \
npm_config_build_from_source=true \
npm run --prefix node_modules/better-sqlite3 install > /dev/null 2>&1

# 保存x64版本
mkdir -p /tmp/better-sqlite3-build
cp node_modules/better-sqlite3/build/Release/better_sqlite3.node /tmp/better-sqlite3-build/better_sqlite3_x64.node
echo "✅ x64版本已编译"

echo "🔨 为Electron编译better-sqlite3 (arm64)..."
rm -rf node_modules/better-sqlite3/build
npm_config_target=$ELECTRON_VERSION \
npm_config_arch=arm64 \
npm_config_target_arch=arm64 \
npm_config_disturl=https://electronjs.org/headers \
npm_config_runtime=electron \
npm_config_build_from_source=true \
npm run --prefix node_modules/better-sqlite3 install > /dev/null 2>&1

# 保存arm64版本
cp node_modules/better-sqlite3/build/Release/better_sqlite3.node /tmp/better-sqlite3-build/better_sqlite3_arm64.node
echo "✅ arm64版本已编译"

echo "🔗 创建Universal二进制..."
lipo -create \
  /tmp/better-sqlite3-build/better_sqlite3_x64.node \
  /tmp/better-sqlite3-build/better_sqlite3_arm64.node \
  -output node_modules/better-sqlite3/build/Release/better_sqlite3.node

# 验证
echo "🔍 验证Universal二进制..."
file node_modules/better-sqlite3/build/Release/better_sqlite3.node

cd ..

echo "✅ 准备完成！可以开始打包了"
echo ""
echo "运行以下命令开始打包："
echo "  npm run build:mac"
