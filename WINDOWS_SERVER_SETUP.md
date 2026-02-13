# Windows Server 2019 开发环境搭建指南

本文档介绍如何在 Windows Server 2019 上搭建"智南大模型"项目的完整开发环境。

---

## 📋 环境要求

| 软件 | 用途 | 推荐版本 |
|------|------|---------|
| Node.js | 前端运行环境 | 18.x / 20.x |
| Python | 后端运行环境 | 3.12.x |
| MySQL | 数据库存储 | 8.0.x |
| Git | 代码版本控制 | 最新版 |
| VS Code (可选) | 代码编辑器 | 最新版 |

---

## 1️⃣ 安装 Python 3.12

### 方法一：使用 Winget（推荐）

```powershell
winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
```

### 方法二：手动安装

```powershell
# 下载 Python 3.12 安装包
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe" -OutFile "$env:TEMP\python-installer.exe"

# 运行安装程序（添加 PATH，安装 pip）
Start-Process -FilePath "$env:TEMP\python-installer.exe" -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_pip=1" -Wait

# 重启 PowerShell 后验证
python --version
pip --version
```

---

## 2️⃣ 安装 MySQL 8.0

### 方法一：使用 Winget（推荐）

```powershell
winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements
```

### 方法二：手动安装

1. 下载 MySQL Installer：https://dev.mysql.com/downloads/installer/
2. 运行安装程序，选择 **Server only** 安装
3. 设置 root 密码（请牢记，后续配置需要用到）

### 验证安装

```powershell
# 检查 MySQL 服务状态
Get-Service MySQL*

# 登录 MySQL（输入你设置的密码）
mysql -u root -p
```

---

## 3️⃣ 安装 Git

### 方法一：使用 Winget（推荐）

```powershell
winget install Git.Git --accept-package-agreements --accept-source-agreements
```

### 方法二：手动安装

```powershell
# 下载 Git for Windows
Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe" -OutFile "$env:TEMP\git-installer.exe"

# 静默安装
Start-Process -FilePath "$env:TEMP\git-installer.exe" -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-", "/CLOSEAPPLICATIONS", "/RESTARTAPPLICATIONS" -Wait

# 验证
git --version
```

---

## 4️⃣ 安装 VS Code（可选）

```powershell
winget install Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements
```

---

## 5️⃣ 拉取项目代码

```powershell
# 进入你想存放项目的目录（例如 C 盘根目录）
cd C:\

# 克隆项目（替换为你的仓库地址）
git clone <你的项目仓库地址>
cd intelligent-agent-developer-develop
```

---

## 6️⃣ 配置后端环境

### 6.1 创建环境配置文件

```powershell
cd C:\intelligent-agent-developer-develop\backend
Copy-Item .env.example .env
notepad .env
```

### 6.2 编辑 .env 文件内容

```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=training_agent
DB_USER=root
DB_PASSWORD=你设置的MySQL密码

# 文件上传配置
UPLOAD_DIR=uploads/training-plans
MAX_FILE_SIZE=52428800

# Neo4j 图数据库配置（可选，默认关闭）
NEO4J_ENABLED=false
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=training_agent

# 知识图谱存储后端: "json" 或 "neo4j"
KG_STORAGE=json
```

### 6.3 安装 Python 依赖

```powershell
pip install -r requirements.txt
```

---

## 7️⃣ 创建 MySQL 数据库

```powershell
# 登录 MySQL（输入你设置的 root 密码）
mysql -u root -p
```

在 MySQL 命令行中执行：

```sql
CREATE DATABASE training_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

## 8️⃣ 配置前端环境

```powershell
cd C:\intelligent-agent-developer-develop\frontend
npm install
```

---

## 9️⃣ 防火墙配置

在 Windows Server 上放行必要的端口：

```powershell
# 放行 8000 端口（后端 API）
New-NetFirewallRule -DisplayName "Backend API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow

# 放行 5173 端口（前端开发服务器）
New-NetFirewallRule -DisplayName "Frontend Dev" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow

# 放行 3306 端口（MySQL，如需远程连接）
New-NetFirewallRule -DisplayName "MySQL" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow
```

---

## 🔟 启动项目

### 启动后端服务

打开 PowerShell 窗口 1：

```powershell
cd C:\intelligent-agent-developer-develop\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

访问验证：http://localhost:8000/docs

### 启动前端服务

打开 PowerShell 窗口 2：

```powershell
cd C:\intelligent-agent-developer-develop\frontend
npm run dev
```

访问验证：http://localhost:5173

---

## 🔧 常见问题

### 1. PowerShell 执行策略限制

如果遇到执行脚本被禁止的提示：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. MySQL 服务未启动

```powershell
# 启动 MySQL 服务
Start-Service MySQL80

# 设置开机自启
Set-Service -Name MySQL80 -StartupType Automatic
```

### 3. 端口被占用

```powershell
# 查看端口占用情况
netstat -ano | findstr 8000
netstat -ano | findstr 5173

# 结束占用端口的进程（替换 PID）
taskkill /PID <进程ID> /F
```

### 4. 中文乱码

PowerShell 设置 UTF-8 编码：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 📎 附录：一键安装脚本

将以下内容保存为 `setup-env.ps1`，右键"使用 PowerShell 运行"：

```powershell
# 需要以管理员身份运行
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "请以管理员身份运行此脚本！"
    exit 1
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  智南大模型 - Windows Server 环境搭建" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 检查并安装 winget
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 Winget..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://aka.ms/getwinget" -OutFile "$env:TEMP\winget.msixbundle"
    Add-AppxPackage -Path "$env:TEMP\winget.msixbundle"
}

# 安装软件
Write-Host "`n正在安装 Python 3.12..." -ForegroundColor Cyan
winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements

Write-Host "`n正在安装 MySQL..." -ForegroundColor Cyan
winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements

Write-Host "`n正在安装 Git..." -ForegroundColor Cyan
winget install Git.Git --accept-package-agreements --accept-source-agreements

Write-Host "`n正在安装 VS Code..." -ForegroundColor Cyan
winget install Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  基础软件安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n请重启服务器后，继续执行以下步骤：" -ForegroundColor Yellow
Write-Host "  1. 克隆项目代码" -ForegroundColor White
Write-Host "  2. 配置 .env 文件" -ForegroundColor White
Write-Host "  3. 安装项目依赖" -ForegroundColor White
Write-Host "  4. 启动项目" -ForegroundColor White

Pause
```

---

## 📞 相关链接

- 项目首页：http://localhost:5173
- API 文档：http://localhost:8000/docs
- MySQL 数据目录：`C:\ProgramData\MySQL\MySQL Server 8.0\Data\`

---

**文档版本**: v1.0  
**更新日期**: 2024年
