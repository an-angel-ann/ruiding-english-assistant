# 🚀 GitHub Actions 快速开始

## 第一次使用？5分钟搞定！

### 步骤1: 推送代码到GitHub

```bash
# 如果还没有GitHub仓库，先创建一个
# 然后在项目目录执行：

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/睿叮AI英语学习助手.git
git push -u origin main
```

### 步骤2: 启用GitHub Actions

1. 进入GitHub仓库页面
2. 点击"Actions"标签
3. 如果提示"Get started with GitHub Actions"，点击"I understand my workflows, go ahead and enable them"

### 步骤3: 手动触发构建

1. 在Actions页面，点击左侧的"Build All Platforms"
2. 点击右侧的"Run workflow"按钮
3. 保持默认设置，点击绿色的"Run workflow"

### 步骤4: 等待构建完成

⏱️ 大约15-20分钟后，构建完成

### 步骤5: 下载安装包

1. 点击完成的workflow运行
2. 滚动到底部的"Artifacts"部分
3. 下载你需要的平台版本：
   - `windows-3.2.0.zip` - Windows版本
   - `macos-arm64-3.2.0.zip` - Mac M芯片版本
   - `macos-intel-3.2.0.zip` - Mac Intel版本

## 🎯 最常用的操作

### 构建新版本

```bash
# 1. 更新版本号（编辑package.json）
# 2. 提交并推送
git add .
git commit -m "Release v3.2.1"
git push

# 3. 创建标签
git tag v3.2.1
git push origin v3.2.1

# 4. 自动构建并发布到Releases
```

### 快速测试构建

1. 进入Actions页面
2. 点击"Build Windows Release"（或其他平台）
3. 点击"Run workflow"
4. 下载Artifacts测试

## ✅ 检查清单

- [ ] 代码已推送到GitHub
- [ ] Actions已启用
- [ ] 手动触发了第一次构建
- [ ] 构建成功完成
- [ ] 下载并测试了安装包

## 🆘 遇到问题？

### 构建失败

**查看日志**：
1. 点击失败的workflow
2. 点击红色❌的job
3. 展开失败的步骤
4. 查看错误信息

**常见错误**：
- `npm install failed` → 检查package.json
- `Build failed` → 检查代码语法
- `Permission denied` → 检查Actions权限

### 找不到Artifacts

**确认**：
- 构建是否完成（显示✅）
- 滚动到页面最底部
- 查看"Artifacts"部分

### 下载速度慢

**建议**：
- 使用代理或VPN
- 在非高峰时段下载
- 使用GitHub CLI工具

## 📚 更多信息

详细文档请查看：
- `GitHub-Actions使用指南.md` - 完整教程
- `Windows构建指南.md` - Windows本地构建
- `.github/workflows/` - Workflow配置文件

## 💡 提示

- ✅ 第一次构建可能需要更长时间（安装依赖）
- ✅ 后续构建会使用缓存，速度更快
- ✅ Artifacts保留30天，及时下载
- ✅ 可以同时运行多个workflow

---

**需要帮助？** 查看 `GitHub-Actions使用指南.md` 获取详细说明
