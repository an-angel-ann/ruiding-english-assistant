#!/usr/bin/env node

/**
 * 清理数据库脚本 - 用于发布版本
 * 只保留 ruiding.vip.user 特殊账户，删除所有其他用户数据
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../backend/data/ruiding.db');

console.log('🔧 开始清理数据库...');
console.log('📁 数据库路径:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('❌ 数据库文件不存在:', dbPath);
    process.exit(1);
}

try {
    const db = new Database(dbPath);
    
    // 开始事务
    db.exec('BEGIN TRANSACTION');
    
    // 1. 删除所有非 ruiding.vip.user 的用户
    const deleteUsersResult = db.prepare(`
        DELETE FROM users 
        WHERE username != 'ruiding.vip.user'
    `).run();
    console.log(`✅ 删除了 ${deleteUsersResult.changes} 个用户账户`);
    
    // 2. 删除所有订阅记录
    const deleteSubscriptionsResult = db.prepare('DELETE FROM subscriptions').run();
    console.log(`✅ 删除了 ${deleteSubscriptionsResult.changes} 条订阅记录`);
    
    // 3. 删除所有支付记录
    const deletePaymentsResult = db.prepare('DELETE FROM payments').run();
    console.log(`✅ 删除了 ${deletePaymentsResult.changes} 条支付记录`);
    
    // 4. 删除所有会话
    const deleteSessionsResult = db.prepare('DELETE FROM sessions').run();
    console.log(`✅ 删除了 ${deleteSessionsResult.changes} 条会话记录`);
    
    // 提交事务
    db.exec('COMMIT');
    
    // 验证结果
    const remainingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const vipUser = db.prepare('SELECT username, email FROM users WHERE username = ?').get('ruiding.vip.user');
    
    console.log('\n📊 清理结果:');
    console.log(`   剩余用户数: ${remainingUsers.count}`);
    if (vipUser) {
        console.log(`   保留账户: ${vipUser.username} (${vipUser.email})`);
    } else {
        console.warn('⚠️  警告: ruiding.vip.user 账户不存在！');
    }
    
    db.close();
    console.log('\n✅ 数据库清理完成！');
    
} catch (error) {
    console.error('❌ 清理失败:', error.message);
    process.exit(1);
}
