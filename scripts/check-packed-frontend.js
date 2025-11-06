const fs = require('fs');
const path = require('path');

// 检查源文件
const sourcePath = path.join(__dirname, '../frontend/index.html');
const sourceContent = fs.readFileSync(sourcePath, 'utf-8');

console.log('=== 检查源文件 ===');
console.log('文件路径:', sourcePath);
console.log('文件大小:', sourceContent.length, '字节');
console.log('\n查找关键字符串:');
console.log('- "🎯 [启动动画脚本] 脚本开始加载":', sourceContent.includes('🎯 [启动动画脚本] 脚本开始加载') ? '✅ 存在' : '❌ 不存在');
console.log('- "🚀 页面脚本开始执行":', sourceContent.includes('🚀 页面脚本开始执行') ? '✅ 存在' : '❌ 不存在');
console.log('- "启动动画处理脚本":', sourceContent.includes('启动动画处理脚本') ? '✅ 存在' : '❌ 不存在');

// 查找脚本标签
const scriptMatches = sourceContent.match(/<script>/g);
console.log('\n<script> 标签数量:', scriptMatches ? scriptMatches.length : 0);

// 查找启动动画相关代码的位置
const splashScriptIndex = sourceContent.indexOf('🎯 [启动动画脚本] 脚本开始加载');
if (splashScriptIndex !== -1) {
    console.log('\n启动动画脚本位置:', splashScriptIndex);
    console.log('上下文:', sourceContent.substring(splashScriptIndex - 100, splashScriptIndex + 100));
}
