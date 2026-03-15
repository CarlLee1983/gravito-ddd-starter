# 環境設置指南

完整的 gravito-ddd 環境配置步驟。根據你的開發場景選擇合適的設置。

## 📋 設置清單

| 場景 | 資料庫 | Redis | 事件系統 | 快取 | 時間 |
|------|--------|-------|---------|------|------|
| **本機開發** | SQLite | ✓ | Memory | Memory | 5 min |
| **本機 PostgreSQL** | PostgreSQL | ✓ | Memory | Memory | 10 min |
| **Docker 開發** | PostgreSQL | ✓ | Redis | Redis | 15 min |
| **生產環境** | PostgreSQL | ✓ | Redis | Redis | 20 min |

---

## 🚀 1. 本機開發（推薦）

最簡單的設置，使用 SQLite 和內存隊列。無需 Docker 或額外服務。

### 步驟

```bash
# 1. 複製環境設定
cp .env.example .env

# 預設配置已經設定好：
# - DB_CONNECTION=sqlite
# - EVENT_DRIVER=memory
# - CACHE_DRIVER=memory

# 2. 安裝依賴
bun install

# 3. 啟動伺服器
bun dev

# 4. 驗證
curl http://localhost:3000/health
```

### .env 檔案預設值

```env
# 應用程式
APP_ENV=development
PORT=3000
APP_DEBUG=true

# 資料庫（SQLite）
ENABLE_DB=true
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# Redis（本機）
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 快取
CACHE_DRIVER=memory

# 事件系統
EVENT_DRIVER=memory
```

### ✅ 驗證設置

```bash
# 檢查健康狀態
curl http://localhost:3000/health

# 運行測試
bun test

# 檢查 TypeScript
bun run typecheck
```

---

## 🐘 2. 本機 PostgreSQL 開發

使用本機 PostgreSQL 資料庫。適合測試資料庫相關功能。

### 前置要求

```bash
# macOS (使用 Homebrew)
brew install postgresql@15

# 啟動 PostgreSQL
brew services start postgresql@15

# Linux (Debian/Ubuntu)
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Windows
# 下載安裝程式: https://www.postgresql.org/download/windows/
```

### 步驟

```bash
# 1. 創建資料庫和使用者
psql -U postgres -c "CREATE DATABASE gravito_ddd;"
psql -U postgres -c "CREATE USER postgres WITH PASSWORD 'postgres';"
psql -U postgres -c "ALTER ROLE postgres WITH SUPERUSER;"

# 2. 複製環境設定
cp .env.example .env

# 3. 編輯 .env 檔案，啟用 PostgreSQL 部分
# 找到以下註解行，並取消註解：

DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=gravito_ddd
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_SSLMODE=prefer

# 註解掉 SQLite 部分：
# DB_CONNECTION=sqlite
# DB_DATABASE=database/database.sqlite

# 4. 安裝依賴
bun install

# 5. 執行資料庫遷移
bun run migrate

# 6. 啟動伺服器
bun dev
```

### .env 檔案配置

```env
# 資料庫（PostgreSQL）
ENABLE_DB=true
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=gravito_ddd
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_SSLMODE=prefer

# Redis（本機）
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 快取
CACHE_DRIVER=memory

# 事件系統
EVENT_DRIVER=memory
```

### ✅ 驗證設置

```bash
# 檢查資料庫連接
curl http://localhost:3000/api/health/check

# 查看遷移狀態
bun run migrate:status

# 運行測試
bun test
```

---

## 🐳 3. Docker Compose 開發環境

使用 Docker 啟動 PostgreSQL 和 Redis。適合團隊開發和接近生產環境的測試。

### 前置要求

```bash
# 安裝 Docker Desktop
# macOS & Windows: https://www.docker.com/products/docker-desktop
# Linux: https://docs.docker.com/engine/install/

# 驗證安裝
docker --version
docker-compose --version
```

### 步驟

```bash
# 1. 啟動 Docker 容器
docker-compose up -d

# 驗證容器運行
docker-compose ps
# 應該看到:
# - gravito-postgres (PostgreSQL)
# - gravito-redis (Redis)

# 2. 複製環境設定
cp .env.example .env

# 3. 編輯 .env 檔案，配置 Docker 主機名

DB_CONNECTION=postgres
DB_HOST=gravito-postgres      # 改為 Docker 容器名稱
DB_PORT=5432
DB_DATABASE=gravito_ddd
DB_USERNAME=postgres
DB_PASSWORD=postgres

REDIS_HOST=gravito-redis      # 改為 Docker 容器名稱
REDIS_PORT=6379

EVENT_DRIVER=redis            # 改為 Redis 驅動
CACHE_DRIVER=redis

# 4. 安裝依賴
bun install

# 5. 執行資料庫遷移
bun run migrate

# 6. 啟動伺服器
bun dev
```

### .env 檔案配置

```env
# 資料庫（PostgreSQL in Docker）
ENABLE_DB=true
DB_CONNECTION=postgres
DB_HOST=gravito-postgres      # ← Docker 容器名稱
DB_PORT=5432
DB_DATABASE=gravito_ddd
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_SSLMODE=prefer

# Redis (in Docker)
REDIS_HOST=gravito-redis      # ← Docker 容器名稱
REDIS_PORT=6379

# 快取
CACHE_DRIVER=redis

# 事件系統
EVENT_DRIVER=redis
```

### 常用 Docker 命令

```bash
# 啟動容器
docker-compose up -d

# 停止容器
docker-compose down

# 查看日誌
docker-compose logs -f gravito-postgres
docker-compose logs -f gravito-redis

# 進入 PostgreSQL 容器
docker-compose exec gravito-postgres psql -U postgres -d gravito_ddd

# 進入 Redis 容器
docker-compose exec gravito-redis redis-cli

# 移除容器及數據
docker-compose down -v
```

### ✅ 驗證設置

```bash
# 檢查服務連接
curl http://localhost:3000/api/health

# 查看 PostgreSQL 日誌
docker-compose logs gravito-postgres

# 檢查 Redis 連接
docker-compose exec gravito-redis redis-cli ping
# 應該回應: PONG

# 運行測試
bun test
```

---

## 🌐 4. 生產環境

完整的生產配置，使用 PostgreSQL 和 Redis，支持高可用性。

### 前置要求

- PostgreSQL 13+ (遠端主機或託管服務)
- Redis 6+ (遠端主機或託管服務)
- Bun 運行時

### 步驟

```bash
# 1. 複製環境設定
cp .env.example .env

# 2. 編輯 .env 檔案，配置生產環境

NODE_ENV=production
APP_ENV=production
APP_DEBUG=false

# 資料庫
DB_CONNECTION=postgres
DB_HOST=prod-postgres.internal    # 改為生產主機
DB_PORT=5432
DB_DATABASE=gravito_prod
DB_USERNAME=prod_user
DB_PASSWORD=<secure_password>     # 使用強密碼
DB_SSLMODE=require                # 生產環境使用 SSL

# Redis
REDIS_HOST=prod-redis.internal    # 改為生產主機
REDIS_PORT=6379
REDIS_PASSWORD=<secure_password>  # 如有需要

# 快取
CACHE_DRIVER=redis

# 事件系統
EVENT_DRIVER=redis

# JWT
JWT_SECRET=<generate_new>         # 生成新的密鑰

# 3. 安裝依賴（生產模式）
bun install --production

# 4. 執行資料庫遷移
bun run migrate

# 5. 建構應用
bun run build

# 6. 啟動伺服器
bun start
```

### .env 檔案配置

```env
# 應用程式
APP_ENV=production
NODE_ENV=production
PORT=3000
APP_DEBUG=false
APP_URL=https://api.example.com

# 資料庫
ENABLE_DB=true
DB_CONNECTION=postgres
DB_HOST=prod-postgres.internal
DB_PORT=5432
DB_DATABASE=gravito_prod
DB_USERNAME=prod_user
DB_PASSWORD=secure_password_here
DB_SSLMODE=require

# Redis
REDIS_HOST=prod-redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password

# 快取
CACHE_DRIVER=redis
REDIS_CACHE_CONNECTION=default

# 事件系統
EVENT_DRIVER=redis
REDIS_QUEUE_CONNECTION=default

# JWT
JWT_SECRET=<32_characters_random_key>
JWT_EXPIRATION=24h

# 儲存
DRIVE_DISK=s3              # 或 local
S3_KEY=<your_key>
S3_SECRET=<your_secret>
S3_BUCKET=<your_bucket>
S3_REGION=us-east-1
```

### 高可用配置（可選）

如果需要 RabbitMQ 支持複雜的事件路由：

```env
# 事件系統（RabbitMQ）
EVENT_DRIVER=rabbitmq
RABBITMQ_URL=amqp://user:pass@rabbitmq-cluster:5672/
RABBITMQ_RECONNECT_ATTEMPTS=20
RABBITMQ_PREFETCH=10

# 快取保持 Redis
CACHE_DRIVER=redis
```

### ✅ 驗證設置

```bash
# 建構後驗證
bun run build

# 檢查依賴大小
du -sh node_modules/

# 檢查環境變數
bun run env:check

# 運行測試
bun test

# 測試啟動
bun start
```

### 安全檢查清單

- [ ] 所有密碼都設定為強密碼（至少 32 字元）
- [ ] 資料庫啟用 SSL 連接（DB_SSLMODE=require）
- [ ] Redis 設定密碼
- [ ] JWT_SECRET 使用隨機值
- [ ] .env 檔案未提交到版本控制
- [ ] 啟用備份策略
- [ ] 監控日誌和錯誤

---

## 🔄 遷移資料庫

### 從 SQLite 遷移到 PostgreSQL

```bash
# 1. 備份 SQLite 資料庫
cp database/database.sqlite database/database.sqlite.backup

# 2. 設置 PostgreSQL（見上面的步驟）

# 3. 編輯 .env，改為 PostgreSQL 連接

# 4. 執行遷移
bun run migrate

# 5. 測試連接
curl http://localhost:3000/api/health

# 6. 如果需要恢復
# 改回 .env: DB_CONNECTION=sqlite
# 恢復備份檔案
cp database/database.sqlite.backup database/database.sqlite
```

---

## 🚨 常見問題

### PostgreSQL 連接失敗

```bash
# 檢查 PostgreSQL 是否運行
# macOS
brew services list | grep postgres

# Linux
sudo systemctl status postgresql

# 檢查連接設定
psql -h localhost -U postgres -d gravito_ddd
```

### Redis 連接失敗

```bash
# 檢查 Redis 是否運行
redis-cli ping

# 如果未裝 Redis，安裝
brew install redis
brew services start redis
```

### Docker 容器無法通訊

```bash
# 檢查容器網絡
docker-compose ps

# 檢查容器日誌
docker-compose logs -f

# 重啟容器
docker-compose restart

# 完全重新建立
docker-compose down -v
docker-compose up -d
```

### 遷移失敗

```bash
# 檢查遷移狀態
bun run migrate:status

# 回滾最後一個遷移
bun run migrate:rollback

# 查看遷移日誌
cat storage/logs/migrations.log
```

---

## 📚 下一步

完成環境設置後：

1. **快速參考** → [快速參考](./QUICK_REFERENCE.md)
2. **建立第一個模組** → [模組開發指南](../04-Module-Development/MODULE_GUIDE.md)
3. **了解架構** → [整體架構](../02-Architecture/ARCHITECTURE.md)

---

**最後更新**: 2026-03-15
**版本**: gravito-ddd v2.0+
**Bun 最低版本**: v1.3.10
