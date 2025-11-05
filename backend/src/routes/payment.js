const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { db } = require('../config/database');
const XunhuPay = require('../utils/xunhupay');

// 根据配置加载对应的模型
// 在Electron环境中默认使用SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.versions.electron;
const Subscription = USE_SQLITE ? require('../models/Subscription-sqlite') : require('../models/Subscription');
const User = USE_SQLITE ? require('../models/User-sqlite') : require('../models/User');
const emailService = USE_SQLITE ? require('../utils/email-service-sqlite') : require('../utils/email-service');

// 初始化虎皮椒支付
const xunhuPay = new XunhuPay({
    appid: process.env.XUNHU_APPID,
    appsecret: process.env.XUNHU_APPSECRET,
    gateway: process.env.XUNHU_GATEWAY,
    notifyUrl: process.env.XUNHU_NOTIFY_URL
});

// 创建订单
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { planType } = req.body;
        const userId = req.user.id;

        console.log('收到订单请求，planType:', planType);

        // 定价配置
        const pricing = {
            'trial_7days_1yuan': { amount: 1, days: 7, name: '新客福利-7天体验' },
            'monthly': { amount: 29, days: 31, name: '月度会员' },
            'yearly': { amount: 299, days: 365, name: '年度会员' }
        };

        console.log('可用的定价配置:', Object.keys(pricing));

        if (!pricing[planType]) {
            console.log('无效的订阅类型:', planType);
            return res.status(400).json({ error: '无效的订阅类型' });
        }

        const plan = pricing[planType];
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
            result = { insertId: rows.insertId };
        }

        const orderId = result.insertId;

        // 调用虎皮椒创建支付订单
        try {
            const paymentResult = await xunhuPay.createOrder({
                orderId: `RD${orderId}`,
                amount: plan.amount,
                title: plan.name,
                returnUrl: process.env.XUNHU_RETURN_URL
            });

            // 虎皮椒返回的支付URL
            const paymentUrl = paymentResult.url || paymentResult.payurl;

            res.json({
                success: true,
                orderId,
                amount: plan.amount,
                planName: plan.name,
                paymentUrl
            });

        } catch (payError) {
            console.error('虎皮椒支付创建失败:', payError);
            res.status(500).json({ error: '创建支付订单失败，请稍后重试' });
        }

    } catch (error) {
        console.error('创建订单错误:', error);
        res.status(500).json({ error: '创建订单失败' });
    }
});

// 手动处理pending订单（管理员接口）
router.post('/process-pending/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log(`🔧 手动处理订单: ${orderId}`);

        // 查询订单
        let orders;
        if (USE_SQLITE) {
            orders = await db.queryAsync(
                'SELECT * FROM payment_orders WHERE id = ?',
                [orderId]
            );
        } else {
            const [rows] = await pool.query(
                'SELECT * FROM payment_orders WHERE id = ?',
                [orderId]
            );
            orders = rows;
        }

        if (orders.length === 0) {
            return res.status(404).json({ error: '订单不存在' });
        }

        const order = orders[0];

        // 防止重复处理
        if (order.status === 'paid') {
            return res.json({ message: '订单已处理', order });
        }

        // 更新订单状态
        if (USE_SQLITE) {
            await db.runAsync(
                'UPDATE payment_orders SET status = ?, paid_at = datetime("now") WHERE id = ?',
                ['paid', orderId]
            );
        } else {
            await pool.query(
                'UPDATE payment_orders SET status = ?, paid_at = NOW() WHERE id = ?',
                ['paid', orderId]
            );
        }

        // 创建或更新订阅
        const pricing = {
            'trial_7days_1yuan': 7,
            'monthly': 31,
            'yearly': 365
        };

        const days = pricing[order.plan_type];
        await Subscription.createOrExtend(order.user_id, order.plan_type, days);

        console.log(`✅ 订单${orderId}已手动处理，订阅已激活`);
        
        res.json({ 
            message: '订单处理成功', 
            orderId,
            days,
            planType: order.plan_type
        });

    } catch (error) {
        console.error('手动处理订单错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 支付回调（虎皮椒异步通知）
router.post('/notify', async (req, res) => {
    try {
        console.log('========================================');
        console.log('📥 收到虎皮椒支付回调');
        console.log('时间:', new Date().toISOString());
        console.log('回调数据:', JSON.stringify(req.body, null, 2));
        console.log('========================================');

        // 验证签名
        if (!xunhuPay.verifyNotify(req.body)) {
            console.error('❌ 签名验证失败');
            return res.send('fail');
        }

        console.log('✅ 签名验证通过');
        const { trade_order_id, status } = req.body;
        
        // 提取订单ID（去掉RD前缀）
        const orderId = trade_order_id.replace('RD', '');

        if (status === 'OD') { // 虎皮椒支付成功状态
            // 查询订单
            let orders;
            if (USE_SQLITE) {
                orders = await db.queryAsync(
                    'SELECT * FROM payment_orders WHERE id = ?',
                    [orderId]
                );
            } else {
                const [rows] = await pool.query(
                    'SELECT * FROM payment_orders WHERE id = ?',
                    [orderId]
                );
                orders = rows;
            }

            if (orders.length === 0) {
                console.error('订单不存在:', orderId);
                return res.send('fail');
            }

            const order = orders[0];

            // 防止重复处理
            if (order.status === 'paid') {
                return res.send('success');
            }

            // 更新订单状态
            if (USE_SQLITE) {
                await db.runAsync(
                    'UPDATE payment_orders SET status = ?, paid_at = datetime("now") WHERE id = ?',
                    ['paid', orderId]
                );
            } else {
                await pool.query(
                    'UPDATE payment_orders SET status = ?, paid_at = NOW() WHERE id = ?',
                    ['paid', orderId]
                );
            }

            // 创建或更新订阅
            const pricing = {
                'trial_7days_1yuan': 7,
                'monthly': 30,
                'yearly': 365
            };

            const days = pricing[order.plan_type];
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            await Subscription.createOrExtend(order.user_id, order.plan_type, days);

            console.log(`✅ 订单${orderId}支付成功，订阅已激活`);
            
            // 获取用户信息并发送管理员通知邮件（不阻塞响应）
            User.findById(order.user_id).then(user => {
                if (user) {
                    const planNames = {
                        'trial_7days_1yuan': '7天试用（1元）',
                        'monthly': '月度订阅',
                        'yearly': '年度订阅'
                    };
                    emailService.sendAdminNotification('payment_success', {
                        email: user.email,
                        username: user.username,
                        planType: planNames[order.plan_type] || order.plan_type,
                        amount: order.amount,
                        orderId: orderId
                    }).catch(err => console.error('发送管理员通知失败:', err));
                }
            }).catch(err => console.error('获取用户信息失败:', err));
            
            res.send('success');
        } else {
            res.send('fail');
        }

    } catch (error) {
        console.error('支付回调错误:', error);
        res.send('fail');
    }
});

// 支付返回页面（用户支付完成后跳转）
router.get('/return', async (req, res) => {
    // 重定向到订阅页面
    res.redirect('/subscription.html?payment=success');
});

// 查询订单状态
router.get('/order/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        let orders;
        if (USE_SQLITE) {
            orders = await db.queryAsync(
                'SELECT * FROM payment_orders WHERE id = ? AND user_id = ?',
                [orderId, userId]
            );
        } else {
            const [rows] = await pool.query(
                'SELECT * FROM payment_orders WHERE id = ? AND user_id = ?',
                [orderId, userId]
            );
            orders = rows;
        }

        if (orders.length === 0) {
            return res.status(404).json({ error: '订单不存在' });
        }

        res.json({ success: true, order: orders[0] });

    } catch (error) {
        console.error('查询订单错误:', error);
        res.status(500).json({ error: '查询失败' });
    }
});

module.exports = router;
