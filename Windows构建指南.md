# Windows版本构建指南

## 问题说明

在macOS上打包的Windows版本会出现以下错误：
```
better_sqlite3.node is not a valid Win32 application
```

这是因为native模块（better-sqlite3）无法在Mac上交叉编译为Windows版本。

## 解决方案

### 方案1：在Windows系统上本地构建（推荐）

#### 1. 准备Windows环境

**系统要求**：
- Windows 10 (64位) 或 Windows 11
- 至少 8GB RAM
- 至少 10GB 可用磁盘空间

**安装必要软件**：

1. **Node.js** (v18或更高)
   - 下载: https://nodejs.org/
   - 选择LTS版本
   - 安装时勾选"Add to PATH"

2. **Python** (v3.8-3.11)
   - 下载: https://www.python.org/downloads/
   - 安装时勾选"Add Python to PATH"
   - 勾选"Install pip"

3. **Visual Studio Build Tools**
   - 下载: https://visualstudio.microsoft.com/downloads/
   - 选择"Build Tools for Visual Studio 2022"
   - 安装时选择"Desktop development with C++"组件

4. **Git** (可选，用于克隆代码)
   - 下载: https://git-scm.com/download/win

#### 2. 克隆或复制项目

```bash
# 方法1: 使用Git克隆
git clone <repository-url>
cd 睿叮AI英语学习助手

# 方法2: 直接复制项目文件夹到Windows系统
```

#### 3. 安装依赖

打开PowerShell或命令提示符：

```bash
# 安装主项目依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

#### 4. 构建Windows版本

```bash
# 构建Windows x64版本
npm run build:win
```

构建过程需要5-10分钟，生成的文件位于 `dist` 目录：
- `睿叮AI英语学习助手-v3.2.0-x64.exe` - 安装程序
- `睿叮AI英语学习助手-v3.2.0-portable.exe` - 便携版

#### 5. 测试安装包

1. 双击安装程序测试
2. 确认应用能正常启动
3. 测试主要功能

### 方案2：使用GitHub Actions自动构建

#### 1. 配置GitHub Actions

项目中已包含 `.github/workflows/build-windows.yml` 配置文件。

#### 2. 触发构建

**方法1: 推送标签**
```bash
git tag v3.2.0
git push origin v3.2.0
```

**方法2: 手动触发**
1. 进入GitHub仓库
2. 点击"Actions"标签
3. 选择"Build Windows Release"
4. 点击"Run workflow"

#### 3. 下载构建产物

1. 构建完成后，进入Actions页面
2. 点击对应的workflow运行
3. 在"Artifacts"部分下载 `windows-installers`

### 方案3：使用虚拟机

#### 1. 安装虚拟机软件

**Mac用户**：
- Parallels Desktop (推荐，性能好)
- VMware Fusion
- VirtualBox (免费)

**Windows用户**：
- VMware Workstation
- VirtualBox

#### 2. 安装Windows虚拟机

1. 下载Windows 10/11 ISO
   - 官方下载: https://www.microsoft.com/software-download/
2. 创建虚拟机
   - 分配至少 4GB RAM
   - 分配至少 50GB 磁盘空间
3. 安装Windows系统

#### 3. 在虚拟机中构建

按照"方案1"的步骤在虚拟机中构建。

## 构建脚本说明

### package.json 中的构建命令

```json
{
  "scripts": {
    "build:win": "electron-builder --win --x64"
  }
}
```

### afterPack.js 脚本

在Mac上打包Windows版本时，脚本会自动跳过native模块编译：

```javascript
// 如果在Mac上打包Windows版本，跳过native模块编译
if (hostPlatform === 'darwin' && platform === 'win32') {
    console.log('⚠️ 在Mac上打包Windows版本，跳过native模块编译');
    return;
}
```

## 常见问题

### Q: 构建时出现 "Python not found" 错误？
A: 
1. 确认已安装Python 3.8-3.11
2. 确认Python已添加到PATH
3. 重启命令行窗口

### Q: 构建时出现 "MSBuild not found" 错误？
A: 
1. 安装Visual Studio Build Tools
2. 确保选择了"Desktop development with C++"组件
3. 重启系统

### Q: 构建时出现 "node-gyp" 错误？
A: 
```bash
npm install -g node-gyp
npm install -g windows-build-tools
```

### Q: 构建的exe文件很大？
A: 这是正常的，Electron应用包含了完整的Chromium和Node.js运行时。

### Q: 可以在Mac上使用Wine运行Windows版本吗？
A: 不推荐，Wine对Electron应用的支持不完善。

## 验证构建结果

### 检查文件

```bash
# 检查文件是否存在
dir dist\*.exe

# 检查文件大小（应该在80-90MB左右）
```

### 测试安装

1. 双击安装程序
2. 选择安装路径
3. 完成安装
4. 启动应用
5. 测试主要功能：
   - 用户登录
   - 句子学习
   - 单词学习
   - 段落学习
   - 生词本复习

## 发布检查清单

- [ ] 在Windows系统上构建
- [ ] 测试安装程序
- [ ] 测试便携版
- [ ] 验证所有功能正常
- [ ] 检查文件大小合理
- [ ] 更新版本号
- [ ] 更新CHANGELOG
- [ ] 创建Release Notes
- [ ] 上传到发布平台

## 技术说明

### 为什么不能交叉编译？

1. **Native模块依赖**
   - better-sqlite3包含C++代码
   - 需要针对目标平台编译
   - 编译工具链平台特定

2. **二进制兼容性**
   - .node文件是平台特定的二进制文件
   - Mac的.node文件无法在Windows上运行
   - Windows的.node文件无法在Mac上运行

3. **构建工具链**
   - Windows需要MSVC或MinGW
   - Mac需要Xcode Command Line Tools
   - 无法在一个平台上模拟另一个平台的工具链

### 替代方案的局限性

1. **预编译二进制**
   - better-sqlite3提供预编译版本
   - 但Electron版本需要特定编译
   - 版本匹配复杂

2. **Docker**
   - Windows容器需要Windows主机
   - 无法在Mac/Linux上运行Windows容器
   - 不适合桌面应用构建

## 参考资源

- [Electron Builder文档](https://www.electron.build/)
- [better-sqlite3文档](https://github.com/WiseLibs/better-sqlite3)
- [Node.js Native Addons](https://nodejs.org/api/addons.html)
- [GitHub Actions文档](https://docs.github.com/actions)

---
更新日期: 2025年11月5日
版本: v3.2.0
