const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // 创建新用户
    static async create(email, password, username = null) {
        const passwordHash = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)',
            [email, passwordHash, username]
        );
        
        return result.insertId;
    }

    // 通过邮箱查找用户
    static async findByEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND status = ?',
            [email, 'active']
        );
        
        return rows[0] || null;
    }

    // 通过ID查找用户
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, email, username, role, created_at, last_login, status, trial_used FROM users WHERE id = ? AND status = ?',
            [id, 'active']
        );
        
        return rows[0] || null;
    }

    // 验证密码
    static async verifyPassword(plainPassword, passwordHash) {
        return await bcrypt.compare(plainPassword, passwordHash);
    }

    // 更新最后登录时间
    static async updateLastLogin(userId) {
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
    }

    // 检查用户是否已使用试用
    static async hasUsedTrial(userId) {
        const [rows] = await pool.query(
            'SELECT trial_used FROM users WHERE id = ?',
            [userId]
        );
        
        return rows[0]?.trial_used || false;
    }

    // 标记试用已使用
    static async markTrialUsed(userId) {
        await pool.query(
            'UPDATE users SET trial_used = TRUE WHERE id = ?',
            [userId]
        );
    }
}

module.exports = User;
