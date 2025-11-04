const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function createRoundedIcon() {
    console.log('🎨 开始创建圆角图标...');
    
    const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
    
    for (const size of sizes) {
        try {
            // 加载原始图标
            const image = await loadImage('assets/icon.png');
            
            // 创建画布
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext('2d');
            
            // 计算圆角半径 (22%的边长)
            const radius = Math.floor(size * 0.22);
            
            // 绘制圆角矩形路径
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(size - radius, 0);
            ctx.quadraticCurveTo(size, 0, size, radius);
            ctx.lineTo(size, size - radius);
            ctx.quadraticCurveTo(size, size, size - radius, size);
            ctx.lineTo(radius, size);
            ctx.quadraticCurveTo(0, size, 0, size - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            
            // 裁剪为圆角矩形
            ctx.clip();
            
            // 绘制图像
            ctx.drawImage(image, 0, 0, size, size);
            
            // 保存
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(`assets/icon_rounded_${size}.png`, buffer);
            console.log(`✅ 创建 ${size}x${size} 圆角图标`);
            
        } catch (error) {
            console.error(`❌ 创建 ${size}x${size} 失败:`, error.message);
        }
    }
    
    // 复制256为主图标
    fs.copyFileSync('assets/icon_rounded_256.png', 'assets/icon_rounded.png');
    console.log('✅ 主圆角图标已创建: assets/icon_rounded.png');
}

createRoundedIcon().catch(console.error);
