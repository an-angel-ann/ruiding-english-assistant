const { db } = require('../config/database-sqlite');
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

    async sendVerificationCode(email, ipAddress = null, type = 'register') {
        try {
            // For now, skip the rate limiting check to debug
            const recentLog = null;

            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            // 根据类型设置不同的邮件内容
            const subjects = {
                'register': '【睿叮英语】注册验证码',
                'reset': '【睿叮英语】重置密码验证码'
            };

            const messages = {
                'register': '您正在注册睿叮AI英语学习助手，验证码是：',
                'reset': '您正在重置密码，验证码是：'
            };

            const mailOptions = {
                from: `"睿叮AI英语学习助手" <${process.env.SMTP_USER}>`,
                to: email,
                subject: subjects[type] || subjects['register'],
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">睿叮AI英语学习助手</h2>
                        <p>${messages[type] || messages['register']}</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea;">
                            ${code}
                        </div>
                        <p style="color: #999; margin-top: 20px;">验证码10分钟内有效，请勿泄露给他人。</p>
                    </div>
                `
            };

            await this._getTransporter().sendMail(mailOptions);

            // 保存验证码记录
            await db.runAsync(
                'INSERT INTO email_verification_logs (email, code, expires_at, ip_address, sent_at) VALUES (?, ?, ?, ?, ?)',
                [email, code, expiresAt.toISOString(), ipAddress, new Date().toISOString()]
            );

            return { success: true, message: '验证码已发送到您的邮箱' };
        } catch (error) {
            console.error('发送验证码失败:', error);
            return { success: false, error: '发送失败: ' + error.message };
        }
    }

    async verifyCode(email, code) {
        try {
            const record = await db.getAsync(
                "SELECT * FROM email_verification_logs WHERE email = ? AND code = ? AND expires_at > datetime('now') ORDER BY sent_at DESC LIMIT 1",
                [email, code]
            );

            if (!record) {
                return { valid: false, error: '验证码无效或已过期' };
            }

            return { valid: true };
        } catch (error) {
            console.error('验证码验证失败:', error);
            return { valid: false, error: '验证失败' };
        }
    }

    // 发送支付成功通知邮件
    async sendPaymentNotification(userEmail, planType, amount, remainingDays) {
        try {
            const transporter = this._getTransporter();
            
            const planNames = {
                'trial_7days': '7天新会员福利',
                'trial_7days_1yuan': '新客福利（¥1/7天）',
                'monthly': '月度会员',
                'yearly': '年度会员'
            };
            
            const planName = planNames[planType] || planType;
            
            const mailOptions = {
                from: `"睿叮AI英语学习助手" <${process.env.SMTP_USER}>`,
                to: 'o_oangela@163.com',
                subject: '【睿叮AI英语】用户购买会员通知',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">用户购买会员通知</h2>
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 10px 0;"><strong>账户邮箱：</strong>${userEmail}</p>
                            <p style="margin: 10px 0;"><strong>购买套餐：</strong>${planName}</p>
                            <p style="margin: 10px 0;"><strong>支付金额：</strong>￥${amount}</p>
                            <p style="margin: 10px 0;"><strong>账户剩余时间：</strong>${remainingDays}天</p>
                        </div>
                        <p style="color: #999; margin-top: 20px;">请及时处理用户订单。</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('✅ 支付通知邮件已发送到 o_oangela@163.com');
            return { success: true };
        } catch (error) {
            console.error('发送支付通知邮件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 发送管理员通知邮件
    async sendAdminNotification(type, data) {
        try {
            const adminEmail = 'o_oangela@163.com';
            let subject = '';
            let html = '';

            if (type === 'new_user') {
                subject = '【睿叮英语】新用户注册通知';
                html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">新用户注册通知</h2>
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                            <p><strong>用户邮箱：</strong>${data.email}</p>
                            <p><strong>用户名：</strong>${data.username || '未设置'}</p>
                            <p><strong>注册时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
                            <p><strong>试用期：</strong>${data.trialDays}天</p>
                        </div>
                    </div>
                `;
            } else if (type === 'payment_success') {
                subject = '【睿叮英语】用户付费成功通知';
                html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4caf50;">用户付费成功通知</h2>
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                            <p><strong>用户邮箱：</strong>${data.email}</p>
                            <p><strong>用户名：</strong>${data.username || '未设置'}</p>
                            <p><strong>套餐类型：</strong>${data.planType}</p>
                            <p><strong>支付金额：</strong>¥${data.amount}</p>
                            <p><strong>支付时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
                            <p><strong>订单号：</strong>${data.orderId || '无'}</p>
                        </div>
                    </div>
                `;
            }

            const mailOptions = {
                from: `"睿叮AI英语学习助手" <${process.env.SMTP_USER}>`,
                to: adminEmail,
                subject: subject,
                html: html
            };

            await this._getTransporter().sendMail(mailOptions);
            console.log(`✅ 管理员通知邮件已发送: ${type}`);
            return { success: true };
        } catch (error) {
            console.error('发送管理员通知失败:', error);
            // 不影响主流程，只记录错误
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
