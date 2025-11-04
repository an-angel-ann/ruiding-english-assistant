const crypto = require('crypto');
const axios = require('axios');

class XunhuPay {
    constructor(config) {
        this.appid = config.appid;
        this.appsecret = config.appsecret;
        this.gateway = config.gateway || 'https://api.xunhupay.com';
        this.notifyUrl = config.notifyUrl;
    }

    // 生成签名
    generateSign(params) {
        // 按key排序
        const sortedKeys = Object.keys(params).sort();
        const signStr = sortedKeys
            .map(key => `${key}=${params[key]}`)
            .join('&') + this.appsecret;
        
        return crypto.createHash('md5').update(signStr).digest('hex');
    }

    // 创建支付订单
    async createOrder(orderData) {
        // 虎皮椒官方支持的参数
        const params = {
            appid: this.appid,
            trade_order_id: orderData.orderId,
            total_fee: orderData.amount,
            title: orderData.title,  // 使用原始标题
            notify_url: this.notifyUrl,
            return_url: orderData.returnUrl || this.notifyUrl,
            nonce_str: this.generateNonceStr(),
            time: Math.floor(Date.now() / 1000),
            type: 'wechat'
        };

        // 生成签名（只包含上述官方参数）
        params.hash = this.generateSign(params);

        try {
            const url = `${this.gateway}/payment/do.html`;
            console.log('🔵 虎皮椒支付请求:', url);
            console.log('📦 订单参数:', {
                orderId: params.trade_order_id,
                amount: params.total_fee,
                title: params.title,
                type: params.type
            });

            const response = await axios.post(url, null, {
                params: params,
                timeout: 10000
            });

            console.log('✅ 虎皮椒响应:', response.data);

            if (response.data.errcode === 0) {
                const paymentUrl = response.data.url;
                console.log('💰 支付URL:', paymentUrl);
                
                return {
                    url: paymentUrl,
                    payurl: paymentUrl,
                    amount: orderData.amount
                };
            } else {
                throw new Error(response.data.errmsg || '创建支付订单失败');
            }

        } catch (error) {
            console.error('❌ 虎皮椒创建订单失败:', error.message);
            if (error.response) {
                console.error('响应数据:', error.response.data);
            }
            throw error;
        }
    }

    // 验证回调签名
    verifyNotify(params) {
        const receivedHash = params.hash;
        const paramsForSign = { ...params };
        delete paramsForSign.hash;
        
        const calculatedHash = this.generateSign(paramsForSign);
        return receivedHash === calculatedHash;
    }

    // 生成随机字符串
    generateNonceStr(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

module.exports = XunhuPay;
