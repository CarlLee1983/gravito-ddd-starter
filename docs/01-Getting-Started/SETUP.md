> **Tier: 1 - 必需** | 預計 10 分鐘 | 新手入門 | ⭐⭐⭐

# 開發環境設置指南 (Setup Guide)

完整的開發環境配置步驟，支援 macOS、Linux 和 Windows。

## 前置需求

### 必需

- **Bun >= 1.0.0** - JavaScript 執行時和包管理器
  ```bash
  # 安裝 Bun
  curl -fsSL https://bun.sh/install | bash

  # 驗證安裝
  bun --version
  ```

- **Node.js >= 18.0.0** (可選，某些工具需要)
  ```bash
  bun install --global node  # 或使用 nvm
  ```

- **Git** - 版本控制
  ```bash
  git --version
  ```

### 推薦

- **Visual Studio Code** - 代碼編輯器
  - Extensions: TypeScript, Bun for VSCode

- **Postman** 或 **Insomnia** - API 測試工具

- **DBeaver** - 數據庫可視化管理

---

## 第 1 步: 克隆和安裝

### 1.1 克隆專案

```bash
# 使用 HTTPS
git clone https://github.com/gravito-framework/gravito-ddd-starter my-app
cd my-app

# 或使用 SSH (需要配置 SSH key)
git clone git@github.com:gravito-framework/gravito-ddd-starter.git my-app
cd my-app
```

### 1.2 安裝依賴

```bash
# 安裝所有依賴
bun install

# 驗證安裝成功
bun --version
bun pm ls  # 列出已安裝的包
```

**常見問題**:
- 如果 `bun install` 失敗，嘗試清除快取：
  ```bash
  rm -rf node_modules bun.lockb
  bun install
  ```

---

## 第 2 步: 環境配置

### 2.1 創建 .env 檔案

```bash
# 從範本複製
cp .env.example .env

# 編輯檔案
nano .env  # 或使用你的編輯器
```

### 2.2 開發環境配置 (建議)

編輯 `.env`，使用以下開發友好的設置：

```env
# 應用
APP_NAME=gravito-ddd-starter
APP_ENV=development
APP_DEBUG=true
PORT=3000
APP_URL=http://localhost:3000

# 數據庫 (SQLite 最簡單)
ENABLE_DB=true
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# 快取 (內存最快)
CACHE_DRIVER=memory

# Redis (開發時可選，使用內存快取)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# 郵件驗證
REQUIRE_EMAIL_VERIFICATION=false
```

### 2.3 生產環境配置

對於生產部署，使用真實的數據庫和服務：

```env
# 應用
APP_NAME=my-production-app
APP_ENV=production
APP_DEBUG=false
PORT=8080
APP_URL=https://api.example.com

# 數據庫 (使用 PostgreSQL)
ENABLE_DB=true
DB_CONNECTION=postgres
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_DATABASE=gravito_prod
DB_USERNAME=app_user
DB_PASSWORD=<secure_password>

# 快取 (使用 Redis)
CACHE_DRIVER=redis
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>
REDIS_TLS=true

# 郵件驗證 (如果需要)
REQUIRE_EMAIL_VERIFICATION=true
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@example.com
```

---

## 第 3 步: 本地數據庫設置

### 選項 A: SQLite (推薦用於開發)

SQLite 是最簡單的選擇，適合本地開發。

```bash
# 自動建立 (應用啟動時)
bun run dev

# 數據庫檔案位置
ls -la database/database.sqlite
```

**優點**:
- 零配置，無需額外服務
- 文件形式，易於備份
- 足夠快速的開發環境

**缺點**:
- 不適合多進程併發

### 選項 B: PostgreSQL (推薦用於生產)

如果想要更接近生產的環境，使用 PostgreSQL。

#### macOS (使用 Homebrew)

```bash
# 安裝 PostgreSQL
brew install postgresql@15

# 啟動服務
brew services start postgresql@15

# 驗證安裝
psql --version
```

#### Ubuntu/Debian

```bash
# 安裝 PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# 啟動服務
sudo systemctl start postgresql

# 驗證安裝
psql --version
```

#### Docker (所有平台)

```bash
# 拉取 PostgreSQL 鏡像
docker pull postgres:15

# 運行容器
docker run --name gravito-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=gravito \
  -p 5432:5432 \
  -d postgres:15

# 驗證運行
docker ps | grep postgres
```

#### 建立數據庫和用戶

```bash
# 連接到 PostgreSQL
psql -U postgres -h 127.0.0.1

# 在 PostgreSQL 終端中執行
CREATE DATABASE gravito;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE gravito TO app_user;
\q  # 退出
```

#### 更新 .env

```env
DB_CONNECTION=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gravito
DB_USERNAME=app_user
DB_PASSWORD=secure_password
```

#### 測試連接

```bash
psql -U app_user -h 127.0.0.1 -d gravito -c "SELECT 1"
# 應該返回: 1
```

### 選項 C: MySQL

類似 PostgreSQL，但使用 MySQL。

#### Docker

```bash
docker run --name gravito-mysql \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=gravito \
  -p 3306:3306 \
  -d mysql:8.0

# 建立用戶
docker exec -it gravito-mysql mysql -u root -p
# 輸入密碼: root_password

# 在 MySQL 終端
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON gravito.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

#### 更新 .env

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gravito
DB_USERNAME=app_user
DB_PASSWORD=secure_password
```

---

## 第 4 步: Redis 設置 (可選)

只有在使用 `CACHE_DRIVER=redis` 時才需要。

### Docker (推薦)

```bash
# 拉取 Redis 鏡像
docker pull redis:7

# 運行容器
docker run --name gravito-redis \
  -p 6379:6379 \
  -d redis:7

# 驗證運行
docker ps | grep redis

# 測試連接
redis-cli ping
# 應該返回: PONG
```

### macOS (Homebrew)

```bash
# 安裝 Redis
brew install redis

# 啟動服務
brew services start redis

# 測試連接
redis-cli ping
```

### Ubuntu/Debian

```bash
# 安裝 Redis
sudo apt update
sudo apt install redis-server

# 啟動服務
sudo systemctl start redis-server

# 測試連接
redis-cli ping
```

### 更新 .env

```env
CACHE_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=  # 如果沒有密碼留空
```

---

## 第 5 步: 驗證設置

### 5.1 檢查所有依賴

```bash
# 驗證 Bun
bun --version

# 驗證數據庫連接
# SQLite
ls -la database/database.sqlite

# PostgreSQL
psql -U app_user -h 127.0.0.1 -d gravito -c "SELECT 1"

# 驗證 Redis (如果使用)
redis-cli ping
```

### 5.2 啟動應用

```bash
# 開發模式 (熱重載)
bun run dev

# 應該看到:
# ✨ Server started successfully!
# 📍 Base URL:       http://localhost:3000
# ✅ Routes registered
```

### 5.3 測試 API

```bash
# 健康檢查
curl http://localhost:3000/health

# 應該返回:
# {"success":true,"status":"healthy","timestamp":"2024-03-10T..."}
```

---

## 第 6 步: IDE 和工具設置

### VS Code 推薦設置

#### 安裝擴展

```bash
code --install-extension biomejs.biome
code --install-extension oven.bun-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

#### .vscode/settings.json

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "search.exclude": {
    "node_modules": true,
    "bun.lockb": true,
    "dist": true
  },
  "files.watcherExclude": {
    "node_modules": true,
    ".git": true
  }
}
```

### 命令行工具

```bash
# Git 配置
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 啟用 Git hooks (可選)
# 參考: docs/GIT_HOOKS.md
```

---

## 第 7 步: 日常開發工作流程

### 啟動應用

```bash
# 開發模式 (推薦)
bun run dev

# 生產模式
bun run build
bun run start
```

### 運行測試

```bash
# 運行所有測試
bun test

# 運行特定測試
bun test tests/Unit/

# 監視模式 (檔案更改時自動運行)
bun test --watch
```

### 代碼格式化和 Linting

```bash
# 檢查代碼風格
bun run lint

# 自動修復
bun run format
```

### 創建新模組

```bash
# 安裝 CLI
bun add -D @gravito/pulse

# 生成新模組
bun gravito module generate Product --ddd-type simple
```

---

## 故障排查

### 問題: Port 3000 已被佔用

```bash
# 檢查佔用進程
lsof -i :3000

# 殺死進程
kill -9 <PID>

# 或使用不同的 PORT
PORT=3001 bun run dev
```

### 問題: 數據庫連接失敗

```bash
# 檢查 .env 配置
cat .env | grep DB_

# 測試連接 (PostgreSQL)
psql -U app_user -h 127.0.0.1 -d gravito

# 檢查數據庫是否運行
docker ps  # 檢查容器

# 檢查日誌
bun run dev 2>&1 | grep -i database
```

### 問題: 模組找不到

```bash
# 確認依賴已安裝
bun install

# 清除快取
rm -rf node_modules bun.lockb
bun install

# 驗證 tsconfig.json paths
cat tsconfig.json | grep -A5 paths
```

### 更多問題

參見 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Docker Compose (完整環境)

如果想要一鍵啟動所有服務，使用 Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_CONNECTION=postgres
      - DB_HOST=postgres
      - DB_DATABASE=gravito
      - CACHE_DRIVER=redis
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=gravito
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

運行:
```bash
docker-compose up
```

---

## 下一步

1. 閱讀 [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解系統架構
2. 閱讀 [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 學習創建模組
3. 檢查 [API_GUIDELINES.md](./API_GUIDELINES.md) - API 設計規範
4. 開始開發你的模組！

---

**祝你開發愉快！如有問題，參考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。**
