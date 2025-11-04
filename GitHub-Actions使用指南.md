# GitHub Actions 自动构建使用指南

## 📋 概述

本项目配置了GitHub Actions自动构建，可以在云端自动编译Windows和macOS版本的安装包，无需本地环境。

## 🎯 可用的Workflows

### 1. Build All Platforms（推荐）
**文件**: `.github/workflows/build-all-platforms.yml`

**功能**: 一次性构建所有平台版本
- Windows x64 (安装程序 + 便携版)
- macOS ARM64 (M芯片)
- macOS Intel

**触发方式**:
- 推送版本标签 (如 `v3.2.0`)
- 手动触发

### 2. Build Windows Release
**文件**: `.github/workflows/build-windows.yml`

**功能**: 仅构建Windows版本

### 3. Build macOS Release
**文件**: `.github/workflows/build-macos.yml`

**功能**: 仅构建macOS版本（ARM64 + Intel）

## 🚀 使用方法

### 方法1: 推送标签触发（推荐用于正式发布）

#### 步骤1: 更新版本号

编辑 `package.json`:
```json
{
  "version": "3.2.0"
}
```

#### 步骤2: 提交更改

```bash
git add .
git commit -m "Release v3.2.0"
```

#### 步骤3: 创建并推送标签

```bash
# 创建标签
git tag v3.2.0

# 推送代码和标签
git push origin main
git push origin v3.2.0
```

#### 步骤4: 等待构建完成

1. 进入GitHub仓库
2. 点击"Actions"标签
3. 查看构建进度（约15-20分钟）
4. 构建完成后，在"Releases"页面查看发布

### 方法2: 手动触发（推荐用于测试）

#### 步骤1: 进入Actions页面

1. 打开GitHub仓库
2. 点击顶部的"Actions"标签

#### 步骤2: 选择Workflow

选择以下之一：
- "Build All Platforms" - 构建所有平台
- "Build Windows Release" - 仅Windows
- "Build macOS Release" - 仅macOS

#### 步骤3: 运行Workflow

1. 点击右侧的"Run workflow"按钮
2. 选择分支（通常是 `main`）
3. 输入版本号（如 `3.2.0`）
4. 点击绿色的"Run workflow"按钮

#### 步骤4: 下载构建产物

1. 等待构建完成（约15-20分钟）
2. 点击完成的workflow运行
3. 滚动到底部的"Artifacts"部分
4. 下载对应平台的安装包

## 📥 下载构建产物

### 从Artifacts下载（手动触发）

1. 进入Actions页面
2. 点击完成的workflow运行
3. 在"Artifacts"部分找到：
   - `windows-3.2.0` - Windows安装包
   - `macos-arm64-3.2.0` - macOS M芯片版本
   - `macos-intel-3.2.0` - macOS Intel版本
4. 点击下载（会下载为zip文件）
5. 解压后即可使用

### 从Releases下载（标签触发）

1. 进入仓库主页
2. 点击右侧的"Releases"
3. 找到对应版本（如 `v3.2.0`）
4. 在"Assets"部分直接下载安装包

## ⏱️ 构建时间

| 平台 | 预计时间 |
|------|---------|
| Windows | 10-15分钟 |
| macOS ARM64 | 8-12分钟 |
| macOS Intel | 8-12分钟 |
| **全平台** | **15-20分钟** |

## 🔍 查看构建日志

### 实时查看

1. 进入Actions页面
2. 点击正在运行的workflow
3. 点击具体的job（如"Build Windows"）
4. 展开各个步骤查看详细日志

### 关键步骤

- **Install dependencies**: 安装npm包
- **Build Windows/macOS**: 编译和打包
- **Upload artifacts**: 上传构建产物

## ❌ 常见问题

### Q: 构建失败怎么办？

**A**: 查看构建日志，常见原因：

1. **依赖安装失败**
   - 检查 `package.json` 是否正确
   - 查看npm install日志

2. **编译失败**
   - 检查代码是否有语法错误
   - 查看electron-builder日志

3. **权限问题**
   - 确保仓库设置中启用了Actions
   - 检查GITHUB_TOKEN权限

### Q: 如何查看构建进度？

**A**: 
1. Actions页面会显示实时进度
2. 可以展开每个步骤查看详细输出
3. 构建完成后会显示✅或❌

### Q: Artifacts保留多久？

**A**: 
- 默认保留30天
- 可以在workflow文件中修改 `retention-days`

### Q: 如何取消正在运行的构建？

**A**: 
1. 进入Actions页面
2. 点击正在运行的workflow
3. 点击右上角的"Cancel workflow"

### Q: 构建的文件在哪里？

**A**: 
- **手动触发**: 在Artifacts部分下载
- **标签触发**: 在Releases页面下载

## 🔧 自定义配置

### 修改构建平台

编辑 `.github/workflows/build-all-platforms.yml`:

```yaml
jobs:
  build-windows:  # 保留
    # ...
  
  build-macos-arm:  # 可以注释掉不需要的
    # ...
  
  build-macos-intel:  # 可以注释掉不需要的
    # ...
```

### 修改Node.js版本

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'  # 改为其他版本
```

### 修改保留时间

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    retention-days: 30  # 改为其他天数
```

## 📊 构建状态徽章

在README.md中添加构建状态徽章：

```markdown
![Build All Platforms](https://github.com/你的用户名/睿叮AI英语学习助手/workflows/Build%20All%20Platforms/badge.svg)
```

## 🎓 最佳实践

### 1. 版本发布流程

```bash
# 1. 更新版本号
# 编辑 package.json

# 2. 提交更改
git add .
git commit -m "Bump version to 3.2.0"

# 3. 创建标签
git tag v3.2.0

# 4. 推送
git push origin main
git push origin v3.2.0

# 5. 等待自动构建和发布
```

### 2. 测试新功能

```bash
# 1. 在feature分支开发
git checkout -b feature/new-feature

# 2. 提交更改
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 3. 手动触发构建测试
# 在GitHub Actions页面手动运行
```

### 3. 快速修复

```bash
# 1. 创建hotfix分支
git checkout -b hotfix/3.2.1

# 2. 修复bug并提交
git add .
git commit -m "Fix critical bug"

# 3. 合并到main
git checkout main
git merge hotfix/3.2.1

# 4. 创建新标签
git tag v3.2.1
git push origin main v3.2.1
```

## 📝 Workflow文件说明

### build-all-platforms.yml

**优点**:
- 一次构建所有平台
- 自动创建Release
- 并行构建，速度快

**适用场景**:
- 正式版本发布
- 需要所有平台的安装包

### build-windows.yml

**优点**:
- 只构建Windows版本
- 速度快
- 节省构建时间

**适用场景**:
- 只需要Windows版本
- 快速测试Windows构建

### build-macos.yml

**优点**:
- 构建两个macOS版本
- 一次性完成

**适用场景**:
- 只需要macOS版本
- 测试macOS构建

## 🔐 安全注意事项

1. **不要提交敏感信息**
   - API密钥
   - 密码
   - 证书

2. **使用GitHub Secrets**
   - 在仓库设置中添加Secrets
   - 在workflow中引用: `${{ secrets.SECRET_NAME }}`

3. **限制权限**
   - 只授予必要的权限
   - 定期审查Actions权限

## 📞 获取帮助

如果遇到问题：

1. **查看官方文档**
   - [GitHub Actions文档](https://docs.github.com/actions)
   - [Electron Builder文档](https://www.electron.build/)

2. **查看构建日志**
   - 详细的错误信息通常在日志中

3. **搜索类似问题**
   - GitHub Issues
   - Stack Overflow

## 🎉 成功案例

构建成功后，你会看到：

```
✅ Build Windows - 完成 (12分钟)
✅ Build macOS ARM64 - 完成 (10分钟)
✅ Build macOS Intel - 完成 (10分钟)
✅ Create Release - 完成 (1分钟)
```

在Releases页面会自动创建新版本，包含：
- 所有平台的安装包
- 自动生成的Release Notes
- 文件大小和下载链接

---

**更新日期**: 2025年11月5日  
**版本**: v3.2.0  
**作者**: Ruiding Team
