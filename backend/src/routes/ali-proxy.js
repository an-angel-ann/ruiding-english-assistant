const express = require('express');
const router = express.Router();
const https = require('https');

// 测试API Key有效性
router.post('/test-api-key', async (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey || !apiKey.startsWith('sk-')) {
            return res.json({ valid: false, error: 'Invalid API Key format' });
        }
        
        console.log('🔍 测试API Key有效性...');
        
        // 发送一个简单的测试请求到阿里云
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            path: '/api/v1/services/aigc/text-generation/generation',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        };
        
        const testData = JSON.stringify({
            model: 'qwen-turbo',
            input: { messages: [{ role: 'user', content: 'test' }] },
            parameters: { max_tokens: 10 }
        });
        
        const apiReq = https.request(options, (apiRes) => {
            let responseData = '';
            
            apiRes.on('data', (chunk) => {
                responseData += chunk;
            });
            
            apiRes.on('end', () => {
                console.log('✅ API Key测试响应状态:', apiRes.statusCode);
                
                // 200或400都说明API Key有效（400可能是参数问题，但Key是有效的）
                // 401说明API Key无效
                if (apiRes.statusCode === 401) {
                    res.json({ valid: false, error: 'Invalid API Key' });
                } else {
                    res.json({ valid: true });
                }
            });
        });
        
        apiReq.on('error', (error) => {
            console.error('❌ API Key测试失败:', error);
            res.json({ valid: false, error: error.message });
        });
        
        apiReq.write(testData);
        apiReq.end();
        
    } catch (error) {
        console.error('❌ API Key验证错误:', error);
        res.status(500).json({ valid: false, error: error.message });
    }
});

// 阿里云API代理 - 直接转发请求
router.post('/aigc/*', async (req, res) => {
    try {
        // 获取完整路径
        const apiPath = req.path; // 例如: /aigc/text-generation/generation
        
        console.log('🔵 阿里云API代理请求:', apiPath);
        console.log('📦 请求体:', JSON.stringify(req.body).substring(0, 200) + '...');
        console.log('🔑 Authorization header:', req.headers.authorization ? '存在' : '不存在');
        console.log('📋 所有headers:', Object.keys(req.headers).join(', '));
        
        // 从Authorization header获取API Key
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ 缺少或无效的Authorization header:', authHeader);
            return res.status(401).json({ error: '缺少API Key', receivedHeader: authHeader });
        }
        
        const apiKey = authHeader.replace('Bearer ', '');
        
        // 构建阿里云API请求
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            path: `/api/v1/services${apiPath}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        };
        
        console.log('🌐 转发到:', `https://${options.hostname}${options.path}`);
        
        // 发送请求到阿里云
        const apiReq = https.request(options, (apiRes) => {
            let responseData = '';
            
            apiRes.on('data', (chunk) => {
                responseData += chunk;
            });
            
            apiRes.on('end', () => {
                console.log('✅ 阿里云响应状态:', apiRes.statusCode);
                
                // 转发响应头
                Object.keys(apiRes.headers).forEach(key => {
                    res.setHeader(key, apiRes.headers[key]);
                });
                
                res.status(apiRes.statusCode).send(responseData);
            });
        });
        
        apiReq.on('error', (error) => {
            console.error('❌ 阿里云API请求失败:', error);
            res.status(500).json({ 
                error: '调用阿里云服务失败', 
                details: error.message 
            });
        });
        
        // 发送请求数据
        const jsonData = JSON.stringify(req.body);
        apiReq.write(jsonData);
        apiReq.end();
        
    } catch (error) {
        console.error('❌ 代理请求处理失败:', error);
        res.status(500).json({ 
            error: '代理请求失败', 
            details: error.message 
        });
    }
});

module.exports = router;
