#!/bin/bash

# 从npm下载Windows版本的better-sqlite3并提取.node文件

echo "🔍 尝试从npm获取Windows版本的better-sqlite3..."

cd backend

# 创建临时目录
TMP_DIR=$(mktemp -d)
echo "📁 临时目录: $TMP_DIR"

cd "$TMP_DIR"

# 下载包
echo "📦 下载better-sqlite3..."
npm pack better-sqlite3@12.4.1

# 解压
echo "📂 解压..."
tar -xzf better-sqlite3-12.4.1.tgz

# 进入包目录
cd package

# 安装依赖并为Windows编译
echo "🔨 尝试编译Windows版本..."
npm install --ignore-scripts

# 设置环境变量并编译
export npm_config_target=28.3.3
export npm_config_arch=x64
export npm_config_target_arch=x64
export npm_config_platform=win32
export npm_config_disturl=https://electronjs.org/headers
export npm_config_runtime=electron
export npm_config_build_from_source=true

# 尝试编译
npm run install || echo "编译可能失败"

# 检查是否生成了.node文件
if [ -f "build/Release/better_sqlite3.node" ]; then
    echo "✅ 找到better_sqlite3.node"
    file build/Release/better_sqlite3.node
    
    # 复制到项目
    TARGET_DIR="$(dirname "$TMP_DIR")/../../backend/node_modules/better-sqlite3/build/Release"
    mkdir -p "$TARGET_DIR"
    cp build/Release/better_sqlite3.node "$TARGET_DIR/"
    echo "✅ 已复制到: $TARGET_DIR"
else
    echo "❌ 未找到better_sqlite3.node"
fi

# 清理
cd ../..
rm -rf "$TMP_DIR"

echo "完成"
