const express = require('express');
const router = express.Router();
const { db } = require('../config/database-sqlite');
const jwt = require('jsonwebtoken');

// 管理员权限验证中间件
const requireAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        console.log('🔐 管理员权限验证:');
        console.log('   Token存在:', !!token);
        
        if (!token) {
            console.log('   ❌ 未提供认证令牌');
            return res.status(401).json({ error: '未提供认证令牌' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('   Token解码成功, userId:', decoded.userId);
        
        const user = await db.getAsync(
            'SELECT id, email, username, role FROM users WHERE id = ? AND status = ?',
            [decoded.userId, 'active']
        );
        
        console.log('   查询用户结果:', user ? `${user.email} (role: ${user.role})` : '未找到');

        if (!user) {
            console.log('   ❌ 用户不存在或已禁用');
            return res.status(403).json({ error: '用户不存在' });
        }
        
        if (user.role !== 'admin') {
            console.log('   ❌ 用户角色不是admin:', user.role);
            return res.status(403).json({ error: '需要管理员权限' });
        }
        
        console.log('   ✅ 管理员验证通过');
        req.user = user;
        next();
    } catch (error) {
        console.error('❌ 管理员认证错误:', error);
        res.status(401).json({ error: '认证失败: ' + error.message });
    }
};

// 获取统计数据
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        // 分别查询各项统计数据，避免JOIN导致的重复计算
        const totalUsers = await db.getAsync('SELECT COUNT(*) as count FROM users');
        
        const activeUsers = await db.getAsync(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM subscriptions 
            WHERE status = 'active' AND end_date > datetime('now')
        `);
        
        const totalOrders = await db.getAsync('SELECT COUNT(*) as count FROM payment_orders');
        
        const totalRevenue = await db.getAsync(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payment_orders 
            WHERE status = 'paid'
        `);

        const stats = {
            total_users: totalUsers.count,
            active_users: activeUsers.count,
            total_orders: totalOrders.count,
            total_revenue: totalRevenue.total
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ error: '获取统计数据失败' });
    }
});

// 获取所有用户列表
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await db.queryAsync(`
            SELECT 
                u.id,
                u.email,
                u.username,
                u.role,
                u.created_at,
                u.last_login,
                u.status,
                s.plan_type,
                s.end_date,
                CAST((julianday(s.end_date) - julianday('now')) AS INTEGER) as days_remaining,
                COUNT(DISTINCT po.id) as purchase_count,
                COALESCE(SUM(CASE WHEN po.status = 'paid' THEN po.amount ELSE 0 END), 0) as total_paid
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.end_date > datetime('now')
            LEFT JOIN payment_orders po ON u.id = po.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        res.json({ success: true, users });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 获取单个用户详情
router.get('/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await db.getAsync('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const subscriptions = await db.queryAsync(
            'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        const orders = await db.queryAsync(
            'SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        const devices = await db.queryAsync(
            'SELECT device_fingerprint, device_name, last_used_at, created_at FROM device_bindings WHERE user_id = ? ORDER BY last_used_at DESC LIMIT 2',
            [userId]
        );
        
        const note = await db.getAsync(
            'SELECT * FROM admin_notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
            [userId]
        );

        res.json({
            success: true,
            user,
            subscriptions,
            orders,
            devices,
            note: note || null
        });
    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({ error: '获取用户详情失败' });
    }
});

// 更新用户订阅时长
router.put('/users/:userId/subscription', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { days } = req.body;
        
        console.log('📝 更新订阅请求:');
        console.log('   用户ID:', userId);
        console.log('   天数:', days);

        if (!days || days == 0) {
            console.log('   ❌ 天数无效');
            return res.status(400).json({ error: '无效的天数' });
        }

        const sub = await db.getAsync(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
            [userId, 'active']
        );
        
        console.log('   现有订阅:', sub ? `ID ${sub.id}` : '无');

        if (sub) {
            // 更新现有订阅
            const currentEndDate = new Date(sub.end_date);
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + parseInt(days));
            
            console.log('   原结束日期:', currentEndDate.toISOString());
            console.log('   新结束日期:', newEndDate.toISOString());
            
            const result = await db.runAsync(
                `UPDATE subscriptions SET end_date = ?, updated_at = datetime('now') WHERE id = ?`,
                [newEndDate.toISOString(), sub.id]
            );
            console.log('   ✅ 更新成功, 影响行数:', result.changes);
        } else {
            // 创建新订阅
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(days));
            
            console.log('   创建新订阅');
            console.log('   开始日期:', startDate.toISOString());
            console.log('   结束日期:', endDate.toISOString());
            
            const result = await db.runAsync(
                'INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'admin_grant', 'active', startDate.toISOString(), endDate.toISOString(), 0]
            );
            console.log('   ✅ 创建成功, ID:', result.lastID);
        }

        res.json({ success: true, message: '订阅时长已更新' });
    } catch (error) {
        console.error('❌ 更新订阅错误:', error);
        res.status(500).json({ error: '更新订阅失败: ' + error.message });
    }
});

// 更新用户备注
router.put('/users/:userId/note', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { note } = req.body;

        const existing = await db.getAsync(
            'SELECT id FROM admin_notes WHERE user_id = ?',
            [userId]
        );

        if (existing) {
            await db.runAsync(
                `UPDATE admin_notes SET note = ?, updated_at = datetime('now') WHERE user_id = ?`,
                [note, userId]
            );
        } else {
            await db.runAsync(
                'INSERT INTO admin_notes (user_id, note) VALUES (?, ?)',
                [userId, note]
            );
        }

        res.json({ success: true, message: '备注已保存' });
    } catch (error) {
        console.error('保存备注错误:', error);
        res.status(500).json({ error: '保存备注失败' });
    }
});

// 删除用户
router.delete('/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log('🗑️  删除用户请求:');
        console.log('   用户ID:', userId);
        console.log('   操作者ID:', req.user.id);

        if (parseInt(userId) === req.user.id) {
            console.log('   ❌ 不能删除自己');
            return res.status(400).json({ error: '不能删除自己的账号' });
        }

        const user = await db.getAsync('SELECT role, email FROM users WHERE id = ?', [userId]);
        console.log('   目标用户:', user ? `${user.email} (${user.role})` : '不存在');
        
        if (user && user.role === 'admin') {
            console.log('   ❌ 不能删除管理员');
            return res.status(400).json({ error: '不能删除管理员账号' });
        }

        // 物理删除：由于设置了外键级联删除，删除用户会自动删除相关的订阅、订单、设备等数据
        const result = await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
        console.log('   ✅ 物理删除成功, 影响行数:', result.changes);
        
        res.json({ success: true, message: '用户已彻底删除' });
    } catch (error) {
        console.error('❌ 删除用户错误:', error);
        res.status(500).json({ error: '删除用户失败: ' + error.message });
    }
});

// 删除用户设备绑定
router.delete('/users/:userId/devices/:deviceFingerprint', requireAdmin, async (req, res) => {
    try {
        const { userId, deviceFingerprint } = req.params;
        await db.runAsync(
            'DELETE FROM device_bindings WHERE user_id = ? AND device_fingerprint = ?',
            [userId, decodeURIComponent(deviceFingerprint)]
        );
        res.json({ success: true, message: '设备已解绑' });
    } catch (error) {
        console.error('删除设备错误:', error);
        res.status(500).json({ error: '删除设备失败' });
    }
});

module.exports = router;
