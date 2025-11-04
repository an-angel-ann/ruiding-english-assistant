const { pool } = require('../config/database');

class Payment {
    // 创建支付记录
static async create(userId, planType, subscriptionId, amount, tradeNo) {
    const [result] = await pool.query(
        'INSERT INTO payments (user_id, plan_type, subscription_id, amount, trade_no, status, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, planType, subscriptionId, amount, tradeNo, 'pending', 'alipay']
    );
    return result.insertId;
}

    // 根据交易号查找支付记录
    static async findByTradeNo(tradeNo) {
        const [rows] = await pool.query(
            'SELECT * FROM payments WHERE trade_no = ?',
            [tradeNo]
        );
        return rows[0] || null;
    }

    // 更新支付状态
    static async updateStatus(tradeNo, status, alipayTradeNo = null) {
        const updateFields = ['status = ?', 'updated_at = NOW()'];
        const values = [status];
        
        if (alipayTradeNo) {
            updateFields.push('alipay_trade_no = ?');
            values.push(alipayTradeNo);
        }
        
        values.push(tradeNo);
        
        const [result] = await pool.query(
            `UPDATE payments SET ${updateFields.join(', ')} WHERE trade_no = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    // 根据用户ID查找支付记录
    static async findByUserId(userId, limit = 10) {
        const [rows] = await pool.query(
            'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
        return rows;
    }

static async updateSubscriptionId(paymentId, subscriptionId) {
    await pool.query(
        'UPDATE payments SET subscription_id = ? WHERE id = ?',
        [subscriptionId, paymentId]
    );
}
}

module.exports = Payment;
