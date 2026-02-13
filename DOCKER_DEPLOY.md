# Docker 部署指南

本文档详细介绍如何使用 Docker 部署智南大模型系统。

---

## 📋 前置要求

### 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| Docker Engine | 20.10+ | 24.0+ |
| Docker Compose | v2.0+ | v2.20+ |
| CPU | 2 核 | 4 核+ |
| 内存 | 2 GB | 4 GB+ |
| 磁盘空间 | 10 GB | 20 GB+ |

### 安装 Docker

#### Ubuntu / Debian

```bash
# 更新软件包
sudo apt-get update

# 安装依赖
sudo apt-get install ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

#### CentOS / RHEL

```bash
# 安装依赖
sudo yum install -y yum-utils

# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

#### Windows Server 2019+

参考 [Windows Server 安装指南](./WINDOWS_SERVER_SETUP.md) 安装 Docker。

---

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/Cshvee/csh.git
cd csh
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
# DeepSeek API 密钥（必填）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 数据库密码（建议修改）
DB_PASSWORD=your_secure_password

# 其他配置保持默认
```

### 3. 启动服务

```bash
# 返回项目根目录
cd ..

# 构建并启动
docker compose up -d --build
```

### 4. 验证部署

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f
```

访问：
- 前端: http://localhost
- API 文档: http://localhost:8000/docs

---

## 📁 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                       │
│                                                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────┐ │
│  │   Nginx     │──────▶   FastAPI   │──────▶  MySQL  │ │
│  │  (frontend) │      │  (backend)  │      │ (mysql) │ │
│  │   :80       │      │   :8000     │      │  :3306  │ │
│  └─────────────┘      └─────────────┘      └─────────┘ │
│                               │                          │
│                               ▼                          │
│                        ┌─────────────┐                   │
│                        │   Volumes   │                   │
│                        │ - uploads   │                   │
│                        │ - mysql_data│                   │
│                        │ - graphs    │                   │
│                        └─────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 常用命令

### 启动与停止

```bash
# 启动（后台运行）
docker compose up -d

# 启动并重新构建
docker compose up -d --build

# 停止服务
docker compose down

# 停止并删除数据卷（谨慎使用）
docker compose down -v
```

### 查看状态

```bash
# 查看运行中的容器
docker compose ps

# 查看资源使用
docker stats

# 查看服务日志
docker compose logs
docker compose logs -f              # 实时跟踪
docker compose logs backend         # 只看后端日志
docker compose logs -f backend      # 实时跟踪后端
```

### 进入容器

```bash
# 进入后端容器
docker compose exec backend bash

# 进入数据库容器
docker compose exec mysql bash
mysql -u root -p
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose down
docker compose up -d --build

# 只更新单个服务
docker compose up -d --build backend
```

---

## ⚙️ 高级配置

### 修改端口

编辑 `docker-compose.yaml`：

```yaml
services:
  frontend:
    ports:
      - "8080:80"        # 改为 8080 端口
  
  backend:
    ports:
      - "8000:8000"      # 后端端口
```

### 数据持久化

数据默认存储在 Docker Volumes 中：

```bash
# 查看 volumes
docker volume ls

# 备份 MySQL 数据
docker compose exec mysql mysqldump -u root -p training_agent > backup.sql

# 恢复 MySQL 数据
docker compose exec -T mysql mysql -u root -p training_agent < backup.sql
```

### 环境变量覆盖

可以在 `docker-compose.yaml` 中覆盖环境变量：

```yaml
services:
  backend:
    environment:
      - DB_PASSWORD=${DB_PASSWORD:-default_password}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
      - KG_STORAGE=json
```

### 使用 Neo4j（可选）

如需使用 Neo4j 存储知识图谱：

```bash
# 使用 Neo4j 配置启动
docker compose -f docker-compose-neo4j.yaml up -d --build
```

---

## 🔒 安全配置

### 修改默认密码

**必须修改默认密码！**

1. 编辑 `backend/.env` 中的 `DB_PASSWORD`
2. 重新部署：
   ```bash
   docker compose down
   docker compose up -d --build
   ```

### 防火墙配置

```bash
# 开放必要端口（以 Ubuntu 为例）
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp

# 仅允许特定 IP 访问管理端口
sudo ufw allow from 192.168.1.0/24 to any port 8000
```

### HTTPS 配置（生产环境）

使用 Nginx 反向代理 + SSL 证书：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:80;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000/;
    }
}
```

---

## 🐛 故障排查

### 容器无法启动

```bash
# 查看错误日志
docker compose logs

# 检查端口占用
sudo netstat -tlnp | grep 80
sudo netstat -tlnp | grep 8000

# 释放被占用的端口
sudo kill -9 <PID>
```

### 数据库连接失败

```bash
# 检查 MySQL 容器状态
docker compose ps mysql

# 查看 MySQL 日志
docker compose logs mysql

# 进入 MySQL 容器检查
docker compose exec mysql bash
mysql -u root -p -e "SHOW DATABASES;"
```

### 前端无法访问后端

```bash
# 检查后端服务
docker compose exec backend curl http://localhost:8000/

# 检查网络连通性
docker network ls
docker network inspect <network_name>
```

### 清理重建

```bash
# 完全清理（会删除所有数据）
docker compose down -v
docker system prune -a

# 重新部署
docker compose up -d --build
```

---

## 📊 性能优化

### 资源限制

编辑 `docker-compose.yaml`：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
  
  mysql:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### 日志优化

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 📝 版本更新

### 查看当前版本

```bash
docker compose exec backend python -c "import main; print('Backend OK')"
docker compose exec frontend sh -c "cat /usr/share/nginx/html/version.txt"
```

### 更新到新版本

```bash
# 1. 备份数据
docker compose exec mysql mysqldump -u root -p training_agent > backup.sql

# 2. 拉取新代码
git pull

# 3. 停止服务
docker compose down

# 4. 重新构建
docker compose up -d --build

# 5. 验证
docker compose ps
```

---

## 🆘 获取帮助

遇到问题？

1. 查看日志：`docker compose logs -f`
2. 检查 [GitHub Issues](https://github.com/Cshvee/csh/issues)
3. 提交新 Issue，附上日志信息

---

<p align="center">
  部署愉快！🚀
</p>
