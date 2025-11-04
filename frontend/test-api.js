// Node.js 测试脚本 - 绕过浏览器CORS限制
// 运行方法: node test-api.js

const https = require('https');

// 请在这里输入您的API Key
const API_KEY = 'sk-your-api-key-here';

function testAPI() {
    console.log('🔍 开始测试阿里云API...\n');
    
    if (API_KEY === 'sk-your-api-key-here') {
        console.log('❌ 请先在脚本中设置您的API Key');
        console.log('   编辑文件: test-api.js');
        console.log('   修改第5行: const API_KEY = "您的API_KEY";\n');
        return;
    }
    
    const data = JSON.stringify({
        model: 'qwen-max',
        input: {
            messages: [{
                role: 'user',
                content: 'Hello, please respond in Chinese'
            }]
        },
        parameters: {
            result_format: 'message'
        }
    });
    
    const options = {
        hostname: 'dashscope.aliyuncs.com',
        port: 443,
        path: '/api/v1/services/aigc/text-generation/generation',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Length': Buffer.byteLength(data)
        }
    };
    
    console.log('📡 发送请求到:', `https://${options.hostname}${options.path}`);
    console.log('🔑 使用API Key:', API_KEY.substring(0, 10) + '...\n');
    
    const req = https.request(options, (res) => {
        console.log(`📊 响应状态码: ${res.statusCode}`);
        console.log(`📋 响应头:`, JSON.stringify(res.headers, null, 2), '\n');
        
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log('📦 响应内容:');
            console.log(responseData, '\n');
            
            if (res.statusCode === 200) {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ API测试成功！');
                    console.log('🤖 AI回复:', result.output.choices[0].message.content);
                } catch (e) {
                    console.log('⚠️  解析响应失败:', e.message);
                }
            } else if (res.statusCode === 401) {
                console.log('❌ API Key无效或已过期');
                console.log('💡 解决方法:');
                console.log('   1. 检查API Key是否正确');
                console.log('   2. 访问 https://bailian.console.aliyun.com/');
                console.log('   3. 重新生成API Key');
            } else if (res.statusCode === 400) {
                console.log('❌ 请求错误');
                console.log('💡 可能原因:');
                console.log('   1. qwen-max模型未开通');
                console.log('   2. 请求格式不正确');
                console.log('   3. 访问 https://bailian.console.aliyun.com/ 开通模型');
            } else {
                console.log(`❌ 请求失败，状态码: ${res.statusCode}`);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error('❌ 请求失败:', e.message);
        console.log('\n💡 可能原因:');
        console.log('   1. 网络连接问题');
        console.log('   2. DNS解析失败');
        console.log('   3. 防火墙拦截');
    });
    
    req.write(data);
    req.end();
}

testAPI();
