#!/bin/bash

# 建筑工程施工组织设计系统启动脚本

echo "🏗️  启动建筑工程施工组织设计系统..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cat > .env << EOF
# 数据库配置
DATABASE_URL=postgresql://admin:password123@postgres:5432/construction_design

# Redis配置
REDIS_URL=redis://redis:6379

# MinIO配置
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_BUCKET_NAME=construction-docs

# OpenAI配置（请替换为您的API密钥）
OPENAI_API_KEY=your-openai-api-key-here

# JWT密钥
SECRET_KEY=your-secret-key-here

# 应用配置
DEBUG=false
EOF
    echo "⚠️  请编辑.env文件，设置您的OpenAI API密钥"
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p uploads
mkdir -p logs

# 启动服务
echo "🚀 启动Docker服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 初始化数据库
echo "🗄️  初始化数据库..."
docker-compose exec backend python -c "
from app.core.database import engine, Base
Base.metadata.create_all(bind=engine)
print('数据库初始化完成')
"

# 创建MinIO存储桶
echo "📦 创建MinIO存储桶..."
docker-compose exec minio mc mb minio/construction-docs --ignore-existing

echo "✅ 系统启动完成！"
echo ""
echo "🌐 访问地址："
echo "   前端应用: http://localhost"
echo "   后端API: http://localhost/api"
echo "   AI服务: http://localhost/ai"
echo "   MinIO控制台: http://localhost:9001"
echo ""
echo "📋 默认账户："
echo "   用户名: admin"
echo "   密码: password123"
echo ""
echo "📖 查看日志："
echo "   docker-compose logs -f"
echo ""
echo "🛑 停止服务："
echo "   docker-compose down"