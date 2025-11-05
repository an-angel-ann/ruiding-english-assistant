// 更新所有用户的role字段
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/ruiding.db');
const db = new Database(dbPath);

try {
    console.log('🔧 开始更新用户role字段...\n');
    
    // 查询所有role为NULL的用户
    const usersWithoutRole = db.prepare("SELECT id, email, role FROM users WHERE role IS NULL OR role = ''").all();
    
    console.log(`找到 ${usersWithoutRole.length} 个用户需要更新role字段\n`);
    
    if (usersWithoutRole.length > 0) {
        // 更新所有非管理员用户的role为'user'
        const result = db.prepare("UPDATE users SET role = 'user' WHERE (role IS NULL OR role = '') AND email != ?").run('ruiding_support@163.com');
        console.log(`✅ 已更新 ${result.changes} 个用户的role为'user'\n`);
    }
    
    // 显示所有用户的role状态
    console.log('📊 当前所有用户的role状态:');
    const allUsers = db.prepare('SELECT id, email, username, role, status FROM users ORDER BY id').all();
    allUsers.forEach(user => {
        const roleDisplay = user.role || 'NULL';
        const statusIcon = user.status === 'active' ? '✅' : '❌';
        console.log(`   ${statusIcon} ${user.id}. ${user.email} - role: ${roleDisplay} - status: ${user.status}`);
    });
    
    console.log('\n✅ 更新完成！');
    
} catch (error) {
    console.error('❌ 更新失败:', error);
} finally {
    db.close();
}
