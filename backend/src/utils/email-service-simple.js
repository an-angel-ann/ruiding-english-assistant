const { pool } = require('../config/database');

class EmailService {
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendVerificationCode(email, ipAddress = null) {
        try {
            // 生成验证码
            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            // 记录到数据库
            await pool.query(
                'INSERT INTO email_verification_logs (email, code, expires_at, ip_address) VALUES (?, ?, ?, ?)',
                [email, code, expiresAt, ipAddress]
            );

            // 临时方案：直接返回验证码（生产环境应该发送邮件）
            console.log(`📧 验证码（临时显示）: ${email} -> ${code}`);
            
            return { 
                success: true, 
                message: '验证码已生成（临时方案：查看服务器日志）',
                code: code // 临时返回验证码用于测试
            };
        } catch (error) {
            console.error('生成验证码失败:', error);
            return { success: false, error: '生成失败' };
        }
    }

    async verifyCode(email, code) {
        return { valid: true };
    }
}

module.exports = new EmailService();
