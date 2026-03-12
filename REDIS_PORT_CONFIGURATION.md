# Redis 端口配置指南

## 問題描述

本地環境中已有 Redis 服務運行在端口 **6379**，Docker Redis 默認也使用 **6379**，會導致埠衝突。

## ✅ 解決方案

Docker Redis 已配置為映射到端口 **6380**，避免與本地 Redis 衝突。

### 配置詳解

| 環境 | 主機端口 | 容器端口 | 狀態 |
|------|--------|--------|------|
| 本地 Redis | 6379 | N/A | ✅ 現有 |
| Docker Redis | 6380 | 6379 | ✅ 新配置 |

## 🔧 使用方式

### 方式 1：使用本地 Redis（推薦）

如果你的本地 Redis 在運行，應用程式可以直接使用它：

```bash
# 確保本地 Redis 在 6379 運行
redis-cli ping
# 輸出: PONG

# 設置環境變數指向本地 Redis
export REDIS_HOST=localhost
export REDIS_PORT=6379

# 啟動應用
./scripts/run-with-postgres.sh dev
```

### 方式 2：使用 Docker Redis

如果想用 Docker Redis（例如隔離環境），配置新端口：

```bash
# 啟動 Docker 服務
./scripts/docker-pg.sh start

# 設置環境變數指向 Docker Redis
export REDIS_HOST=localhost
export REDIS_PORT=6380

# 啟動應用
./scripts/run-with-postgres.sh dev
```

### 方式 3：修改 .env.postgres

編輯 `.env.postgres` 設置默認 Redis 連接：

```env
REDIS_HOST=localhost
REDIS_PORT=6380        # Docker Redis
# 或改為
REDIS_PORT=6379        # 本地 Redis
```

## 📊 端口使用情況

### 檢查本地 Redis

```bash
# 檢查 6379 是否被占用
lsof -i :6379

# 或使用 redis-cli 驗證
redis-cli -p 6379 ping
# 輸出: PONG
```

### 檢查 Docker Redis

```bash
# 啟動容器後驗證
docker-compose exec -T redis redis-cli ping
# 輸出: PONG

# 從主機連接
redis-cli -p 6380 ping
# 輸出: PONG
```

## 🎯 推薦配置

### 開發環境

```bash
# 1. 保持本地 Redis 運行（6379）
# 2. 修改 .env.postgres
REDIS_PORT=6379

# 3. 啟動應用
./scripts/run-with-postgres.sh dev
```

### 隔離環境（Docker）

```bash
# 1. 啟動 Docker 服務
./scripts/docker-pg.sh start

# 2. 設置環境變數
export REDIS_PORT=6380

# 3. 啟動應用
./scripts/run-with-postgres.sh dev

# 4. 停止服務
./scripts/docker-pg.sh stop
```

## 🔄 在兩個 Redis 之間切換

### 從 Docker 切換到本地

```bash
# 停止 Docker Redis
./scripts/docker-pg.sh stop

# 改為使用本地 Redis
export REDIS_PORT=6379

# 啟動應用
./scripts/run-with-postgres.sh dev
```

### 從本地切換到 Docker

```bash
# 啟動 Docker Redis
./scripts/docker-pg.sh start

# 改為使用 Docker Redis
export REDIS_PORT=6380

# 啟動應用
./scripts/run-with-postgres.sh dev
```

## 📝 相關文件

- `docker-compose.yml` - Docker Redis 配置（端口 6380）
- `config/app/redis.ts` - Redis 客戶端配置
- `.env.postgres` - 環境變數配置
- `DOCKER_POSTGRES_QUICKSTART.md` - 快速入門卡
- `docs/REDIS_INTEGRATION.md` - 完整集成指南

## ⚠️ 故障排除

### Docker Redis 無法連接

```bash
# 檢查容器是否運行
docker-compose ps redis

# 查看日誌
./scripts/docker-pg.sh logs redis

# 驗證端口映射
docker-compose port redis 6379
# 輸出: 0.0.0.0:6380

# 測試連接
redis-cli -p 6380 ping
```

### 本地 Redis 無法連接

```bash
# 檢查本地 Redis 狀態
redis-cli -p 6379 ping

# 如果無法連接，啟動本地 Redis
redis-server

# 或查看是否已運行
lsof -i :6379
```

### 環境變數未生效

```bash
# 驗證環境變數
echo $REDIS_PORT
echo $REDIS_HOST

# 設置並驗證
export REDIS_HOST=localhost
export REDIS_PORT=6380
echo $REDIS_PORT  # 應顯示 6380

# 再次啟動應用
./scripts/run-with-postgres.sh dev
```

## 🚀 總結

- **本地 Redis**: `localhost:6379` ✅
- **Docker Redis**: `localhost:6380` ✅
- **默認配置**: 請根據需要在 `.env.postgres` 或環境變數中設置

---

**更新於**: 2026-03-12
**狀態**: ✅ 已配置並驗證
