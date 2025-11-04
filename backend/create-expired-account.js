require('dotenv').config();
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 连接数据库
const dbPath = path.join(__dirname, 'data', 'ruiding.db');
const db = new sqlite3.Database(dbPath);

async function createExpiredAccount() {
    const email = 'expired@test.com';
    const password = 'test123';
    const username = '已到期测试账号';
    
    try {
        // 生成密码哈希
        const passwordHash = await bcrypt.hash(password, 10);
        
        // 创建用户
        db.run(
            'INSERT INTO users (email, password_hash, username, trial_used, status) VALUES (?, ?, ?, ?, ?)',
            [email, passwordHash, username, 1, 'active'],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        console.log('⚠️  账号已存在，更新订阅状态...');
                        // 查找用户ID
                        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                            if (row) {
                                createExpiredSubscription(row.id);
                            }
                        });
                    } else {
                        console.error('创建用户失败:', err);
                    }
                    return;
                }
                
                const userId = this.lastID;
                console.log('✅ 用户创建成功，ID:', userId);
                
                // 创建已过期的订阅
                createExpiredSubscription(userId);
            }
        );
    } catch (error) {
        console.error('错误:', error);
    }
}

function createExpiredSubscription(userId) {
    // 创建一个1天前到期的订阅
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31); // 31天前开始
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // 1天前到期
    
    db.run(
        'INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
        [userId, 'monthly', 'expired', startDate.toISOString(), endDate.toISOString()],
        function(err) {
            if (err) {
                console.error('创建订阅失败:', err);
                return;
            }
            
            console.log('✅ 已过期订阅创建成功');
            console.log('\n📋 测试账号信息:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━');
            console.log('邮箱: expired@test.com');
            console.log('密码: test123');
            console.log('状态: 订阅已过期');
            console.log('到期时间:', endDate.toLocaleString('zh-CN'));
            console.log('━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n🎯 使用方法:');
            console.log('1. 访问 http://localhost:8888/auth.html');
            console.log('2. 使用上述账号密码登录');
            console.log('3. 应该看到订阅引导页面');
            console.log('4. 不会有倒计时显示');
            console.log('5. 不会自动配置AI Key\n');
            
            db.close();
        }
    );
}

createExpiredAccount();
