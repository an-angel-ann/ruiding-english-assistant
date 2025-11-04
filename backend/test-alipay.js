require('dotenv').config();
const { AlipaySdk } = require('alipay-sdk');

console.log('=== 支付宝配置检查 ===');
console.log('ALIPAY_APP_ID:', process.env.ALIPAY_APP_ID);
console.log('ALIPAY_PRIVATE_KEY:', process.env.ALIPAY_PRIVATE_KEY ? '已设置 (' + process.env.ALIPAY_PRIVATE_KEY.length + ' 字符)' : '未设置');
console.log('ALIPAY_PUBLIC_KEY:', process.env.ALIPAY_PUBLIC_KEY ? '已设置 (' + process.env.ALIPAY_PUBLIC_KEY.length + ' 字符)' : '未设置');
console.log('ALIPAY_GATEWAY:', process.env.ALIPAY_GATEWAY);
console.log('');

try {
    console.log('=== 初始化支付宝SDK ===');
    const alipaySdk = new AlipaySdk({
        appId: process.env.ALIPAY_APP_ID,
        privateKey: process.env.ALIPAY_PRIVATE_KEY,
        alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
        gateway: process.env.ALIPAY_GATEWAY,
        timeout: 5000,
        camelCase: true,
    });
    
    console.log('✅ 支付宝SDK初始化成功！');
    console.log('SDK对象:', typeof alipaySdk);
    console.log('');
    
    // 测试创建支付
    console.log('=== 测试创建支付订单 ===');
    const result = alipaySdk.pageExec('alipay.trade.page.pay', {
        bizContent: {
            outTradeNo: 'TEST' + Date.now(),
            productCode: 'FAST_INSTANT_TRADE_PAY',
            totalAmount: '0.01',
            subject: '测试订单',
        },
        returnUrl: 'http://localhost:8888/payment-success.html',
        notifyUrl: 'http://localhost:3001/api/payment/notify',
    });
    
    console.log('✅ 支付订单创建成功！');
    console.log('支付表单类型:', typeof result);
    console.log('支付表单长度:', result.length, '字符');
    console.log('支付表单前100字符:', result.substring(0, 100));
    
} catch (error) {
    console.error('❌ 支付宝SDK初始化失败:');
    console.error('错误信息:', error.message);
    console.error('完整错误:', error);
}
