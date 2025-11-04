# 睿叮AI英语学习助手 - 订阅付费后端系统

## 📋 功能特性

- ✅ 用户注册/登录（JWT认证）
- ✅ 7天免费试用（自动激活）
- ✅ 月度/年度订阅管理
- ✅ 支付集成（准备接入支付宝/微信）
- ✅ 订阅状态检查
- ✅ 使用记录统计
- ✅ 安全防护（Helmet、限流）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

必须修改的配置项：
```env
DB_PASSWORD=your_mysql_password
JWT_SECRET=your-random-secret-key
```

### 3. 初始化数据库

```bash
npm run init-db
```

这将自动创建：
- 数据库（如果不存在）
- users 表（用户表）
- subscriptions 表（订阅表）
- payments 表（支付记录表）
- usage_logs 表（使用记录表）

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3001` 启动

## 📡 API接口文档

### 认证接口

#### 1. 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "用户名"
}
```

响应：
```json
{
  "success": true,
  "message": "注册成功！您获得了7天免费试用",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "用户名"
  },
  "trial": {
    "days": 7,
    "endDate": "2025-10-27T14:20:00.000Z"
  }
}
```

#### 2. 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "用户名"
  },
  "subscription": {
    "planType": "trial",
    "endDate": "2025-10-27T14:20:00.000Z",
    "status": "active"
  }
}
```

#### 3. 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### 订阅接口

#### 1. 获取订阅状态
```http
GET /api/subscription/status
Authorization: Bearer {token}
```

响应：
```json
{
  "hasSubscription": true,
  "subscription": {
    "planType": "monthly",
    "startDate": "2025-10-20T14:20:00.000Z",
    "endDate": "2025-11-20T14:20:00.000Z",
    "status": "active",
    "autoRenew": true,
    "daysRemaining": 31
  }
}
```

#### 2. 创建订阅订单
```http
POST /api/subscription/create-order
Authorization: Bearer {token}
Content-Type: application/json

{
  "planType": "monthly"  // 或 "yearly"
}
```

响应：
```json
{
  "success": true,
  "order": {
    "orderId": "ORDER_1729425600000_1",
    "planType": "monthly",
    "price": 29,
    "userId": 1
  },
  "message": "订单创建成功，请继续支付"
}
```

#### 3. 取消订阅
```http
POST /api/subscription/cancel
Authorization: Bearer {token}
```

## 🗄️ 数据库结构

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| email | VARCHAR(255) | 邮箱（唯一） |
| password_hash | VARCHAR(255) | 密码哈希 |
| username | VARCHAR(100) | 用户名 |
| created_at | TIMESTAMP | 创建时间 |
| last_login | TIMESTAMP | 最后登录 |
| status | ENUM | 状态（active/suspended/deleted） |
| trial_used | BOOLEAN | 是否已使用试用 |

### subscriptions 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| user_id | INT | 用户ID |
| plan_type | ENUM | 套餐类型（trial/monthly/yearly） |
| status | ENUM | 状态（active/expired/cancelled） |
| start_date | TIMESTAMP | 开始日期 |
| end_date | TIMESTAMP | 结束日期 |
| auto_renew | BOOLEAN | 自动续费 |

## 🔐 安全特性

1. **密码安全**：使用bcrypt进行密码哈希（10轮加密）
2. **JWT认证**：Token有效期7天，自动刷新
3. **限流保护**：15分钟内最多100个请求
4. **Helmet防护**：防止常见Web漏洞
5. **CORS配置**：仅允许指定前端域名访问
6. **SQL注入防护**：使用参数化查询

## 📦 依赖包说明

| 包名 | 版本 | 用途 |
|------|------|------|
| express | ^4.18.2 | Web框架 |
| mysql2 | ^3.6.5 | MySQL客户端 |
| bcryptjs | ^2.4.3 | 密码加密 |
| jsonwebtoken | ^9.0.2 | JWT认证 |
| dotenv | ^16.3.1 | 环境变量管理 |
| cors | ^2.8.5 | 跨域支持 |
| helmet | ^7.1.0 | 安全防护 |
| express-rate-limit | ^7.1.5 | 限流 |

## 🚧 待实现功能

- [ ] 支付宝支付集成
- [ ] 微信支付集成
- [ ] 邮件服务（注册验证、到期提醒）
- [ ] 订阅自动续费
- [ ] 管理后台
- [ ] 数据统计和分析

## 📞 联系方式

如有问题请联系开发团队。
