require('dotenv').config();

// 根据环境变量选择数据库
// 在打包的Electron应用中默认使用SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.versions.electron;

if (USE_SQLITE) {
    // 使用SQLite（用于本地测试）
    console.log('📦 使用SQLite数据库');
    const sqlite = require('./database-sqlite');
    module.exports = {
        db: sqlite.db,
        testConnection: sqlite.testConnection,
        isSQL: false
    };
} else {
    // 使用MySQL（用于生产环境）
    console.log('📦 使用MySQL数据库');
    const mysql = require('mysql2/promise');
    
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ruiding_english',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });

    async function testConnection() {
        try {
            const connection = await pool.getConnection();
            console.log('✅ MySQL数据库连接成功');
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ MySQL数据库连接失败:', error.message);
            return false;
        }
    }

    module.exports = { pool, testConnection, isSQLite: false };
}
