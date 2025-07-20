#!/bin/bash

echo "建筑工程施工组织设计系统启动脚本"
echo "=================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请先安装npm"
    exit 1
fi

# 检查MongoDB是否运行
if ! pgrep -x "mongod" > /dev/null; then
    echo "警告: MongoDB可能未运行，请确保MongoDB服务已启动"
    echo "启动MongoDB命令示例: sudo systemctl start mongod"
fi

echo "正在安装后端依赖..."
npm install

echo "正在安装前端依赖..."
cd client && npm install
cd ..

echo "创建必要的目录..."
mkdir -p uploads
mkdir -p public

echo "启动系统..."
echo "后端服务将在端口5000运行"
echo "前端服务将在端口3000运行"
echo ""

# 使用 npm run install:all 和 npm run dev 或者分别启动
echo "请使用以下命令启动系统："
echo "1. 开发模式(推荐):"
echo "   npm run dev"
echo ""
echo "2. 分别启动:"
echo "   终端1: npm run server"
echo "   终端2: npm run client"
echo ""
echo "3. 生产模式:"
echo "   npm start"

echo ""
echo "系统配置:"
echo "- 确保 .env 文件中的配置正确"
echo "- MongoDB连接: mongodb://localhost:27017/construction_system"
echo "- 修改JWT_SECRET为您的密钥"
echo "- 根据需要配置其他环境变量"