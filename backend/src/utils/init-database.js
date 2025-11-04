const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
    let connection;
    
    try {
        // 先连接到MySQL服务器（不指定数据库）
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD
        });

        console.log('📦 开始初始化数据库...');

        // 创建数据库（如果不存在）
        const dbName = process.env.DB_NAME || 'ruiding_english';
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ 数据库 ${dbName} 已创建/存在`);

        // 切换到目标数据库
        await connection.query(`USE ${dbName}`);

        // 创建用户表
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                username VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
                trial_used BOOLEAN DEFAULT FALSE,
                INDEX idx_email (email),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ 用户表已创建');

        // 创建订阅表
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                plan_type ENUM('trial', 'monthly', 'yearly') NOT NULL,
                status ENUM('active', 'expired', 'cancelled') NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                auto_renew BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_end_date (end_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ 订阅表已创建');

        // 创建支付记录表
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                subscription_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                payment_method ENUM('alipay', 'wechat', 'trial') NOT NULL,
                transaction_id VARCHAR(255) UNIQUE,
                status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_transaction_id (transaction_id),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ 支付记录表已创建');

        // 创建使用记录表
        await connection.query(`
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                action_type ENUM('ocr', 'ai_analysis', 'word_learning', 'sentence_learning') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_action_type (action_type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ 使用记录表已创建');

        console.log('🎉 数据库初始化完成！');

    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// 运行初始化
initDatabase();
