// 测试虎皮椒API - 不使用任何固定产品ID
const crypto = require('crypto');
const axios = require('axios');

const config = {
    appid: '201906174757',
    appsecret: '7ad2be90bee73db2ec052a3e3a1151ca',
    gateway: 'https://api.xunhupay.com'
};

function generateSign(params, appsecret) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
        .map(key => `${key}=${params[key]}`)
        .join('&') + appsecret;
    return crypto.createHash('md5').update(signStr).digest('hex');
}

function generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function testPayment(amount, title) {
    console.log(`\n========== 测试 ${title} (${amount}元) ==========`);
    
    // 不包含openid，让虎皮椒自动创建
    const params = {
        appid: config.appid,
        trade_order_id: 'DIRECT_TEST_' + Date.now(),
        total_fee: amount,
        title: title,
        notify_url: 'http://ruiding.online/api/payment/notify',
        return_url: 'http://ruiding.online/api/payment/return',
        nonce_str: generateNonceStr(),
        time: Math.floor(Date.now() / 1000),
        type: 'wechat'
    };
    
    params.hash = generateSign(params, config.appsecret);
    
    console.log('📦 请求参数:', {
        trade_order_id: params.trade_order_id,
        total_fee: params.total_fee,
        title: params.title,
        hash: params.hash.substring(0, 16) + '...'
    });
    
    try {
        const response = await axios.post(`${config.gateway}/payment/do.html`, null, {
            params: params,
            timeout: 10000
        });
        
        console.log('✅ 虎皮椒响应:', {
            openid: response.data.openid,
            openid_type: typeof response.data.openid,
            errcode: response.data.errcode,
            errmsg: response.data.errmsg
        });
        
        if (response.data.errcode === 0 && response.data.url) {
            console.log('💰 支付URL:', response.data.url);
            
            // 提取payqr URL并测试
            const indexUrl = response.data.url;
            const indexResponse = await axios.get(indexUrl);
            const html = indexResponse.data;
            
            // 查找重定向的payqr URL
            const match = html.match(/location\.href='([^']+payqr[^']+)'/);
            if (match) {
                const payqrUrl = match[1];
                console.log('🔗 实际支付页面:', payqrUrl);
                
                // 获取支付页面内容
                const payqrResponse = await axios.get(payqrUrl);
                const payqrHtml = payqrResponse.data;
                
                const titleMatch = payqrHtml.match(/<div class="title">([^<]+)<\/div>/);
                const priceMatch = payqrHtml.match(/<div class="price">([^<]+)<\/div>/);
                
                if (titleMatch && priceMatch) {
                    console.log('📄 支付页面显示:');
                    console.log('   标题:', titleMatch[1].trim());
                    console.log('   价格:', priceMatch[1].trim());
                    
                    const expectedPrice = `￥${amount}.00`;
                    if (priceMatch[1].trim() === expectedPrice) {
                        console.log('   ✅ 价格正确！');
                    } else {
                        console.log(`   ❌ 价格错误！期望: ${expectedPrice}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
    }
}

async function runTests() {
    console.log('🧪 虎皮椒直接测试（不使用固定产品ID）');
    console.log('Appid:', config.appid);
    
    await testPayment(1, '新客福利-7天体验');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testPayment(29, '月度会员');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testPayment(299, '年度会员');
    
    console.log('\n========== 测试完成 ==========');
}

runTests().catch(console.error);
