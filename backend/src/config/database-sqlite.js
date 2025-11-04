const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 确保data目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ruiding.db');

// 创建数据库连接
const db = new Database(dbPath);
console.log('✅ SQLite数据库连接成功');

// 包装为Promise的查询方法
db.queryAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = this.prepare(sql);
            const rows = stmt.all(params);
            resolve(rows);
        } catch (err) {
            reject(err);
        }
    });
};

db.runAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = this.prepare(sql);
            const result = stmt.run(params);
            resolve({ lastID: result.lastInsertRowid, changes: result.changes });
        } catch (err) {
            reject(err);
        }
    });
};

db.getAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = this.prepare(sql);
            const row = stmt.get(params);
            resolve(row);
        } catch (err) {
            reject(err);
        }
    });
};

// 初始化表结构
function initializeTables() {
    return new Promise((resolve, reject) => {
        try {
            // 创建用户表
            db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    username TEXT,
                    role TEXT DEFAULT 'user',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    status TEXT DEFAULT 'active',
                    trial_used INTEGER DEFAULT 0
                )
            `);
            console.log('✅ users表已创建');
            
            // 检查role列是否存在，如果不存在则添加
            try {
                db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
                console.log('✅ 已添加role列到users表');
            } catch (e) {
                // 列已存在，忽略错误
            }

            // 创建订阅表
            db.exec(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    plan_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    auto_renew INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ subscriptions表已创建');

            // 创建支付记录表
            db.exec(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    subscription_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    payment_method TEXT NOT NULL,
                    transaction_id TEXT UNIQUE,
                    status TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ payments表已创建');

            // 创建支付订单表
            db.exec(`
                CREATE TABLE IF NOT EXISTS payment_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    plan_type TEXT NOT NULL,
                    amount REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    paid_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ payment_orders表已创建');

            // 创建设备绑定表
            db.exec(`
                CREATE TABLE IF NOT EXISTS device_bindings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    device_fingerprint TEXT NOT NULL,
                    device_name TEXT,
                    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, device_fingerprint),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ device_bindings表已创建');

            // 创建邮箱验证码记录表
            db.exec(`
                CREATE TABLE IF NOT EXISTS email_verification_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    code TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    ip_address TEXT,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ email_verification_logs表已创建');

            // 创建使用记录表
            db.exec(`
                CREATE TABLE IF NOT EXISTS usage_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    action_type TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ usage_logs表已创建');
            
            // 创建管理员备注表
            db.exec(`
                CREATE TABLE IF NOT EXISTS admin_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    note TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ admin_notes表已创建');

            resolve();
        } catch (error) {
            console.error('❌ 创建表失败:', error);
            reject(error);
        }
    });
}

// 测试连接
async function testConnection() {
    try {
        await initializeTables();
        console.log('✅ 数据库初始化完成');
        return true;
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
        return false;
    }
}

// 初始化管理员账号
async function initializeAdmin() {
    const bcrypt = require('bcryptjs');
    const adminEmail = 'o_oangela@126.com';
    const adminPassword = 'abcd56789';
    
    try {
        // 检查管理员是否已存在
        const existingAdmin = await db.getAsync(
            'SELECT id FROM users WHERE email = ?',
            [adminEmail]
        );
        
        if (!existingAdmin) {
            // 创建管理员账号
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            await db.runAsync(
                'INSERT INTO users (email, password_hash, username, role, trial_used) VALUES (?, ?, ?, ?, ?)',
                [adminEmail, passwordHash, '管理员', 'admin', 1]
            );
            console.log('✅ 管理员账号已创建:', adminEmail);
        } else {
            // 确保现有账号是管理员角色
            await db.runAsync(
                'UPDATE users SET role = ? WHERE email = ?',
                ['admin', adminEmail]
            );
            console.log('✅ 管理员账号已存在:', adminEmail);
        }
    } catch (error) {
        console.error('❌ 初始化管理员账号失败:', error);
    }
}

// 立即初始化数据库
initializeTables().then(async () => {
    console.log('✅ SQLite数据库连接成功');
    await initializeAdmin();
}).catch(error => {
    console.error('❌ 数据库初始化失败:', error);
});

module.exports = { db, testConnection };
