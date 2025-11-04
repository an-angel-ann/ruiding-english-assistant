// 检查特定用户的订阅状态
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/ruiding.db');
const db = new Database(dbPath);

const userEmail = '123@163.com';

try {
    console.log(`🔍 检查用户 ${userEmail} 的详细信息\n`);
    
    // 查询用户基本信息
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);
    
    if (!user) {
        console.log('❌ 用户不存在');
        process.exit(1);
    }
    
    console.log('📋 用户基本信息:');
    console.log('   ID:', user.id);
    console.log('   邮箱:', user.email);
    console.log('   用户名:', user.username || '无');
    console.log('   角色:', user.role || 'NULL');
    console.log('   状态:', user.status);
    console.log('   注册时间:', user.created_at);
    console.log('   最后登录:', user.last_login || '从未登录');
    console.log('');
    
    // 查询订阅信息
    const subscriptions = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    
    console.log('💳 订阅记录:');
    if (subscriptions.length === 0) {
        console.log('   ❌ 无订阅记录');
    } else {
        subscriptions.forEach((sub, index) => {
            const endDate = new Date(sub.end_date);
            const now = new Date();
            const isValid = endDate > now;
            const statusIcon = isValid ? '✅' : '❌';
            
            console.log(`   ${statusIcon} 订阅${index + 1}:`);
            console.log(`      ID: ${sub.id}`);
            console.log(`      类型: ${sub.plan_type}`);
            console.log(`      状态: ${sub.status}`);
            console.log(`      开始: ${sub.start_date}`);
            console.log(`      结束: ${sub.end_date}`);
            console.log(`      有效: ${isValid ? '是' : '否（已过期）'}`);
            console.log('');
        });
    }
    
    // 查询活跃订阅
    const activeSub = db.prepare(`
        SELECT * FROM subscriptions 
        WHERE user_id = ? AND status = 'active' AND end_date > datetime('now')
        ORDER BY end_date DESC LIMIT 1
    `).get(user.id);
    
    console.log('🎯 当前活跃订阅:');
    if (activeSub) {
        console.log('   ✅ 有活跃订阅');
        console.log('   类型:', activeSub.plan_type);
        console.log('   结束时间:', activeSub.end_date);
        const daysLeft = Math.ceil((new Date(activeSub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        console.log('   剩余天数:', daysLeft);
    } else {
        console.log('   ❌ 无活跃订阅');
        console.log('   建议: 使用管理员账号给该用户添加订阅时长');
    }
    
} catch (error) {
    console.error('❌ 查询失败:', error);
} finally {
    db.close();
}
