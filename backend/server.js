const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 加载 SMTP 配置到环境变量
try {
    const smtpConfigPath = path.join(__dirname, '..', 'smtp-config.json');
    if (fs.existsSync(smtpConfigPath)) {
        const smtpConfig = JSON.parse(fs.readFileSync(smtpConfigPath, 'utf8'));
        process.env.SMTP_HOST = smtpConfig.host;
        process.env.SMTP_PORT = smtpConfig.port.toString();
        process.env.SMTP_USER = smtpConfig.user;
        process.env.SMTP_PASS = smtpConfig.pass;
        console.log('✅ SMTP 配置已加载到环境变量');
    } else {
        console.warn('⚠️ smtp-config.json 不存在，SMTP 功能将不可用');
    }
} catch (error) {
    console.error('❌ 加载 SMTP 配置失败:', error.message);
}

const { testConnection } = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const subscriptionRoutes = require('./src/routes/subscription');
const paymentRoutes = require('./src/routes/payment');
const proxyRoutes = require('./src/routes/proxy');
const aliProxyRoutes = require('./src/routes/ali-proxy');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));

// 请求体解析
app.use(express.json({limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 限流配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制100个请求
    message: '请求过于频繁，请稍后再试',
    handler: (req, res) => {
        res.status(429).json({
            error: '请求过于频繁，请稍后再试'
        });
    }
});
app.use('/api/', limiter);

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 根路径欢迎信息
app.get('/', (req, res) => {
    res.json({
        message: '睿叮AI英语学习助手 - 后端API服务',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            subscription: '/api/subscription',
            payment: '/api/payment',
            admin: '/api/admin'
        }
    });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/v1/services', aliProxyRoutes);

// 管理员路由（SQLite版本）
const adminRoutes = require('./src/routes/admin-sqlite');
app.use('/api/admin', adminRoutes);

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
// 404处理（必须放在所有路由之后）
app.use((req, res) => {
    res.status(404).json({ error: "接口不存在" });
});

async function startServer() {
    try {
        // 测试数据库连接
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ 数据库连接失败，服务器启动中止');
            // 在Electron环境中，不要调用process.exit，而是抛出错误让主进程处理
            if (process.type === 'renderer' || process.versions.electron) {
                throw new Error('数据库连接失败');
            }
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log('');
            console.log('🚀 ========================================');
            console.log(`🎓 睿叮AI英语学习助手 - 后端服务`);
            console.log(`📡 服务器运行在: http://localhost:${PORT}`);
            console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
            console.log('========================================');
            console.log('');
            console.log('📌 可用接口:');
            console.log(`   POST /api/auth/register - 用户注册`);
            console.log(`   POST /api/auth/login - 用户登录`);
            console.log(`   GET  /api/auth/me - 获取用户信息`);
            console.log(`   GET  /api/subscription/status - 订阅状态`);
            console.log(`   GET  /api/subscription/history - 订阅历史`);
            console.log(`   POST /api/subscription/create-order - 创建订单`);
            console.log(`   POST /api/subscription/cancel - 取消订阅`);
            console.log('');
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        // 在Electron环境中，不要调用process.exit，而是抛出错误让主进程处理
        if (process.type === 'renderer' || process.versions.electron) {
            throw error;
        }
        process.exit(1);
    }
}

startServer();

// 管理员路由
