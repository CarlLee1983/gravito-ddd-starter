# Docker PostgreSQL 設置指南

## 📋 已設置的內容

✅ **Docker Compose 配置**
- 文件: `docker-compose.yml`
- 服務: PostgreSQL 15 (Alpine)
- 數據庫: gravito_ddd
- 用戶: postgres
- 密碼: postgres

✅ **管理腳本**
- `scripts/docker-pg.sh` - PostgreSQL 服務管理
- `scripts/run-with-postgres.sh` - 使用 PostgreSQL 運行應用

✅ **環境配置**
- `.env.postgres` - PostgreSQL 環境變數預設配置

## 🚀 快速開始

### 1. 啟動 PostgreSQL 服務

```bash
# 啟動
./scripts/docker-pg.sh start

# 檢查狀態
./scripts/docker-pg.sh status

# 查看日誌
./scripts/docker-pg.sh logs

# 停止
./scripts/docker-pg.sh stop
```

### 2. 使用 PostgreSQL 開發應用

```bash
# 方式 1：使用快速啟動腳本（推薦）
./scripts/run-with-postgres.sh dev

# 方式 2：手動設置環境變數
export DB_CONNECTION=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_DATABASE=gravito_ddd
export DB_USER=postgres
export DB_PASSWORD=postgres
export ENABLE_DB=true
bun dev

# 方式 3：複製環境配置文件
cp .env.postgres .env
source .env
bun dev
```

### 3. 運行測試

```bash
# 使用 PostgreSQL 運行測試
./scripts/run-with-postgres.sh test

# 或手動設置後運行
source .env.postgres
bun test
```

### 4. 進入 PostgreSQL 命令行

```bash
# 方式 1：使用腳本
./scripts/docker-pg.sh shell

# 方式 2：使用 Docker
docker-compose exec postgres psql -U postgres -d gravito_ddd

# 方式 3：使用快速啟動腳本
./scripts/run-with-postgres.sh shell
```

## 📊 常用 SQL 命令

### 基本檢查

```sql
-- 連接測試
SELECT 1 as connection_test;

-- 查看版本
SELECT version();

-- 列出所有數據庫
\l

-- 列出所有表
\dt

-- 查看當前用戶
SELECT current_user;
```

### 數據庫操作

```sql
-- 創建測試表
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入測試數據
INSERT INTO test_table (name) VALUES ('test');

-- 查詢數據
SELECT * FROM test_table;

-- 刪除表
DROP TABLE IF EXISTS test_table;
```

## 🔧 Docker Compose 命令

```bash
# 啟動服務
docker-compose up -d

# 停止服務
docker-compose down

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f postgres

# 進入容器
docker-compose exec postgres bash

# 刪除數據卷（重置數據）
docker-compose down -v
```

## 🛠️ 數據庫遷移

若需要運行數據庫遷移（使用 Drizzle 或其他 ORM）：

```bash
# 啟動 PostgreSQL
./scripts/docker-pg.sh start

# 運行遷移
bun run migrate

# 檢查遷移狀態
bun run migrate:status
```

## 🔄 環境切換

### 從 SQLite 切換到 PostgreSQL

```bash
# 1. 啟動 PostgreSQL
./scripts/docker-pg.sh start

# 2. 複製環境配置
cp .env.postgres .env

# 3. 運行應用
bun dev
```

### 從 PostgreSQL 切換回 SQLite

```bash
# 1. 停止 PostgreSQL
./scripts/docker-pg.sh stop

# 2. 重置 .env
export DB_CONNECTION=sqlite
export ENABLE_DB=true

# 3. 運行應用
bun dev
```

## 📝 環境變數配置

### .env.postgres 文件說明

```env
# 資料庫連接配置
DB_CONNECTION=postgres       # 驅動類型
ENABLE_DB=true              # 啟用資料庫

# PostgreSQL 連接參數
DB_HOST=localhost           # 主機地址
DB_PORT=5432               # 埠號
DB_DATABASE=gravito_ddd    # 數據庫名稱
DB_USER=postgres           # 用戶名
DB_PASSWORD=postgres       # 密碼

# 連接池配置（可選）
DB_POOL_MIN=2              # 最小連接數
DB_POOL_MAX=10             # 最大連接數
DB_POOL_IDLE_TIMEOUT=30000 # 空閒超時（ms）
DB_POOL_CONNECTION_TIMEOUT=5000 # 連接超時（ms）
```

## ⚠️ 故障排除

### 問題：容器無法啟動

```bash
# 檢查是否有端口衝突
lsof -i :5432

# 刪除舊容器
docker-compose down -v

# 重新啟動
./scripts/docker-pg.sh start
```

### 問題：連接超時

```bash
# 檢查容器狀態
./scripts/docker-pg.sh status

# 查看日誌
./scripts/docker-pg.sh logs

# 重啟服務
./scripts/docker-pg.sh restart
```

### 問題：數據丟失

```bash
# Docker 數據卷已持久化，除非執行以下命令
docker-compose down -v  # 注意：這會刪除所有數據！

# 恢復前次數據
docker-compose up -d
```

## 🔐 安全建議

### 生產環境

在生產環境中，**必須更改默認密碼**：

```yaml
# docker-compose.yml
environment:
  POSTGRES_PASSWORD: your-secure-password
```

然後更新 `.env.postgres`：

```env
DB_PASSWORD=your-secure-password
```

### 備份數據

```bash
# 備份數據庫
docker-compose exec postgres pg_dump -U postgres gravito_ddd > backup.sql

# 恢復數據庫
docker-compose exec -T postgres psql -U postgres gravito_ddd < backup.sql
```

## 📚 更多資源

- [Docker 文檔](https://docs.docker.com)
- [Docker Compose 文檔](https://docs.docker.com/compose)
- [PostgreSQL 文檔](https://www.postgresql.org/docs)
- [Atlas ORM 文檔](https://gravito-framework.github.io/atlas)

---

**最後更新**: 2026-03-12
