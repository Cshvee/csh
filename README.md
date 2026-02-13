# 智南大模型 - 高校人才培养方案智能分析系统

基于大语言模型的高校人才培养方案智能分析与知识图谱构建系统。

## 🚀 一键部署

```bash
# 1. 克隆项目
git clone <项目地址>
cd intelligent-agent-developer-develop

# 2. 运行部署脚本
chmod +x setup.sh
./setup.sh

# 3. 访问系统
# 前端: http://localhost/
# API文档: http://localhost:8000/docs
```

## 📋 手动部署

```bash
# 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env 设置密码

cd ..
docker compose up -d --build
```

## 🛠️ 系统要求

- Docker Engine 20.10+
- Docker Compose v2+
- 内存: 2GB+

## 📁 项目结构

```
backend/          FastAPI + MySQL + JSON存储
frontend/         React + Vite
docker-compose.yaml
docker-compose-neo4j.yaml  # 可选：完整版（含Neo4j）
```

## 🎯 核心功能

- 📄 培养方案管理（PDF/DOCX解析）
- 🕸️ 知识图谱构建（AI自动生成）
- 📊 可视化分析（2D力导向图）
- 📈 改进报告生成（Word导出）

## 🔧 常用命令

```bash
docker compose ps              # 查看状态
docker compose logs -f         # 查看日志
docker compose down            # 停止服务
docker compose up -d --build   # 重新构建
```

## 📚 详细文档

- [Docker部署详解](./DOCKER_DEPLOY.md)
- [本地开发指南](./LOCAL_DEV.md)
- [Neo4j配置](./NEO4J_SETUP.md)
