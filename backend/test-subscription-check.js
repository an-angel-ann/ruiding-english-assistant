// 测试订阅验证逻辑
const { db } = require('./src/config/database-sqlite');

async function testSubscriptionCheck(userId) {
    console.log(`\n========== 测试用户 ${userId} 的订阅验证 ==========\n`);
    
    try {
        // 1. 查询活跃订阅
        console.log('🔍 步骤1: 查询活跃订阅...');
        const rows = await db.queryAsync(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
            [userId, 'active']
        );
        
        console.log(`📊 查询结果: 找到 ${rows ? rows.length : 0} 条记录`);
        
        if (rows && rows.length > 0) {
            const subscription = rows[0];
            const endDate = new Date(subscription.end_date);
            const now = new Date();
            
            console.log('\n📅 订阅详情:');
            console.log('   ID:', subscription.id);
            console.log('   套餐类型:', subscription.plan_type);
            console.log('   状态:', subscription.status);
            console.log('   开始时间:', subscription.start_date);
            console.log('   结束时间:', subscription.end_date);
            console.log('   到期时间(解析):', endDate.toISOString());
            console.log('   当前时间:', now.toISOString());
            console.log('   时间差(ms):', endDate - now);
            console.log('   剩余天数:', Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
            
            if (endDate > now) {
                console.log('\n✅ 订阅有效！');
                console.log('   用户应该能够直接进入功能页');
                return true;
            } else {
                console.log('\n❌ 订阅已过期！');
                console.log('   用户应该看到订阅引导页');
                return false;
            }
        } else {
            console.log('\nℹ️ 未找到活跃订阅');
            console.log('   用户应该看到订阅引导页');
            return false;
        }
    } catch (error) {
        console.error('\n❌ 错误:', error);
        return false;
    }
}

async function runTests() {
    console.log('🧪 订阅验证测试\n');
    
    // 测试用户6（应该有有效订阅）
    await testSubscriptionCheck(6);
    
    // 测试用户5（订阅已过期）
    await testSubscriptionCheck(5);
    
    // 测试不存在的用户
    await testSubscriptionCheck(999);
    
    console.log('\n========== 测试完成 ==========\n');
    process.exit(0);
}

runTests().catch(console.error);
