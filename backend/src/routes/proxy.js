const express = require('express');
const router = express.Router();
const https = require('https');

// 阿里云API代理（暂时不需要认证，让前端可以直接调用）
router.post('/', async (req, res) => {
    try {
        console.log('🔧 收到的原始请求头:', JSON.stringify(req.headers, null, 2));
        console.log('🔧 Express解析的请求体:', JSON.stringify(req.body, null, 2));
        
        const { endpoint, data } = req.body;
        
        if (!endpoint || !data) {
            console.error('❌ 缺少必要参数:', { endpoint: !!endpoint, data: !!data });
            return res.status(400).json({ error: '缺少必要参数: endpoint 和 data' });
        }
        
        // 从请求头或环境变量获取API Key
        const apiKey = req.headers['x-api-key'] || process.env.DEFAULT_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'Missing API Key' });
        }

        console.log('🔵 代理AI请求:', endpoint);

        // 根据endpoint判断是阿里云还是DeepSeek API
        let options;
        if (endpoint.includes('dashscope.aliyuncs.com')) {
            // 阿里云API配置
            options = {
                hostname: 'dashscope.aliyuncs.com',
                path: endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            };
        } else if (endpoint.includes('compatible-mode')) {
            // DeepSeek API配置
            options = {
                hostname: 'api.deepseek.com',
                path: endpoint.replace('/compatible-mode', ''),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            };
        } else {
            // 默认阿里云API
            options = {
                hostname: 'dashscope.aliyuncs.com',
                path: endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            };
        }

        // 发送请求到阿里云
        const apiReq = https.request(options, (apiRes) => {
            let responseData = '';

            apiRes.on('data', (chunk) => {
                responseData += chunk;
            });

            apiRes.on('end', () => {
                console.log('🟢 AI响应状态:', apiRes.statusCode);
                res.status(apiRes.statusCode).send(responseData);
            });
        });

        apiReq.on('error', (error) => {
            console.error('🔴 API请求失败:', error);
            res.status(500).json({ error: '调用AI服务失败', details: error.message });
        });

        // 发送请求数据
        try {
            const jsonData = JSON.stringify(data);
            apiReq.write(jsonData);
        } catch (jsonError) {
            console.error('🔴 JSON序列化失败:', jsonError);
            return res.status(400).json({ error: '请求数据格式错误', details: jsonError.message });
        }
        apiReq.end();

    } catch (error) {
        console.error('🔴 代理请求处理失败:', error);
        res.status(500).json({ error: '代理请求失败', details: error.message });
    }
});

module.exports = router;
