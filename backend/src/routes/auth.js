// 根据配置加载对应的模型
const USE_SQLITE = process.env.USE_SQLITE === 'true';
const User = USE_SQLITE ? require('../models/User-sqlite') : require('../models/User');
const Subscription = USE_SQLITE ? require('../models/Subscription-sqlite') : require('../models/Subscription');
const { generateToken, authenticateToken } = require('../middleware/auth');

// 根据配置加载对应的邮件服务和数据库
const emailService = USE_SQLITE ? require('../utils/email-service-sqlite') : require('../utils/email-service');
console.log('🔧 使用邮件服务:', USE_SQLITE ? 'SQLite版本' : 'MySQL版本');
const { pool } = USE_SQLITE ? {} : require('../config/database');
const { db } = USE_SQLITE ? require('../config/database') : {};

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// 注册
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('verificationCode').isLength({ min: 6, max: 6 }),
    body('username').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, username, verificationCode } = req.body;

        // 验证验证码
        const codeVerification = await emailService.verifyCode(email, verificationCode);
        if (!codeVerification.valid) {
            return res.status(400).json({ error: codeVerification.error || '验证码错误或已过期' });
        }

        // 检查邮箱是否已存在
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: '该邮箱已被注册' });
        }

        // 创建用户
        const userId = await User.create(email, password, username);

        // 自动创建7天免费试用订阅
        const trialDays = parseInt(process.env.FREE_TRIAL_DAYS) || 7;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + trialDays);

        await Subscription.create(userId, 'trial_3days', startDate, endDate);
        await User.markTrialUsed(userId);

        // 生成Token
        const token = generateToken(userId, email);

        // 发送管理员通知邮件（不阻塞响应）
        emailService.sendAdminNotification('new_user', {
            email,
            username,
            trialDays
        }).catch(err => console.error('发送管理员通知失败:', err));

        res.status(201).json({
            success: true,
            message: '注册成功！您获得了3天免费试用',
            token,
            user: {
                id: userId,
                email,
                username
            },
            trial: {
                days: trialDays,
                endDate
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
});

// 获取当前用户信息（需要认证）
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        // 检查订阅状态，添加错误处理
        let subscription = null;
        try {
            subscription = await Subscription.getActiveSubscription(req.user.id);
        } catch (error) {
            console.error('获取订阅状态失败:', error);
            // 即使获取订阅失败，也返回用户信息
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                createdAt: user.created_at,
                lastLogin: user.last_login
            },
            subscription: subscription ? {
                planType: subscription.plan_type,
                startDate: subscription.start_date,
                endDate: subscription.end_date,
                status: subscription.status,
                autoRenew: subscription.auto_renew
            } : null
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});


// 发送邮箱验证码
router.post('/send-verification-code', [
    body('email').isEmail().withMessage('请输入有效的邮箱')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const ipAddress = req.ip;

        const result = await emailService.sendVerificationCode(email, ipAddress);
        
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('发送验证码错误:', error);
        res.status(500).json({ error: '发送验证码失败，请稍后重试' });
    }
});

// 登录
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, deviceFingerprint } = req.body;

        // 查找用户
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        // 验证密码
        const isValid = await User.verifyPassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        // 设备指纹验证和绑定
        console.log('📱 登录 - 用户角色:', user.role);
        console.log('📱 登录 - 设备指纹:', deviceFingerprint);
        
        if (deviceFingerprint) {
            // 查询该用户的所有设备
            let devices;
            if (USE_SQLITE) {
                devices = await db.queryAsync(
                    'SELECT device_fingerprint FROM device_bindings WHERE user_id = ?',
                    [user.id]
                );
            } else {
                const [rows] = await pool.query(
                    'SELECT device_fingerprint FROM device_bindings WHERE user_id = ?',
                    [user.id]
                );
                devices = rows;
            }

            console.log('📱 登录 - 现有设备数量:', devices.length);

            // 检查当前设备是否已绑定
            const isDeviceBound = devices.some(d => d.device_fingerprint === deviceFingerprint);
            console.log('📱 登录 - 设备已绑定:', isDeviceBound);

            // 如果设备未绑定且已达到2台设备上限（管理员不限制）
            if (user.role !== 'admin' && !isDeviceBound && devices.length >= 2) {
                return res.status(403).json({ 
                    error: '设备数量已达上限',
                    message: '您的账号已在2台设备上登录，无法添加新设备。请在个人中心管理设备。',
                    code: 'DEVICE_LIMIT_EXCEEDED'
                });
            }

            // 绑定或更新设备（所有用户都保存设备信息）
            try {
                console.log('📱 登录 - 开始保存设备信息...');
                if (USE_SQLITE) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO device_bindings (user_id, device_fingerprint, device_name, last_used_at) 
                         VALUES (?, ?, ?, datetime('now'))`,
                        [user.id, deviceFingerprint, req.headers['user-agent'] || 'Unknown Device']
                    );
                } else {
                    await pool.query(
                        `INSERT INTO device_bindings (user_id, device_fingerprint, device_name, last_used_at) 
                         VALUES (?, ?, ?, NOW())
                         ON DUPLICATE KEY UPDATE last_used_at = NOW()`,
                        [user.id, deviceFingerprint, req.headers['user-agent'] || 'Unknown Device']
                    );
                }
                console.log('📱 登录 - 设备信息保存成功');
            } catch (deviceError) {
                console.error('❌ 保存设备指纹错误:', deviceError);
            }
        } else {
            console.log('⚠️ 登录 - 未提供设备指纹');
        }

        // 更新最后登录时间
        await User.updateLastLogin(user.id);

        // 检查订阅状态
        let subscription = null;
        try {
            subscription = await Subscription.getActiveSubscription(user.id);
        } catch (error) {
            console.error('获取订阅状态失败:', error);
            // 即使获取订阅失败，也允许登录
        }

        // 生成Token
        const token = generateToken(user.id, user.email);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            subscription: subscription ? {
                planType: subscription.plan_type,
                endDate: subscription.end_date,
                status: subscription.status
            } : null
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

// 获取当前用户的设备列表
router.get('/devices', authenticateToken, async (req, res) => {
    try {
        console.log('📱 获取设备列表 - 用户ID:', req.user.id);
        
        let devices;
        if (USE_SQLITE) {
            devices = await db.queryAsync(
                'SELECT id, device_fingerprint, device_name, last_used_at, created_at FROM device_bindings WHERE user_id = ? ORDER BY last_used_at DESC',
                [req.user.id]
            );
        } else {
            const [rows] = await pool.query(
                'SELECT id, device_fingerprint, device_name, last_used_at, created_at FROM device_bindings WHERE user_id = ? ORDER BY last_used_at DESC',
                [req.user.id]
            );
            devices = rows;
        }

        console.log('📱 获取设备列表 - 查询结果:', devices);
        console.log('📱 获取设备列表 - 设备数量:', devices.length);

        res.json({ success: true, devices });
    } catch (error) {
        console.error('获取设备列表错误:', error);
        res.status(500).json({ error: '获取设备列表失败' });
    }
});

// 删除用户自己的设备
router.delete('/devices/:deviceId', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;

        // 确保用户只能删除自己的设备
        let result;
        if (USE_SQLITE) {
            result = await db.runAsync(
                'DELETE FROM device_bindings WHERE id = ? AND user_id = ?',
                [deviceId, req.user.id]
            );
        } else {
            const [rows] = await pool.query(
                'DELETE FROM device_bindings WHERE id = ? AND user_id = ?',
                [deviceId, req.user.id]
            );
            result = { affectedRows: rows.affectedRows };
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '设备不存在' });
        }

        res.json({ success: true, message: '设备已解绑' });
    } catch (error) {
        console.error('删除设备错误:', error);
        res.status(500).json({ error: '删除设备失败' });
    }
});

// 发送重置密码验证码
router.post('/send-reset-code', [
    body('email').isEmail().withMessage('请输入有效的邮箱')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        
        // 检查用户是否存在
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({ error: '该邮箱未注册' });
        }

        const ipAddress = req.ip;
        const result = await emailService.sendVerificationCode(email, ipAddress, 'reset');
        
        if (result.success) {
            res.json({ success: true, message: '验证码已发送到您的邮箱' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('发送重置密码验证码错误:', error);
        res.status(500).json({ error: '发送验证码失败，请稍后重试' });
    }
});

// 重置密码
router.post('/reset-password', [
    body('email').isEmail().withMessage('请输入有效的邮箱'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('验证码必须是6位数字'),
    body('newPassword').isLength({ min: 6 }).withMessage('密码至少需要6位')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, code, newPassword } = req.body;

        // 验证验证码
        const codeVerification = await emailService.verifyCode(email, code);
        if (!codeVerification.valid) {
            return res.status(400).json({ error: codeVerification.error || '验证码错误或已过期' });
        }

        // 查找用户
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 更新密码
        await User.updatePassword(user.id, newPassword);

        res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
    } catch (error) {
        console.error('重置密码错误:', error);
        res.status(500).json({ error: '重置密码失败，请稍后重试' });
    }
});

// 支付回调 - 增加会员时长
router.post('/payment-callback', async (req, res) => {
    try {
        const { userId, planType, paymentId } = req.body;

        console.log('💰 支付回调:', { userId, planType, paymentId });

        if (!userId || !planType) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 获取用户信息
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 如果是新客户福利，检查是否已购买过
        if (planType === 'trial_7days' || planType === 'trial_7days_1yuan') {
            // 检查是否已有trial_7days或trial_7days_1yuan订阅记录
            let existingTrial;
            if (USE_SQLITE) {
                existingTrial = await db.getAsync(
                    "SELECT * FROM subscriptions WHERE user_id = ? AND (plan_type = 'trial_7days' OR plan_type = 'trial_7days_1yuan')",
                    [userId]
                );
            } else {
                const [rows] = await pool.query(
                    "SELECT * FROM subscriptions WHERE user_id = ? AND (plan_type = 'trial_7days' OR plan_type = 'trial_7days_1yuan')",
                    [userId]
                );
                existingTrial = rows[0];
            }

            if (existingTrial) {
                return res.status(400).json({ error: '您已购买过新客户福利，不能重复购买' });
            }
        }

        // 根据订阅类型确定增加的天数和金额
        let daysToAdd = 0;
        let amount = 0;
        switch (planType) {
            case 'trial_7days_1yuan':
                daysToAdd = 7;
                amount = 1;
                break;
            case 'monthly':
                daysToAdd = 31;
                amount = 29;
                break;
            case 'yearly':
                daysToAdd = 365;
                amount = 199;
                break;
            default:
                return res.status(400).json({ error: '无效的订阅类型' });
        }

        // 获取当前订阅
        let subscription = await Subscription.getActiveSubscription(userId);
        
        const now = new Date();
        let newEndDate;

        if (subscription && new Date(subscription.end_date) > now) {
            // 如果有有效订阅，在现有结束日期基础上延长
            newEndDate = new Date(subscription.end_date);
            newEndDate.setDate(newEndDate.getDate() + daysToAdd);
            
            // 将当前订阅设置为过期
            if (USE_SQLITE) {
                await db.runAsync(
                    "UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'",
                    [userId]
                );
            } else {
                await pool.query(
                    "UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = ? AND status = 'active'",
                    [userId]
                );
            }
            
            // 创建新的订阅记录（保留购买历史）
            await Subscription.create(userId, planType, now, newEndDate);
        } else {
            // 如果没有有效订阅，创建新订阅
            newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + daysToAdd);
            
            await Subscription.create(userId, planType, now, newEndDate);
        }

        // 计算剩余天数
        const remainingDays = Math.ceil((newEndDate - now) / (1000 * 60 * 60 * 24));

        console.log('✅ 订阅已更新:', { userId, planType, newEndDate, daysToAdd, remainingDays });

        // 更新订单状态为已支付
        try {
            if (USE_SQLITE) {
                // 查找最近的pending订单
                const pendingOrder = await db.getAsync(
                    "SELECT id FROM payment_orders WHERE user_id = ? AND plan_type = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
                    [userId, planType]
                );
                
                if (pendingOrder) {
                    await db.runAsync(
                        "UPDATE payment_orders SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
                        [pendingOrder.id]
                    );
                    console.log('✅ 订单状态已更新为paid:', pendingOrder.id);
                } else {
                    // 如果没有找到pending订单，创建一个新的paid订单
                    await db.runAsync(
                        "INSERT INTO payment_orders (user_id, plan_type, amount, status, paid_at) VALUES (?, ?, ?, 'paid', datetime('now'))",
                        [userId, planType, amount]
                    );
                    console.log('✅ 创建新的paid订单');
                }
            } else {
                const [rows] = await pool.query(
                    "SELECT id FROM payment_orders WHERE user_id = ? AND plan_type = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
                    [userId, planType]
                );
                
                if (rows.length > 0) {
                    await pool.query(
                        "UPDATE payment_orders SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = ?",
                        [rows[0].id]
                    );
                    console.log('✅ 订单状态已更新为paid:', rows[0].id);
                } else {
                    await pool.query(
                        "INSERT INTO payment_orders (user_id, plan_type, amount, status, paid_at) VALUES (?, ?, ?, 'paid', NOW())",
                        [userId, planType, amount]
                    );
                    console.log('✅ 创建新的paid订单');
                }
            }
        } catch (orderError) {
            console.error('更新订单状态失败:', orderError);
            // 订单状态更新失败不影响主流程
        }

        // 发送邮件通知
        try {
            await emailService.sendPaymentNotification(user.email, planType, amount, remainingDays);
        } catch (emailError) {
            console.error('发送邮件通知失败:', emailError);
            // 邮件失败不影响主流程
        }

        res.json({
            success: true,
            message: `订阅成功！已增加${daysToAdd}天会员时长`,
            subscription: {
                planType,
                endDate: newEndDate,
                daysAdded: daysToAdd,
                remainingDays: remainingDays
            }
        });
    } catch (error) {
        console.error('支付回调错误:', error);
        res.status(500).json({ error: '处理支付失败' });
    }
});

module.exports = router;

