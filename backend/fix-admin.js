// 修复管理员账号脚本
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data/ruiding.db');
const db = new Database(dbPath);

async function fixAdmin() {
    const adminEmail = 'o_oangela@126.com';
    const adminPassword = 'abcd56789';
    
    try {
        console.log('🔧 开始修复管理员账号...');
        
        // 先添加role列（如果不存在）
        try {
            db.prepare(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`).run();
            console.log('✅ 已添加role列到users表');
        } catch (e) {
            if (e.message.includes('duplicate column')) {
                console.log('ℹ️  role列已存在');
            } else {
                console.log('ℹ️  跳过添加role列:', e.message);
            }
        }
        
        // 删除旧的管理员账号（如果存在）
        const oldAdmin1 = db.prepare('SELECT id FROM users WHERE email = ?').get('o_oangela@163.com');
        if (oldAdmin1) {
            db.prepare('DELETE FROM users WHERE email = ?').run('o_oangela@163.com');
            console.log('✅ 已删除旧管理员账号: o_oangela@163.com');
        }
        
        // 检查新管理员账号是否存在
        const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
        
        if (existingAdmin) {
            // 更新密码
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            db.prepare('UPDATE users SET password_hash = ?, role = ?, username = ? WHERE email = ?')
                .run(passwordHash, 'admin', '管理员', adminEmail);
            console.log('✅ 已更新管理员账号密码:', adminEmail);
        } else {
            // 创建新管理员账号
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            db.prepare('INSERT INTO users (email, password_hash, username, role, trial_used) VALUES (?, ?, ?, ?, ?)')
                .run(adminEmail, passwordHash, '管理员', 'admin', 1);
            console.log('✅ 已创建管理员账号:', adminEmail);
        }
        
        console.log('');
        console.log('🎉 管理员账号修复完成！');
        console.log('📧 邮箱:', adminEmail);
        console.log('🔑 密码:', adminPassword);
        console.log('');
        
    } catch (error) {
        console.error('❌ 修复失败:', error);
    } finally {
        db.close();
    }
}

fixAdmin();
