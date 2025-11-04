# 睿叮AI英语学习助手

基于AI的智能英语学习桌面应用，支持句子学习、单词学习、段落学习和生词本复习。

![Version](https://img.shields.io/badge/version-3.2.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 主要功能

### 📝 句子学习
- 词义辨别：拖拽匹配单词和释义
- 结构分析：识别句子成分
- 句子重组：打乱顺序重新排列
- 句子回忆：英中互译记忆

### 📚 单词学习
- 单词上传：支持图片OCR识别
- 词义匹配：拖拽学习
- 闪卡记忆：翻转卡片记忆
- 拼写练习：键盘输入练习

### 📖 段落学习
- 通篇浏览：选中生词
- 句义辨别：匹配句子和翻译
- 结构分析：理解句群关系
- 段落自查：排序句子
- 段落理解：AI生成选择题
- 段落总结：匹配段落和总结

### 📗 生词本复习
- 遮盖式记忆：翻转卡片
- 记忆追踪：标记掌握程度
- 智能复习：优先复习未掌握词汇

## 🚀 快速开始

### 下载安装

#### Windows
- 安装程序: `睿叮AI英语学习助手-v3.2.0-x64.exe`
- 便携版: `睿叮AI英语学习助手-v3.2.0-portable.exe`

#### macOS (Apple Silicon)
- DMG: `睿叮AI英语学习助手-3.2.0-arm64.dmg`
- ZIP: `睿叮AI英语学习助手-3.2.0-arm64-mac.zip`

#### macOS (Intel)
- DMG: `睿叮AI英语学习助手-3.2.0.dmg`
- ZIP: `睿叮AI英语学习助手-3.2.0-mac.zip`

### 首次运行

**Windows**:
1. 双击安装程序
2. 如提示"Windows已保护你的电脑"，点击"更多信息" → "仍要运行"

**macOS**:
```bash
sudo xattr -rd com.apple.quarantine /Applications/睿叮AI英语学习助手.app
```

## 🛠️ 开发

### 环境要求

- Node.js 18+
- Python 3.8+
- npm 或 yarn

### 安装依赖

```bash
# 安装主项目依赖
npm install

# 安装后端依赖
cd backend
npm install
```

### 运行开发环境

```bash
# 启动后端服务器
cd backend
npm start

# 启动前端服务器（新终端）
cd frontend
python3 -m http.server 8080

# 启动Electron（新终端）
npm run dev
```

### 构建安装包

#### 本地构建

```bash
# macOS ARM64
npm run build:mac-arm

# macOS Intel
npm run build:mac-intel

# Windows (需要在Windows系统上)
npm run build:win
```

#### 使用GitHub Actions（推荐）

详见 [快速开始-GitHub-Actions.md](./快速开始-GitHub-Actions.md)

1. 推送代码到GitHub
2. 进入Actions页面
3. 运行"Build All Platforms"
4. 下载构建产物

## 📦 项目结构

```
睿叮AI英语学习助手/
├── frontend/              # 前端代码
│   ├── index.html        # 主页面
│   ├── learning.js       # 句子学习
│   ├── word-learning.js  # 单词学习
│   ├── paragraph-learning.js  # 段落学习
│   └── styles.css        # 样式
├── backend/              # 后端代码
│   ├── server.js         # Express服务器
│   ├── src/
│   │   ├── routes/       # API路由
│   │   └── middleware/   # 中间件
│   └── data/
│       └── ruiding.db    # SQLite数据库
├── electron/             # Electron主进程
│   ├── main.js          # 主进程入口
│   └── preload.js       # 预加载脚本
├── .github/
│   └── workflows/       # GitHub Actions配置
└── dist/                # 构建输出
```

## 🔧 技术栈

- **前端**: HTML, CSS, JavaScript
- **后端**: Node.js, Express
- **数据库**: SQLite (better-sqlite3)
- **桌面框架**: Electron
- **AI服务**: 阿里云通义千问
- **构建工具**: electron-builder
- **CI/CD**: GitHub Actions

## 📝 版本历史

### v3.2.0 (2025-11-05)
- ✅ 修复生词本复习按钮无响应问题
- ✅ 修复段落学习UI重叠问题
- ✅ 优化用户界面，默认关闭开发者工具
- ✅ 配置GitHub Actions自动构建

### v3.0.3
- 初始发布版本

## 📄 文档

- [安装包说明](./dist/安装包说明-v3.2.0.md)
- [Windows构建指南](./Windows构建指南.md)
- [GitHub Actions使用指南](./GitHub-Actions使用指南.md)
- [快速开始-GitHub Actions](./快速开始-GitHub-Actions.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如遇到问题，请：
1. 查看文档
2. 提交Issue
3. 联系技术支持

## 📜 许可证

MIT License

---

**开发团队**: Ruiding Team  
**发布日期**: 2025年11月5日  
**版本**: v3.2.0
