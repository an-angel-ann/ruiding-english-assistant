const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // 创建新用户
    static async create(email, password, username = null) {
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await db.runAsync(
            'INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)',
            [email, passwordHash, username]
        );
        
        return result.lastID;
    }

    // 通过邮箱查找用户
    static async findByEmail(email) {
        const row = await db.getAsync(
            'SELECT * FROM users WHERE email = ? AND status = ?',
            [email, 'active']
        );
        
        return row || null;
    }

    // 通过ID查找用户
    static async findById(id) {
        const row = await db.getAsync(
            'SELECT id, email, username, role, created_at, last_login, status, trial_used FROM users WHERE id = ? AND status = ?',
            [id, 'active']
        );
        
        return row || null;
    }

    // 验证密码
    static async verifyPassword(plainPassword, passwordHash) {
        return await bcrypt.compare(plainPassword, passwordHash);
    }

    // 更新最后登录时间
    static async updateLastLogin(userId) {
        await db.runAsync(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
    }

    // 检查用户是否已使用试用
    static async hasUsedTrial(userId) {
        const row = await db.getAsync(
            'SELECT trial_used FROM users WHERE id = ?',
            [userId]
        );
        
        return row?.trial_used === 1;
    }

    // 标记试用已使用
    static async markTrialUsed(userId) {
        await db.runAsync(
            'UPDATE users SET trial_used = 1 WHERE id = ?',
            [userId]
        );
    }

    // 更新密码
    static async updatePassword(userId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.runAsync(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );
    }
}

module.exports = User;
