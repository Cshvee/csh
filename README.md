# 智南大模型 - 高校人才培养方案智能分析系统

<p align="center">
  <img src="frontend/zhinan_logo_v1.png" alt="智南大模型" width="200"/>
</p>

<p align="center">
  基于大语言模型的高校人才培养方案智能分析与知识图谱构建系统
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#文档">文档</a>
</p>

---

## 🎯 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| 📄 **培养方案管理** | 支持 PDF/DOCX 文件上传、解析与管理 |
| 🕸️ **知识图谱构建** | 基于 DeepSeek AI 自动生成专业知识点图谱 |
| 🔍 **智能分析** | AI 驱动的培养方案质量评估与改进建议 |
| 📊 **可视化展示** | 2D 力导向图展示知识图谱关系 |
| 📈 **改进报告** | 自动生成 Word 格式改进报告 |
| 🏫 **学校层级** | 支持高校-学院-专业三级层级管理 |

### 特色亮点

- **AI 驱动**：基于 DeepSeek 大模型进行智能分析
- **轻量部署**：无需复杂配置，开箱即用
- **数据可视化**：交互式知识图谱展示
- **报告导出**：一键生成专业改进报告

---

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI (Python 3.12+)
- **数据库**: MySQL 8.0
- **ORM**: SQLAlchemy 2.x
- **AI**: DeepSeek API / OpenAI 兼容接口
- **文档解析**: PyPDF2, python-docx

### 前端
- **框架**: React 19 + Vite
- **样式**: Tailwind CSS
- **可视化**: react-force-graph-2d
- **图标**: Lucide React

### 部署
- **容器化**: Docker + Docker Compose
- **Web 服务器**: Nginx

---

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Cshvee/csh.git
cd csh

# 2. 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env 文件，设置 DeepSeek API 密钥和数据库密码

cd ..

# 3. 启动服务
docker compose up -d --build

# 4. 访问系统
# 前端: http://localhost
# API 文档: http://localhost:8000/docs
```

### 方式二：本地开发

#### 环境要求

- Python 3.12+
- Node.js 18+
- MySQL 8.0+

#### 后端启动

```bash
cd backend

# 创建虚拟环境
conda create -n training python=3.12 -y
conda activate training

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动服务
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

---

## 📁 项目结构

```
.
├── backend/                  # 后端服务
│   ├── app/                  # 应用代码
│   │   ├── api/              # API 路由
│   │   ├── core/             # 核心配置
│   │   ├── models/           # 数据模型
│   │   ├── services/         # 业务逻辑
│   │   └── utils/            # 工具函数
│   ├── uploads/              # 上传文件存储
│   ├── data/                 # 数据文件
│   ├── events_kg/            # 知识图谱数据
│   ├── main.py               # 入口文件
│   ├── requirements.txt      # Python 依赖
│   └── .env                  # 环境变量
├── frontend/                 # 前端应用
│   ├── src/                  # 源代码
│   │   ├── components/       # 组件
│   │   ├── services/         # API 服务
│   │   └── App.jsx           # 主应用
│   ├── public/               # 静态资源
│   ├── package.json          # Node 依赖
│   └── vite.config.js        # Vite 配置
├── docker-compose.yaml       # Docker 配置
├── docker-compose-neo4j.yaml # Neo4j 扩展配置
├── README.md                 # 项目文档
├── DOCKER_DEPLOY.md          # Docker 部署指南
└── WINDOWS_SERVER_SETUP.md   # Windows Server 安装指南
```

---

## 🔧 环境变量配置

创建 `backend/.env` 文件：

```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=training_agent
DB_USER=root
DB_PASSWORD=your_password

# 文件上传配置
UPLOAD_DIR=uploads/training-plans
MAX_FILE_SIZE=52428800

# 知识图谱存储（json 或 neo4j）
KG_STORAGE=json
NEO4J_ENABLED=false
```

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md) | Docker 部署详细指南 |
| [WINDOWS_SERVER_SETUP.md](./WINDOWS_SERVER_SETUP.md) | Windows Server 环境搭建 |

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

MIT License

---

<p align="center">
  Made with ❤️ for Education
</p>
