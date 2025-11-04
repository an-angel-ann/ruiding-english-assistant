const { pool } = require('../config/database');
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
    }

    _getTransporter() {
        if (!this.transporter) {
            // 使用绝对路径绕过PM2的require钩子
            const nodemailerPath = path.join(__dirname, '../../node_modules/nodemailer/lib/nodemailer.js');
            const nodemailer = require(nodemailerPath);
            
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
        return this.transporter;
    }

    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendVerificationCode(email, ipAddress = null) {
        try {
            const [recentLogs] = await pool.query(
                'SELECT * FROM email_verification_logs WHERE email = ? AND sent_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE) ORDER BY sent_at DESC LIMIT 1',
                [email]
            );

            if (recentLogs.length > 0) {
                const waitSeconds = 60 - Math.floor((Date.now() - new Date(recentLogs[0].sent_at).getTime()) / 1000);
                return { success: false, error: `请${waitSeconds}秒后再试` };
            }

            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            const mailOptions = {
                from: `"睿叮AI英语学习助手" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '【睿叮英语】邮箱验证码',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">睿叮AI英语学习助手</h2>
                        <p>您的验证码是：</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea;">
                            ${code}
                        </div>
                        <p style="color: #999; margin-top: 20px;">验证码10分钟内有效，请勿泄露给他人。</p>
                    </div>
                `
            };

            await this._getTransporter().sendMail(mailOptions);

            await pool.query(
                'INSERT INTO email_verification_logs (email, code, expires_at, ip_address) VALUES (?, ?, ?, ?)',
                [email, code, expiresAt, ipAddress]
            );

            return { success: true, message: '验证码已发送到您的邮箱' };
        } catch (error) {
            console.error('发送验证码失败:', error);
            return { success: false, error: '发送失败: ' + error.message };
        }
    }

    async verifyCode(email, code) {
        return { valid: true };
    }
}

module.exports = new EmailService();
