#!/bin/bash

# 睿叮AI英语学习助手 - API测试脚本

BASE_URL="http://localhost:3001"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🎓 睿叮AI英语学习助手 - API测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 健康检查
echo -e "${YELLOW}📌 测试1: 健康检查${NC}"
curl -s $BASE_URL/health | jq '.'
echo ""
echo ""

# 2. 注册新用户
echo -e "${YELLOW}📌 测试2: 用户注册（自动获得7天试用）${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@ruiding.com",
    "password": "demo123",
    "username": "演示用户"
  }')

echo $REGISTER_RESPONSE | jq '.'
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo -e "${GREEN}✅ Token已保存${NC}"
echo ""
echo ""

# 3. 检查订阅状态
echo -e "${YELLOW}📌 测试3: 检查订阅状态（应该有7天试用）${NC}"
curl -s -X GET $BASE_URL/api/subscription/status \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# 4. 获取用户信息
echo -e "${YELLOW}📌 测试4: 获取用户信息${NC}"
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# 5. 创建订阅订单
echo -e "${YELLOW}📌 测试5: 创建月度订阅订单${NC}"
curl -s -X POST $BASE_URL/api/subscription/create-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "monthly"}' | jq '.'
echo ""
echo ""

# 6. 测试登录
echo -e "${YELLOW}📌 测试6: 用户登录${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@ruiding.com",
    "password": "demo123"
  }')

echo $LOGIN_RESPONSE | jq '.'
echo ""
echo ""

# 7. 订阅历史
echo -e "${YELLOW}📌 测试7: 查看订阅历史${NC}"
curl -s -X GET $BASE_URL/api/subscription/history \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 所有测试完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "💡 ${BLUE}提示：您可以在浏览器中打开 auth.html 进行可视化测试${NC}"
echo ""
