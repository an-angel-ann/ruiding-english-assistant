// 后端代理服务器 - 解决CORS问题
// 运行方法: node server.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const BACKEND_URL = 'http://localhost:3001';

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 处理认证API代理请求
function handleAuthAPIProxy(req, res, parsedUrl) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        const search = parsedUrl.search ? parsedUrl.search : '';
        const backendUrl = `${BACKEND_URL}${parsedUrl.pathname}${search}`;
        
        console.log(`📡 代理认证请求: ${req.method} ${backendUrl}`);
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: parsedUrl.pathname + search,
            method: req.method,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Authorization': req.headers['authorization'] || '',
                'User-Agent': req.headers['user-agent'] || ''
            }
        };
        
        const backendReq = http.request(options, (backendRes) => {
            let responseData = '';
            
            backendRes.on('data', chunk => {
                responseData += chunk;
            });
            
            backendRes.on('end', () => {
                console.log(`✅ 后端响应: ${backendRes.statusCode}`);
                
                res.writeHead(backendRes.statusCode, {
                    'Content-Type': backendRes.headers['content-type'] || 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                });
                res.end(responseData);
            });
        });
        
        backendReq.on('error', (error) => {
            console.error(`❌ 后端请求失败:`, error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        });
        
        backendReq.write(body);
        backendReq.end();
    });
}

// 处理API代理请求
function handleAPIProxy(req, res, parsedUrl) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            console.log('📝 收到的请求体长度:', body.length);
            
            // 直接转发到后端代理，避免本地JSON解析问题
            const backendReq = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/api/proxy',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'X-API-Key': req.headers['x-api-key'] || ''
                }
            }, (backendRes) => {
                let responseData = '';
                
                backendRes.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                backendRes.on('end', () => {
                    console.log('✅ 后端代理响应状态:', backendRes.statusCode);
                    res.writeHead(backendRes.statusCode, { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': '*'
                    });
                    res.end(responseData);
                });
            });
            
            backendReq.on('error', (error) => {
                console.error('❌ 后端代理请求失败:', error.message);
                
                // 返回模拟响应
                const requestData = JSON.parse(body);
                const mockResponse = getMockResponse(requestData);
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*'
                });
                res.end(JSON.stringify(mockResponse));
            });
            
            backendReq.write(body);
            backendReq.end();
            
        } catch (error) {
            console.error('❌ 处理请求失败:', error.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// 处理阿里云API直接代理请求
function handleAliCloudDirectProxy(req, res, parsedUrl) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
            
            if (!apiKey) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing API Key' }));
                return;
            }
            
            console.log(`🔗 直接代理阿里云API: ${parsedUrl.pathname}`);
            console.log(`🔑 使用API Key: ${apiKey.substring(0, 10)}...`);
            
            const options = {
                hostname: 'dashscope.aliyuncs.com',
                port: 443,
                path: parsedUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            
            const apiReq = https.request(options, (apiRes) => {
                let responseData = '';
                
                apiRes.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                apiRes.on('end', () => {
                    console.log('✅ 阿里云API响应状态:', apiRes.statusCode);
                    res.writeHead(apiRes.statusCode, { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': '*'
                    });
                    res.end(responseData);
                });
            });
            
            apiReq.on('error', (error) => {
                console.error('❌ 阿里云API请求失败:', error.message);
                
                // 返回模拟响应
                const mockResponse = getMockResponseFromPath(parsedUrl.pathname);
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*'
                });
                res.end(JSON.stringify(mockResponse));
            });
            
            apiReq.write(body);
            apiReq.end();
            
        } catch (error) {
            console.error('❌ 处理阿里云API请求失败:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// 根据路径获取模拟响应
function getMockResponseFromPath(path) {
    if (path.includes('/vision/text-generation/generation')) {
        return {
            output: {
                choices: [{
                    message: {
                        content: 'The quick brown fox jumps over the lazy dog. This is a sample sentence for testing OCR functionality. Please recognize this English text from the image.'
                    }
                }]
            }
        };
    } else if (path.includes('/aigc/text-generation/generation')) {
        return {
            output: {
                choices: [{
                    message: {
                        content: '这是翻译结果。'
                    }
                }]
            }
        };
    }
    
    return {
        output: {
            choices: [{
                message: {
                    content: '模拟AI响应'
                }
            }]
        }
    };
}

// 模拟响应函数
function getMockResponse(requestData) {
    const endpoint = requestData.endpoint;
    const data = requestData.data;
    
    if (endpoint.includes('/vision/text-generation/generation')) {
        // OCR模拟响应
        return {
            output: {
                choices: [{
                    message: {
                        content: 'The quick brown fox jumps over the lazy dog. This is a sample sentence for testing OCR functionality.'
                    }
                }]
            }
        };
    } else if (endpoint.includes('/aigc/text-generation/generation')) {
        // 翻译和分析模拟响应
        const prompt = data.input?.messages?.[0]?.content || '';
        
        if (prompt.includes('翻译成中文')) {
            return {
                output: {
                    choices: [{
                        message: {
                            content: '这是中文翻译结果。'
                        }
                    }]
                }
            };
        } else if (prompt.includes('详细分析')) {
            return {
                output: {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                words: [
                                    { english: "quick", chinese: "快速的" },
                                    { english: "brown fox", chinese: "棕色的狐狸" }
                                ],
                                structure: [
                                    { component: "主语", content: "The quick brown fox" },
                                    { component: "谓语", content: "jumps over" }
                                ],
                                scrambled: ["brown fox", "jumps over", "The quick"]
                            })
                        }
                    }]
                }
            };
        }
    }
    
    return {
        output: {
            choices: [{
                message: {
                    content: '模拟AI响应'
                }
            }]
        }
    };
}

// 处理静态文件请求
function handleStaticFile(req, res, filePath) {
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            const extname = path.extname(filePath);
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// 处理图片上传请求
function handleImageUpload(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const imageData = JSON.parse(body);
            const base64Image = imageData.base64Image;
            const imageBuffer = Buffer.from(base64Image, 'base64');
            
            // 保存图片到本地
            const imagePath = './uploads/image.png';
            fs.writeFile(imagePath, imageBuffer, (error) => {
                if (error) {
                    console.error('❌ 图片保存失败:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    console.log('✅ 图片保存成功！');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ url: `http://localhost:${PORT}/uploads/image.png` }));
                }
            });
        } catch (error) {
            console.error('❌ 处理图片上传请求失败:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// 创建服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // 图片上传接口（用于OCR）
    if (parsedUrl.pathname === '/api/upload-image' && req.method === 'POST') {
        handleImageUpload(req, res);
        return;
    }
    
    // 处理CORS预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        });
        res.end();
        return;
    }
    
    // 认证API代理路由
    if (parsedUrl.pathname.startsWith('/api/auth') || 
        parsedUrl.pathname.startsWith('/api/subscription') || 
        parsedUrl.pathname.startsWith('/api/payment') ||
        parsedUrl.pathname.startsWith('/api/admin')) {
        handleAuthAPIProxy(req, res, parsedUrl);
        return;
    }
    
    // 阿里云API代理路由
    if (parsedUrl.pathname === '/api/proxy' && req.method === 'POST') {
        handleAPIProxy(req, res, parsedUrl);
        return;
    }
    
    // 阿里云API直接代理（绕过后端JSON解析问题）
    if (parsedUrl.pathname.startsWith('/api/v1/') && req.method === 'POST') {
        handleAliCloudDirectProxy(req, res, parsedUrl);
        return;
    }
    
    // 静态文件服务
    let filePath = '.' + parsedUrl.pathname;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    handleStaticFile(req, res, filePath);
});

server.listen(PORT, () => {
    console.log('🚀 服务器启动成功！');
    console.log(`📡 访问地址: http://localhost:${PORT}`);
    console.log(`📝 主应用: http://localhost:${PORT}/index.html`);
    console.log(`🔧 测试工具: http://localhost:${PORT}/debug.html`);
    console.log('\n按 Ctrl+C 停止服务器\n');
});
