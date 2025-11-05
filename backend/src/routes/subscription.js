const express = require('express');
const router = express.Router();
require('dotenv').config();

// 根据配置加载对应的模型
// 在Electron环境中默认使用SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.versions.electron;
const Subscription = USE_SQLITE ? require('../models/Subscription-sqlite') : require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');
const { pool } = USE_SQLITE ? {} : require('../config/database');
const { db } = USE_SQLITE ? require('../config/database-sqlite') : {};
const XunhuPay = require('../utils/xunhupay');

// 初始化虎皮椒支付
console.log('🔧 虎皮椒支付配置检查:');
console.log('   APPID:', process.env.XUNHU_APPID ? '已配置' : '❌ 未配置');
console.log('   APPSECRET:', process.env.XUNHU_APPSECRET ? '已配置' : '❌ 未配置');
console.log('   GATEWAY:', process.env.XUNHU_GATEWAY || '❌ 未配置');
console.log('   NOTIFY_URL:', process.env.XUNHU_NOTIFY_URL || '❌ 未配置');

const xunhuPay = new XunhuPay({
    appid: process.env.XUNHU_APPID,
    appsecret: process.env.XUNHU_APPSECRET,
    gateway: process.env.XUNHU_GATEWAY,
    notifyUrl: process.env.XUNHU_NOTIFY_URL
});

// 获取订阅信息
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.getActiveSubscription(req.user.id);
        
        if (!subscription) {
            return res.json({
                hasSubscription: false,
                message: '您当前没有有效订阅'
            });
        }

        res.json({
            hasSubscription: true,
            subscription: {
                planType: subscription.plan_type,
                startDate: subscription.start_date,
                endDate: subscription.end_date,
                status: subscription.status,
                autoRenew: subscription.auto_renew,
                daysRemaining: Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24))
            }
        });
    } catch (error) {
        console.error('获取订阅状态错误:', error);
        res.status(500).json({ error: '获取订阅状态失败' });
    }
});

// 获取订阅历史
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const history = await Subscription.getHistory(req.user.id);
        
        res.json({
            success: true,
            subscriptions: history.map(sub => ({
                plan_type: sub.plan_type,
                start_date: sub.start_date,
                end_date: sub.end_date,
                status: sub.status,
                created_at: sub.created_at
            }))
        });
    } catch (error) {
        console.error('获取订阅历史错误:', error);
        res.status(500).json({ error: '获取订阅历史失败' });
    }
});

// 获取AI Key（仅付费用户）
router.get('/api-key', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const hasSubscription = await Subscription.isSubscriptionActive(userId);
        
        if (hasSubscription) {
            res.json({
                success: true,
                hasApiKey: true,
                apiKey: process.env.DEFAULT_API_KEY
            });
        } else {
            res.json({
                success: true,
                hasApiKey: false
            });
        }
    } catch (error) {
        console.error('获取AI Key失败:', error);
        res.status(500).json({ error: '获取AI Key失败' });
    }
});

// 取消订阅
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.getActiveSubscription(req.user.id);
        
        if (!subscription) {
            return res.status(400).json({ error: '没有可取消的订阅' });
        }

        await Subscription.cancel(subscription.id);

        res.json({
            success: true,
            message: '订阅已取消，将在到期后失效'
        });
    } catch (error) {
        console.error('取消订阅错误:', error);
        res.status(500).json({ error: '取消订阅失败' });
    }
});

// 创建订阅订单（准备支付）
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { planType } = req.body;
        const userId = req.user.id;

        console.log('收到订阅订单请求，planType:', planType);

        // 定价配置
        const plans = {
            'trial_7days_1yuan': {
                amount: 1,
                days: 7,
                name: '新客福利-7天体验'  // 虎皮椒会显示这个标题和amount金额
            },
            'monthly': {
                amount: 29,
                days: 31,
                name: '月度会员'
            },
            'yearly': {
                amount: 299,
                days: 365,
                name: '年度会员'
            }
        };

        if (!plans[planType]) {
            console.log('无效的订阅类型:', planType);
            return res.status(400).json({ error: '无效的订阅类型' });
        }

        const plan = plans[planType];
        console.log('选择的计划:', plan);

        // 创建订单记录
        let result;
        if (USE_SQLITE) {
            result = await db.runAsync(
                `INSERT INTO payment_orders (user_id, plan_type, amount, status) 
                 VALUES (?, ?, ?, 'pending')`,
                [userId, planType, plan.amount]
            );
        } else {
            const [rows] = await pool.query(
                `INSERT INTO payment_orders (user_id, plan_type, amount, status) 
                 VALUES (?, ?, ?, 'pending')`,
                [userId, planType, plan.amount]
            );
            result = { lastID: rows.insertId };
        }

        const orderId = result.lastID;

        // 调用虎皮椒创建支付订单
        try {
            // 构建返回URL，包含planType参数
            // 使用 ruiding:// 自定义协议，支付成功后回到应用
            const returnUrl = `ruiding://payment-success?plan=${planType}`;
            
            console.log('📍 支付返回URL:', returnUrl);
            
            // 生成唯一的订单号：RD + 时间戳 + 数据库ID
            const uniqueOrderId = `RD${Date.now()}${orderId}`;
            
            const paymentResult = await xunhuPay.createOrder({
                orderId: uniqueOrderId,
                amount: plan.amount,
                title: plan.name,
                planType: planType, // 传递计划类型
                returnUrl: returnUrl
            });

            // 虎皮椒返回的支付URL
            const paymentUrl = paymentResult.url || paymentResult.payurl;

            console.log('支付订单创建成功:', paymentUrl);

            res.json({
                success: true,
                orderId,
                amount: plan.amount,
                planName: plan.name,
                paymentUrl
            });

        } catch (payError) {
            console.error('❌ 虎皮椒支付创建失败:', payError);
            console.error('错误堆栈:', payError.stack);
            console.error('错误详情:', {
                message: payError.message,
                code: payError.code
            });
            res.status(500).json({ error: '创建支付订单失败: ' + payError.message });
        }

    } catch (error) {
        console.error('❌ 创建订单错误:', error);
        console.error('错误堆栈:', error.stack);
        console.error('错误详情:', {
            message: error.message,
            code: error.code,
            errno: error.errno
        });
        res.status(500).json({ error: '创建订单失败: ' + error.message });
    }
});

module.exports = router;
