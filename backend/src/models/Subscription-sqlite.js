const { db } = require('../config/database');

class Subscription {
    // 创建订阅
    static async create(userId, planType, startDate, endDate) {
        const result = await db.runAsync(
            'INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [userId, planType, 'active', startDate.toISOString(), endDate.toISOString()]
        );
        
        return result.lastID;
    }

    // 创建或延长订阅
    static async createOrExtend(userId, planType, days) {
        // 查找用户的活跃订阅
        const existing = await db.getAsync(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
            [userId, 'active']
        );

        let startDate, endDate;

        if (existing) {
            // 如果有活跃订阅，从当前到期时间延长
            const currentEndDate = new Date(existing.end_date);
            const now = new Date();
            
            // 如果当前订阅还未过期，从到期时间开始延长
            startDate = currentEndDate > now ? currentEndDate : now;
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            
            // 更新现有订阅
            await db.runAsync(
                'UPDATE subscriptions SET plan_type = ?, end_date = ? WHERE id = ?',
                [planType, endDate.toISOString(), existing.id]
            );
            
            return existing.id;
        } else {
            // 没有活跃订阅，创建新的
            startDate = new Date();
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            
            const result = await db.runAsync(
                'INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, ?, 1)',
                [userId, planType, 'active', startDate.toISOString(), endDate.toISOString()]
            );
            
            return result.lastID;
        }
    }

    // 获取用户的活跃订阅
    static async getActiveSubscription(userId) {
        try {
            console.log(`🔍 查询用户 ${userId} 的活跃订阅...`);
            
            // 简化查询，先获取所有活跃订阅，然后在JavaScript中检查时间
            const rows = await db.queryAsync(
                'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
                [userId, 'active']
            );
            
            console.log(`📊 查询结果: 找到 ${rows ? rows.length : 0} 条记录`);
            
            if (rows && rows.length > 0) {
                const subscription = rows[0];
                const endDate = new Date(subscription.end_date);
                const now = new Date();
                
                console.log(`📅 订阅信息:`, {
                    id: subscription.id,
                    plan_type: subscription.plan_type,
                    end_date: subscription.end_date,
                    endDate_parsed: endDate.toISOString(),
                    now: now.toISOString(),
                    isValid: endDate > now
                });
                
                // 检查订阅是否仍然有效
                if (endDate > now) {
                    console.log(`✅ 订阅有效，返回订阅信息`);
                    return subscription;
                } else {
                    console.log(`❌ 订阅已过期`);
                }
            } else {
                console.log(`ℹ️ 未找到活跃订阅`);
            }
            
            return null;
        } catch (error) {
            console.error('获取活跃订阅失败:', error);
            return null;
        }
    }

    // 检查用户订阅状态
    static async isSubscriptionActive(userId) {
        const subscription = await this.getActiveSubscription(userId);
        return subscription !== null;
    }

    // 取消订阅
    static async cancel(subscriptionId) {
        await db.runAsync(
            'UPDATE subscriptions SET status = ?, auto_renew = 0 WHERE id = ?',
            ['cancelled', subscriptionId]
        );
    }

    // 续订
    static async renew(userId, planType, endDate) {
        // 先将旧订阅设为过期
        await db.runAsync(
            'UPDATE subscriptions SET status = ? WHERE user_id = ? AND status = ?',
            ['expired', userId, 'active']
        );
        
        // 创建新订阅
        const startDate = new Date();
        return await this.create(userId, planType, startDate, endDate);
    }

    // 获取订阅历史
    static async getHistory(userId) {
        const rows = await db.queryAsync(
            'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        return rows;
    }

    // 过期订阅（定时任务用）
    static async expireOldSubscriptions() {
        await db.runAsync(
            'UPDATE subscriptions SET status = ? WHERE status = ? AND datetime(end_date) < datetime("now")',
            ['expired', 'active']
        );
    }
}

module.exports = Subscription;
