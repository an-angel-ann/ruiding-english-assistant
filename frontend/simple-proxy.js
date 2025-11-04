const express = require('express');
const proxy = require('http-proxy-middleware');

const app = express();

console.log('🚀 启动代理服务器...');

// API代理
app.use('/api', proxy.createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    logLevel: 'debug'
}));

// 静态文件
app.use(express.static('/var/www/ruiding/frontend'));

app.listen(8080, () => {
    console.log('✅ 代理服务器运行在 8080');
    console.log('✅ 静态文件目录: /var/www/ruiding/frontend');
});
