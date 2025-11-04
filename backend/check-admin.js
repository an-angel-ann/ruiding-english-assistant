// 检查管理员账号状态
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/ruiding.db');
const db = new Database(dbPath);

try {
    console.log('🔍 检查管理员账号状态...\n');
    
    const admin = db.prepare('SELECT id, email, username, role, status, created_at FROM users WHERE email = ?')
        .get('o_oangela@126.com');
    
    if (admin) {
        console.log('✅ 找到管理员账号:');
        console.log('   ID:', admin.id);
        console.log('   邮箱:', admin.email);
        console.log('   用户名:', admin.username);
        console.log('   角色:', admin.role, admin.role === 'admin' ? '✅' : '❌');
        console.log('   状态:', admin.status);
        console.log('   创建时间:', admin.created_at);
        console.log('');
        
        if (admin.role !== 'admin') {
            console.log('⚠️  角色不是admin，正在修复...');
            db.prepare('UPDATE users SET role = ? WHERE email = ?')
                .run('admin', 'o_oangela@126.com');
            console.log('✅ 已将角色设置为admin');
        }
    } else {
        console.log('❌ 未找到管理员账号: o_oangela@126.com');
    }
    
    console.log('\n📊 所有用户列表:');
    const allUsers = db.prepare('SELECT id, email, username, role, status FROM users').all();
    allUsers.forEach(user => {
        console.log(`   ${user.id}. ${user.email} - 角色: ${user.role || 'NULL'} - 状态: ${user.status}`);
    });
    
} catch (error) {
    console.error('❌ 检查失败:', error);
} finally {
    db.close();
}
