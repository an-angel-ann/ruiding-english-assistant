const { pool } = require('../config/database');

class Subscription {
    // 创建订阅
    static async create(userId, planType, startDate, endDate) {
        const [result] = await pool.query(
            'INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, ?, TRUE)',
            [userId, planType, 'active', startDate, endDate]
        );
        
        return result.insertId;
    }

    // 创建或延长订阅
    static async createOrExtend(userId, planType, days) {
        // 查找用户的活跃订阅
        const [existing] = await pool.query(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
            [userId, 'active']
        );

        let startDate, endDate;

        if (existing.length > 0) {
            // 如果有活跃订阅，从当前到期时间延长
            const currentEndDate = new Date(existing[0].end_date);
            const now = new Date();
            
            // 如果当前订阅还未过期，从到期时间开始延长
            startDate = currentEndDate > now ? currentEndDate : now;
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            
            // 更新现有订阅
            await pool.query(
                'UPDATE subscriptions SET plan_type = ?, end_date = ? WHERE id = ?',
                [planType, endDate, existing[0].id]
            );
            
            return existing[0].id;
        } else {
            // 没有活跃订阅，创建新的
            startDate = new Date();
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            
            const [result] = await pool.query(
                'INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, ?, TRUE)',
                [userId, planType, 'active', startDate, endDate]
            );
            
            return result.insertId;
        }
    }

    // 获取用户的活跃订阅
    static async getActiveSubscription(userId) {
        const [rows] = await pool.query(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? AND end_date > NOW()',
            [userId, 'active']
        );
        
        return rows[0] || null;
    }

    // 检查用户订阅状态
    static async isSubscriptionActive(userId) {
        const subscription = await this.getActiveSubscription(userId);
        return subscription !== null;
    }

    // 取消订阅
    static async cancel(subscriptionId) {
        await pool.query(
            'UPDATE subscriptions SET status = ?, auto_renew = FALSE WHERE id = ?',
            ['cancelled', subscriptionId]
        );
    }

    // 续订
    static async renew(userId, planType, endDate) {
        // 先将旧订阅设为过期
        await pool.query(
            'UPDATE subscriptions SET status = ? WHERE user_id = ? AND status = ?',
            ['expired', userId, 'active']
        );
        
        // 创建新订阅
        const startDate = new Date();
        return await this.create(userId, planType, startDate, endDate);
    }

    // 获取订阅历史
    static async getHistory(userId) {
        const [rows] = await pool.query(
            'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        return rows;
    }

    // 更新订阅状态
    static async updateStatus(subscriptionId, status) {
        await pool.query(
            'UPDATE subscriptions SET status = ? WHERE id = ?',
            [status, subscriptionId]
        );
    }

    // 更新订阅到期时间
    static async updateEndDate(subscriptionId, endDate) {
        await pool.query(
            'UPDATE subscriptions SET end_date = ? WHERE id = ?',
            [endDate, subscriptionId]
        );
    }

    // 根据ID查找订阅
    static async findById(subscriptionId) {
        const [rows] = await pool.query(
            'SELECT * FROM subscriptions WHERE id = ?',
            [subscriptionId]
        );
        return rows[0];
    }

    // 过期订阅（定时任务用）
    static async expireOldSubscriptions() {
        await pool.query(
            'UPDATE subscriptions SET status = ? WHERE status = ? AND end_date < NOW()',
            ['expired', 'active']
        );
    }
}

module.exports = Subscription;
