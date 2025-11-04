const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS配置
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true
}));

// 请求体解析
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// AI故事生成接口
app.post('/api/ai/generate-story', async (req, res) => {
    try {
        const { words } = req.body;
        
        // 模拟AI生成故事（实际项目中调用DeepSeek API）
        const story = `Once upon a time, there was a character who loved to learn ${words.join(', ')}. This character discovered that each word held a special meaning and power. By understanding these words, they could unlock new worlds of knowledge and communication. The journey of learning these ${words.length} words transformed their life in amazing ways.`;
        
        res.json({
            success: true,
            story: story,
            used_words: words
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 语音合成接口（使用Web Speech API的替代方案）
app.post('/api/tts/synthesize', (req, res) => {
    const { text } = req.body;
    
    // 返回文本，前端使用Web Speech API
    res.json({
        success: true,
        text: text,
        message: '请使用浏览器语音合成功能'
    });
});

// 用户注册接口（简化版）
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    
    // 模拟注册成功
    res.json({
        success: true,
        message: '注册成功',
        user: {
            id: 1,
            email: email,
            username: email.split('@')[0]
        }
    });
});

// 用户登录接口（简化版）
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // 模拟登录成功
    res.json({
        success: true,
        message: '登录成功',
        token: 'mock-jwt-token',
        user: {
            id: 1,
            email: email,
            username: email.split('@')[0]
        }
    });
});

// 获取用户信息接口
app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        user: {
            id: 1,
            email: 'demo@example.com',
            username: 'demo'
        }
    });
});

// 订阅状态接口
app.get('/api/subscription/status', (req, res) => {
    res.json({
        success: true,
        status: 'active',
        plan_type: 'monthly',
        end_date: '2025-12-31'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: "接口不存在" });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ========================================');
    console.log(`🎓 睿叮AI英语学习助手 - 本地开发版`);
    console.log(`📡 服务器运行在: http://localhost:${PORT}`);
    console.log(`🌍 环境: development`);
    console.log('========================================');
    console.log('');
    console.log('📌 可用接口:');
    console.log(`   POST /api/ai/generate-story - AI生成故事`);
    console.log(`   POST /api/tts/synthesize - 语音合成`);
    console.log(`   POST /api/auth/register - 用户注册`);
    console.log(`   POST /api/auth/login - 用户登录`);
    console.log(`   GET  /api/auth/me - 获取用户信息`);
    console.log(`   GET  /api/subscription/status - 订阅状态`);
    console.log('');
    console.log('🌐 前端访问地址:');
    console.log(`   http://localhost:${PORT}`);
    console.log('');
});
