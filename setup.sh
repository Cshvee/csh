#!/bin/bash
# 智南大模型 - 一键部署脚本

set -e

echo "========================================"
echo "  智南大模型 - 一键部署脚本"
echo "========================================"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 配置环境变量
echo ""
echo "🔧 配置环境变量..."

if [ ! -f "backend/.env" ]; then
    read -sp "请输入 MySQL 密码（直接回车使用默认）: " DB_PASSWORD
    echo ""
    DB_PASSWORD=${DB_PASSWORD:-training_agent_password}
    
    read -p "请输入 DeepSeek API 密钥（没有可直接回车）: " DEEPSEEK_API_KEY
    
    cat > backend/.env << EOF
DB_PASSWORD=$DB_PASSWORD
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
EOF
    chmod 600 backend/.env
    echo "✅ 配置已保存到 backend/.env"
else
    echo "✅ 检测到已有配置文件，跳过配置"
    source backend/.env
    DB_PASSWORD=${DB_PASSWORD:-training_agent_password}
fi

# 导出环境变量供compose使用
export DB_PASSWORD
export DEEPSEEK_API_KEY

# 启动服务
echo ""
echo "🚀 启动服务..."
docker compose up -d --build

# 等待服务就绪
echo ""
echo "⏳ 等待服务启动（约30秒）..."
sleep 10

# 检查状态
echo ""
echo "📊 服务状态:"
docker compose ps

# 测试连接
echo ""
echo "🔗 测试服务..."
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ 后端服务正常"
else
    echo "⚠️  后端服务可能还在启动中"
fi

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "========================================"
echo ""
echo "访问地址:"
echo "  🌐 前端: http://localhost/"
echo "  📚 API: http://localhost:8000/docs"
echo ""
echo "常用命令:"
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
echo "  重启服务: docker compose restart"
echo ""
