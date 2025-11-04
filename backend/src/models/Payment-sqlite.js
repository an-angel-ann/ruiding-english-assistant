const { db } = require('../config/database');

class Payment {
    // 创建支付记录
    static async create(userId, subscriptionId, amount, paymentMethod, transactionId = null) {
        const result = await db.runAsync(
            'INSERT INTO payments (user_id, subscription_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, subscriptionId, amount, paymentMethod, transactionId, 'pending']
        );
        
        return result.lastID;
    }

    // 通过订单ID查找支付记录
    static async findByOrderId(orderId) {
        const row = await db.getAsync(
            'SELECT * FROM payments WHERE transaction_id = ?',
            [orderId]
        );
        
        return row || null;
    }

    // 通过ID查找支付记录
    static async findById(id) {
        const row = await db.getAsync(
            'SELECT * FROM payments WHERE id = ?',
            [id]
        );
        
        return row || null;
    }

    // 更新支付状态
    static async updateStatus(paymentId, status, transactionId = null) {
        if (transactionId) {
            await db.runAsync(
                'UPDATE payments SET status = ?, transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, transactionId, paymentId]
            );
        } else {
            await db.runAsync(
                'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, paymentId]
            );
        }
    }

    // 获取用户的支付历史
    static async getHistory(userId) {
        const rows = await db.queryAsync(
            'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        return rows;
    }

    // 获取待支付的订单
    static async getPendingPayments(userId) {
        const rows = await db.queryAsync(
            'SELECT * FROM payments WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
            [userId, 'pending']
        );
        
        return rows;
    }
}

module.exports = Payment;
