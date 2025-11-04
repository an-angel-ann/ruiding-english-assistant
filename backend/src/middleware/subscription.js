require('dotenv').config();

// 根据配置加载对应的模型
const USE_SQLITE = process.env.USE_SQLITE === 'true';
const Subscription = USE_SQLITE ? require('../models/Subscription-sqlite') : require('../models/Subscription');

// 验证用户是否有有效订阅
async function requireSubscription(req, res, next) {
    try {
        const userId = req.user.id;
        
        const isActive = await Subscription.isSubscriptionActive(userId);
        
        if (!isActive) {
            return res.status(403).json({
                error: '订阅已过期',
                message: '您的订阅已过期，请续订以继续使用',
                code: 'SUBSCRIPTION_EXPIRED'
            });
        }
        
        next();
    } catch (error) {
        console.error('订阅验证错误:', error);
        return res.status(500).json({ error: '订阅验证失败' });
    }
}

module.exports = { requireSubscription };
