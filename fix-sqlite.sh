#!/bin/bash

set -e

echo "🔧 修复better-sqlite3模块..."

# 1. 在backend中重新安装better-sqlite3，使用Electron的配置
cd backend

echo "📦 重新安装better-sqlite3..."
npm uninstall better-sqlite3
npm install better-sqlite3 --save

# 2. 回到根目录，使用electron-rebuild重新构建
cd ..

echo "🔨 使用electron-rebuild重新构建..."
# 创建临时package.json来欺骗electron-rebuild
cp backend/package.json backend/package.json.bak
cat > backend/package.json << 'EOF'
{
  "name": "backend-temp",
  "version": "1.0.0",
  "dependencies": {
    "better-sqlite3": "^12.4.1"
  }
}
EOF

# 运行electron-rebuild
npx @electron/rebuild -f -m backend/node_modules -v 28.0.0

# 恢复原package.json
mv backend/package.json.bak backend/package.json

# 3. 验证
echo ""
echo "✅ 验证构建结果..."
if [ -f "backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ better_sqlite3.node 已生成"
    file backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node
    
    # 检查是否为正确的架构
    if file backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node | grep -q "arm64"; then
        echo "✅ 架构正确: ARM64"
    fi
    
    echo ""
    echo "🎉 修复完成！"
else
    echo "❌ better_sqlite3.node 未找到"
    exit 1
fi
