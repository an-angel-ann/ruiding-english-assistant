const jwt = require('jsonwebtoken');
require('dotenv').config();

// 根据配置加载对应的模型
const USE_SQLITE = process.env.USE_SQLITE === 'true';
const User = USE_SQLITE ? require('../models/User-sqlite') : require('../models/User');

// 验证JWT Token
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: '未提供认证令牌' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 验证用户是否存在且状态正常
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: '用户不存在或已被禁用' });
        }

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: user.role,
        };
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '无效的认证令牌' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '认证令牌已过期' });
        }
        console.error('认证错误:', error);
        return res.status(500).json({ error: '认证失败' });
    }
}

// 生成JWT Token
function generateToken(userId, email) {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
}

module.exports = { authenticateToken, generateToken };
