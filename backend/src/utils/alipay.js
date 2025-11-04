const { AlipaySdk } = require('alipay-sdk');
require('dotenv').config();

// 延迟初始化支付宝SDK（等待配置）
let alipaySdk = null;

function getAlipaySdk() {
    if (!alipaySdk && process.env.ALIPAY_APP_ID) {
        alipaySdk = new AlipaySdk({
            appId: process.env.ALIPAY_APP_ID,
            privateKey: process.env.ALIPAY_PRIVATE_KEY,
            alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
            gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
            timeout: 5000,
            camelCase: true,
        });
    }
    return alipaySdk;
}

/**
 * 创建支付宝支付订单
 * @param {Object} orderInfo - 订单信息
 * @param {string} orderInfo.orderId - 订单ID
 * @param {number} orderInfo.amount - 支付金额（元）
 * @param {string} orderInfo.subject - 商品标题
 * @param {string} orderInfo.body - 商品描述
 * @returns {Promise<string>} - 支付URL
 */
function createPayment(orderInfo) {
    const sdk = getAlipaySdk();
    if (!sdk) {
        throw new Error('支付宝SDK未配置，请联系管理员');
    }
    
    try {
        // 生成支付URL（pageExec是同步方法，直接返回HTML表单字符串）
        const result = sdk.pageExec('alipay.trade.page.pay', {
            bizContent: {
                outTradeNo: orderInfo.orderId, // 商户订单号
                productCode: 'FAST_INSTANT_TRADE_PAY', // 产品码
                totalAmount: orderInfo.amount.toFixed(2), // 订单总金额，单位为元
                subject: orderInfo.subject, // 订单标题
                body: orderInfo.body || '', // 订单描述
            },
            returnUrl: process.env.ALIPAY_RETURN_URL || 'http://localhost:8888/payment-success.html',
            notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'http://localhost:3001/api/payment/notify',
        });
        
        return result;
    } catch (error) {
        console.error('创建支付宝订单失败:', error);
        throw error;
    }
}

/**
 * 验证支付宝回调签名
 * @param {Object} params - 回调参数
 * @returns {boolean} - 验证结果
 */
function verifyNotify(params) {
    const sdk = getAlipaySdk();
    if (!sdk) return false;
    
    try {
        return sdk.checkNotifySign(params);
    } catch (error) {
        console.error('验证支付宝签名失败:', error);
        return false;
    }
}

/**
 * 查询订单支付状态
 * @param {string} outTradeNo - 商户订单号
 * @returns {Promise<Object>} - 订单信息
 */
async function queryPayment(outTradeNo) {
    const sdk = getAlipaySdk();
    if (!sdk) {
        throw new Error('支付宝SDK未配置');
    }
    
    try {
        const result = await sdk.exec('alipay.trade.query', {
            bizContent: {
                outTradeNo: outTradeNo,
            }
        });
        
        return result;
    } catch (error) {
        console.error('查询支付宝订单失败:', error);
        throw error;
    }
}

/**
 * 关闭订单
 * @param {string} outTradeNo - 商户订单号
 * @returns {Promise<Object>} - 关闭结果
 */
async function closePayment(outTradeNo) {
    const sdk = getAlipaySdk();
    if (!sdk) {
        throw new Error('支付宝SDK未配置');
    }
    
    try {
        const result = await sdk.exec('alipay.trade.close', {
            bizContent: {
                outTradeNo: outTradeNo,
            }
        });
        
        return result;
    } catch (error) {
        console.error('关闭支付宝订单失败:', error);
        throw error;
    }
}

/**
 * 退款
 * @param {Object} refundInfo - 退款信息
 * @param {string} refundInfo.outTradeNo - 商户订单号
 * @param {number} refundInfo.refundAmount - 退款金额
 * @param {string} refundInfo.refundReason - 退款原因
 * @returns {Promise<Object>} - 退款结果
 */
async function refundPayment(refundInfo) {
    const sdk = getAlipaySdk();
    if (!sdk) {
        throw new Error('支付宝SDK未配置');
    }
    
    try {
        const result = await sdk.exec('alipay.trade.refund', {
            bizContent: {
                outTradeNo: refundInfo.outTradeNo,
                refundAmount: refundInfo.refundAmount.toFixed(2),
                refundReason: refundInfo.refundReason || '用户申请退款',
            }
        });
        
        return result;
    } catch (error) {
        console.error('支付宝退款失败:', error);
        throw error;
    }
}

module.exports = {
    createPayment,
    verifyNotify,
    queryPayment,
    closePayment,
    refundPayment
};
