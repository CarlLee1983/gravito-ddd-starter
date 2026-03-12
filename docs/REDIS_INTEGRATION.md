# Redis 集成指南

## 概述

gravito-ddd 應用程式已整合 Redis 支持，用於緩存、隊列和會話管理。Redis 通過 Docker 容器在本地開發環境中運行。

## ✅ Redis 已配置項

### 1. Docker Compose 配置
- **文件**: `docker-compose.yml`
- **映像**: redis:7-alpine
- **端口**: 6379
- **持久化**: AOF (Append-Only File)
- **健康檢查**: Redis PING 命令

### 2. 應用程式配置
- **配置文件**: `config/app/redis.ts`
- **默認連接**: `default`
- **環境變數**:
  - `REDIS_HOST`: localhost (默認)
  - `REDIS_PORT`: 6379 (默認)
  - `REDIS_PASSWORD`: 空 (默認)

### 3. 框架集成
- **Plasma 客戶端**: Gravito 框架自動初始化
- **Redis 適配器**: `GravitoRedisAdapter.ts`
- **隊列適配器**: `RedisJobQueueAdapter.ts`

## 🚀 快速開始

### 啟動 Redis

```bash
# 啟動 PostgreSQL 和 Redis
./scripts/docker-pg.sh start

# 或單獨啟動 Redis
docker-compose up -d redis

# 檢查狀態
./scripts/docker-pg.sh status
```

### 進入 Redis CLI

```bash
# 方式 1：使用腳本
./scripts/docker-pg.sh redis

# 方式 2：使用 Docker
docker-compose exec redis redis-cli

# 方式 3：通過 Docker Compose
docker-compose exec -T redis redis-cli
```

### 驗證連接

```bash
# 測試 PING
docker-compose exec -T redis redis-cli ping
# 輸出：PONG

# 查看 Redis 信息
docker-compose exec -T redis redis-cli info server

# 列出所有鍵
docker-compose exec -T redis redis-cli keys "*"
```

## 📊 Redis 命令行使用

### 基本操作

```bash
# 進入 Redis CLI
./scripts/docker-pg.sh redis

# 在 CLI 中執行命令

# 檢查 PING
> ping
PONG

# 設置鍵值
> set mykey "Hello Redis"
OK

# 獲取鍵值
> get mykey
"Hello Redis"

# 刪除鍵
> del mykey
(integer) 1

# 檢查鍵是否存在
> exists mykey
(integer) 0

# 列出所有鍵
> keys *

# 清空所有數據
> flushall
OK

# 退出
> exit
```

### 列表操作

```bash
# 推入列表
> rpush mylist "item1" "item2" "item3"
(integer) 3

# 獲取列表
> lrange mylist 0 -1
1) "item1"
2) "item2"
3) "item3"

# 彈出元素
> lpop mylist
"item1"
```

## 🔧 應用程式中使用 Redis

### 獲取 Redis 客戶端

在應用程式中，Redis 客戶端通過 Gravito 容器自動注入：

```typescript
// 在 Service Provider 中
const redis = container.make('redis')

// 執行操作
await redis.ping()        // 返回 "PONG"
await redis.set('key', 'value')
const value = await redis.get('key')
await redis.del('key')
```

### 隊列操作

```typescript
// 推入隊列
await redis.rpush('job-queue', JSON.stringify(jobData))

// 消費隊列
const job = await redis.lpop('job-queue')
```

## 🎯 Redis 使用場景

### 1. 緩存 (Cache)
- 應用層緩存通過 `Stasis` Redis Store 實現
- 自動 TTL 過期

### 2. 隊列 (Queue)
- 通過 `RedisJobQueueAdapter` 實現
- 用於異步任務處理

### 3. 會話 (Session)
- 支持會話存儲
- 在生產環境中推薦使用

### 4. 實時功能
- 發佈/訂閱 (Pub/Sub)
- WebSocket 連接管理

## 📁 相關文件

```
app/
├── Shared/Infrastructure/
│   ├── Framework/
│   │   ├── GravitoRedisAdapter.ts      # Redis 適配器
│   │   ├── RedisJobQueueAdapter.ts     # 隊列適配器
│   │   └── RedisEventDispatcher.ts     # 事件分發
│   └── IRedisService.ts                 # Redis 服務介面
├── config/app/
│   ├── redis.ts                         # Redis 配置
│   └── cache.ts                         # 緩存配置
└── providers/
    └── InfrastructureServiceProvider.ts # 基礎設施提供者

docker-compose.yml                       # Redis 容器配置
.env.postgres                            # Redis 環境變數
scripts/docker-pg.sh                     # 服務管理腳本
```

## 🔄 環境變數配置

### .env.postgres

```env
# Redis 連接配置
REDIS_HOST=localhost
REDIS_PORT=6380        # Docker Redis 映射到 6380（避免與本地 Redis:6379 衝突）
REDIS_DB=0
REDIS_PASSWORD=
```

**注意**: 如果本地已有 Redis 運行在 6379，Docker Redis 配置為 6380。確保 .env.postgres 中的 `REDIS_PORT` 設為 6380。

## ⚙️ Docker Redis 配置詳解

### docker-compose.yml

```yaml
redis:
  image: redis:7-alpine           # 輕量級 Alpine Linux
  container_name: gravito-redis
  restart: unless-stopped         # 自動重啟

  ports:
    - "6379:6379"                 # 默認 Redis 端口

  command: redis-server --appendonly yes  # AOF 持久化

  volumes:
    - gravito_redis_data:/data    # 數據卷持久化

  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5

  networks:
    - gravito-network             # 容器網絡
```

## 🚨 故障排除

### Redis 無法連接

```bash
# 檢查容器狀態
./scripts/docker-pg.sh status

# 查看日誌
./scripts/docker-pg.sh logs redis

# 重啟 Redis
./scripts/docker-pg.sh restart
```

### 埠已被佔用

```bash
# 查看誰占用了 6379 埠
lsof -i :6379

# 強制清理（如果需要）
pkill redis
```

### 數據持久化問題

```bash
# 檢查數據卷
docker volume ls | grep redis

# 清空數據卷並重啟
docker-compose down -v
./scripts/docker-pg.sh start
```

## 📊 監控和維護

### 查看 Redis 統計

```bash
# 基本信息
docker-compose exec -T redis redis-cli info

# 内存使用
docker-compose exec -T redis redis-cli info memory

# 連接數
docker-compose exec -T redis redis-cli info clients

# 鍵統計
docker-compose exec -T redis redis-cli dbsize
```

### 性能優化

```bash
# 設置緩存淘汰策略（在 Redis CLI）
> config set maxmemory-policy allkeys-lru

# 保存配置
> bgsave

# 檢查慢查詢日誌
> slowlog get 10
```

## 🔐 生產環境建議

1. **設置密碼**
   ```bash
   # 在 docker-compose.yml 中
   command: redis-server --requirepass your-secure-password
   # 在 .env.postgres 中
   REDIS_PASSWORD=your-secure-password
   ```

2. **備份策略**
   ```bash
   # 定期備份 RDB/AOF
   docker-compose exec redis redis-cli bgsave
   ```

3. **監控和告警**
   - 使用 Redis Commander 或 RedisInsight
   - 監控內存使用和執行時間

## 📚 參考資源

- [Redis 官方文檔](https://redis.io/docs/)
- [Redis 命令參考](https://redis.io/commands/)
- [Gravito Plasma 文檔](https://gravito-framework.github.io/plasma)
- [Docker Compose Redis](https://hub.docker.com/_/redis)

---

**最後更新**: 2026-03-12
**Redis 版本**: 7.4.7
**狀態**: ✅ 完全配置並驗證
