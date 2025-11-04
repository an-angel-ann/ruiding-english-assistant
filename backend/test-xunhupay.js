// 测试虎皮椒支付API
const crypto = require('crypto');
const axios = require('axios');

// 虎皮椒配置
const config = {
    appid: '201906174757',
    appsecret: '7ad2be90bee73db2ec052a3e3a1151ca',
    gateway: 'https://api.xunhupay.com'
};

// 生成签名
function generateSign(params, appsecret) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
        .map(key => `${key}=${params[key]}`)
        .join('&') + appsecret;
    
    return crypto.createHash('md5').update(signStr).digest('hex');
}

// 生成随机字符串
function generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 测试不同金额
async function testPayment(amount, title) {
    console.log(`\n========== 测试 ${title} (${amount}元) ==========`);
    
    const params = {
        appid: config.appid,
        trade_order_id: 'TEST' + Date.now(),
        total_fee: amount,
        title: title,
        notify_url: 'http://ruiding.online/api/payment/notify',
        return_url: 'http://ruiding.online/api/payment/return',
        nonce_str: generateNonceStr(),
        time: Math.floor(Date.now() / 1000),
        type: 'wechat'
    };
    
    // 生成签名
    params.hash = generateSign(params, config.appsecret);
    
    console.log('📦 请求参数:', {
        trade_order_id: params.trade_order_id,
        total_fee: params.total_fee,
        title: params.title,
        nonce_str: params.nonce_str,
        time: params.time,
        hash: params.hash
    });
    
    try {
        const response = await axios.post(`${config.gateway}/payment/do.html`, null, {
            params: params,
            timeout: 10000
        });
        
        console.log('✅ 虎皮椒响应:', response.data);
        
        if (response.data.errcode === 0) {
            console.log('💰 支付URL:', response.data.url);
            console.log('🔗 二维码URL:', response.data.url_qrcode);
            
            // 测试支付页面内容
            const pageResponse = await axios.get(response.data.url);
            const html = pageResponse.data;
            
            // 提取标题和价格
            const titleMatch = html.match(/<div class="title">([^<]+)<\/div>/);
            const priceMatch = html.match(/<div class="price">([^<]+)<\/div>/);
            
            if (titleMatch && priceMatch) {
                console.log('📄 支付页面显示:');
                console.log('   标题:', titleMatch[1]);
                console.log('   价格:', priceMatch[1]);
            } else {
                console.log('⚠️ 无法从HTML中提取标题和价格');
            }
        } else {
            console.log('❌ 创建订单失败:', response.data.errmsg);
        }
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.response) {
            console.error('响应数据:', error.response.data);
        }
    }
}

// 执行测试
async function runTests() {
    console.log('🧪 虎皮椒支付API测试');
    console.log('Appid:', config.appid);
    console.log('密钥:', config.appsecret.substring(0, 10) + '...');
    
    // 测试1元
    await testPayment(1, '新客福利-7天体验');
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试29元
    await testPayment(29, '月度会员');
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试299元
    await testPayment(299, '年度会员');
    
    console.log('\n========== 测试完成 ==========');
}

runTests().catch(console.error);
