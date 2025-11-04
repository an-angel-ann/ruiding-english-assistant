const { authenticateToken } = require('./auth');

// 验证管理员权限
const requireAdmin = (req, res, next) => {
    // 先验证token，authenticateToken会设置req.user
    authenticateToken(req, res, (err) => {
        if (err) {
            return res.status(401).json({ error: '认证失败' });
        }
        
        // 检查用户角色
        if (!req.user || req.user.role !== 'admin') {
            console.log('用户角色检查失败:', req.user);
            return res.status(403).json({ 
                error: '权限不足',
                message: '需要管理员权限才能访问此资源' 
            });
        }
        
        console.log('管理员权限验证通过:', req.user.email);
        next();
    });
};

module.exports = { requireAdmin };
