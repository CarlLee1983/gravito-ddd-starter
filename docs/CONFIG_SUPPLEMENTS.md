# Config 補充設定清單

## 已建立的配置檔案

### ✅ `config/app/queue.ts` - 隊列系統統一配置

統一管理三種隊列驅動的配置：
- **Memory**: 開發測試環境
- **Redis**: 生產環境推薦，支援分散式
- **RabbitMQ**: 進階功能，支援複雜路由

### ✅ `config/app/index.ts` - 更新已完成

- 導出 `queue` 配置
- 在 `buildConfig()` 中包含隊列配置

### ✅ `.env.example.queue` - 環境變數範例

包含所有隊列相關環境變數的完整註釋

---

## 配置覆蓋範圍檢查

### 📊 環境變數對應表

| 環境變數 | 配置位置 | 類型 | 預設值 | 說明 |
|---------|---------|------|--------|------|
| **EVENT_DRIVER** | `queue.default` | string | `memory` | 隊列驅動選擇 |
| | | | | |
| **REDIS 配置** | | | | |
| REDIS_HOST | `redis.ts` | string | `127.0.0.1` | Redis 伺服器位址 |
| REDIS_PORT | `redis.ts` | number | `6379` | Redis 端口 |
| REDIS_PASSWORD | `redis.ts` | string | - | Redis 密碼 |
| REDIS_QUEUE_CONNECTION | `queue.drivers.redis.connection` | string | `default` | 隊列用連接名 |
| REDIS_EVENTS_QUEUE | `queue.drivers.redis.queues.events` | string | `domain_events_queue` | 事件隊列名 |
| REDIS_JOBS_QUEUE | `queue.drivers.redis.queues.jobs` | string | `system_jobs_queue` | 工作隊列名 |
| QUEUE_POLLING_INTERVAL | `queue.drivers.redis.polling.interval` | number | `1000` | 輪詢間隔(ms) |
| QUEUE_POLLING_TIMEOUT | `queue.drivers.redis.polling.timeout` | number | `30000` | 輪詢超時(ms) |
| | | | | |
| **RABBITMQ 配置** | | | | |
| RABBITMQ_URL | `queue.drivers.rabbitmq.url` | string | `amqp://...` | 連接 URL |
| RABBITMQ_HOST | `queue.drivers.rabbitmq.connection.host` | string | `localhost` | RabbitMQ 伺服器 |
| RABBITMQ_PORT | `queue.drivers.rabbitmq.connection.port` | number | `5672` | AMQP 端口 |
| RABBITMQ_USER | `queue.drivers.rabbitmq.connection.username` | string | `guest` | 使用者名 |
| RABBITMQ_PASS | `queue.drivers.rabbitmq.connection.password` | string | `guest` | 密碼 |
| RABBITMQ_VHOST | `queue.drivers.rabbitmq.connection.vhost` | string | `/` | 虛擬主機 |
| RABBITMQ_PREFETCH | `queue.drivers.rabbitmq.consumer.prefetch` | number | `1` | 預取消息數 |
| RABBITMQ_CONSUMER_TIMEOUT | `queue.drivers.rabbitmq.consumer.timeout` | number | `30000` | 消費超時(ms) |
| RABBITMQ_RECONNECT_ATTEMPTS | `queue.drivers.rabbitmq.reconnect.maxAttempts` | number | `10` | 最大重連次數 |
| RABBITMQ_RECONNECT_DELAY | `queue.drivers.rabbitmq.reconnect.initialDelay` | number | `1000` | 初始延遲(ms) |
| RABBITMQ_RECONNECT_MAX_DELAY | `queue.drivers.rabbitmq.reconnect.maxDelay` | number | `30000` | 最大延遲(ms) |
| | | | | |
| **Job 配置** | | | | |
| JOB_RETRIES | `queue.job.retries` | number | `3` | 重試次數 |
| JOB_BACKOFF | `queue.job.backoff` | number | `60` | 重試延遲(秒) |
| JOB_DELAY | `queue.job.delay` | number | `0` | 延遲執行(秒) |
| | | | | |
| **Event 配置** | | | | |
| EVENT_SERIALIZATION | `queue.event.serialization` | string | `json` | 序列化格式 |
| EVENT_LOGGING | `queue.event.logging` | boolean | `false` | 記錄日誌 |

---

## 場景配置

### 場景 1：本機開發（Memory 驅動）

```bash
# .env.development
EVENT_DRIVER=memory
# 其他配置不需要，因為 Memory 驅動無需外部依賴
```

**特點**：
- ✅ 無需 Docker 容器
- ✅ 最快啟動速度
- ❌ 進程重啟丟失事件
- 用途：本機單元測試、快速開發反覆運算

### 場景 2：開發環境（Redis 驅動，Docker）

```bash
# .env.development
EVENT_DRIVER=redis
REDIS_HOST=gravito-redis
REDIS_PORT=6379
REDIS_PASSWORD=

# 隊列配置（可選，使用預設值）
# REDIS_QUEUE_CONNECTION=default
# QUEUE_POLLING_INTERVAL=1000

# Job 配置（可選，開發環境使用預設值）
# JOB_RETRIES=3
```

**docker-compose 指令**：
```bash
docker-compose up redis postgres
```

**啟動應用**：
```bash
EVENT_DRIVER=redis bun dev
EVENT_DRIVER=redis bun scripts/worker.ts
```

### 場景 3：預發環境（Redis 驅動，持久化）

```bash
# .env.staging
EVENT_DRIVER=redis
REDIS_HOST=redis-staging.internal
REDIS_PORT=6379
REDIS_PASSWORD=secure_password_here

# 打開事件日誌進行監控
EVENT_LOGGING=true

# 調整重試策略
JOB_RETRIES=5
JOB_BACKOFF=120  # 2 分鐘重試延遲
```

**驗證步驟**：
```bash
redis-cli -h redis-staging.internal -a secure_password_here ping
```

### 場景 4：生產環境（RabbitMQ 驅動）

```bash
# .env.production
EVENT_DRIVER=rabbitmq
RABBITMQ_URL=amqp://prod_user:secure_pass@rabbitmq-prod.internal:5672/gravito

# 或詳細配置
RABBITMQ_HOST=rabbitmq-prod.internal
RABBITMQ_PORT=5672
RABBITMQ_USER=prod_user
RABBITMQ_PASS=secure_pass
RABBITMQ_VHOST=/gravito

# 生產環境重連策略（更積極的重試）
RABBITMQ_RECONNECT_ATTEMPTS=20
RABBITMQ_RECONNECT_DELAY=2000
RABBITMQ_RECONNECT_MAX_DELAY=60000

# 消費者配置（更高的並行度）
RABBITMQ_PREFETCH=10

# 啟用日誌監控
EVENT_LOGGING=true

# Job 重試策略（生產環境更嚴格）
JOB_RETRIES=5
JOB_BACKOFF=300  # 5 分鐘
```

**驗證步驟**：
```bash
# 檢查 RabbitMQ 連接
curl -u prod_user:secure_pass http://rabbitmq-prod.internal:15672/api/whoami

# 檢查 Docker 日誌
docker logs gravito-rabbitmq
```

---

## 補充設定項目清單

### 🟢 已實現

- [x] Memory 驅動配置
- [x] Redis 驅動配置（基礎）
- [x] RabbitMQ 驅動配置（完整）
- [x] Job 重試配置
- [x] Event 序列化配置
- [x] 環境變數範例檔
- [x] 統一 config/app/queue.ts

### 🟡 建議補充（可選）

#### 1. **連接池配置**（針對高負荷場景）

```typescript
// config/app/queue.ts 中添加
redis: {
  // ... 現有配置
  pool: {
    max: 10,           // 最大連接數
    min: 2,            // 最小連接數
    idleTimeoutMillis: 30000,  // 空閒超時
    connectionTimeoutMillis: 2000,  // 連接超時
  }
}
```

**環境變數支援**：
```bash
REDIS_POOL_MAX=10
REDIS_POOL_MIN=2
REDIS_POOL_IDLE_TIMEOUT=30000
```

#### 2. **監控和指標配置**（Prometheus）

```typescript
monitoring: {
  enabled: process.env.QUEUE_MONITORING === 'true',
  metricsPort: Number.parseInt(process.env.QUEUE_METRICS_PORT ?? '9090', 10),
  namespace: process.env.QUEUE_METRICS_NAMESPACE ?? 'gravito_queue',
  // 指標收集間隔
  interval: Number.parseInt(process.env.QUEUE_METRICS_INTERVAL ?? '60000', 10),
}
```

**環境變數**：
```bash
QUEUE_MONITORING=true
QUEUE_METRICS_PORT=9090
QUEUE_METRICS_NAMESPACE=gravito_queue
```

#### 3. **死信隊列（DLQ）配置**

```typescript
deadLetterQueue: {
  enabled: true,
  storage: process.env.DLQ_STORAGE ?? 'redis',  // redis | database | rabbitmq
  retention: Number.parseInt(process.env.DLQ_RETENTION ?? '604800', 10),  // 7 天
  alertThreshold: Number.parseInt(process.env.DLQ_ALERT_THRESHOLD ?? '100', 10),
}
```

**環境變數**：
```bash
DLQ_STORAGE=redis
DLQ_RETENTION=604800  # 秒
DLQ_ALERT_THRESHOLD=100
```

#### 4. **優先級隊列配置**

```typescript
priorityQueues: {
  enabled: process.env.PRIORITY_QUEUES === 'true',
  levels: {
    critical: { priority: 1, workers: 10 },
    high: { priority: 5, workers: 5 },
    normal: { priority: 10, workers: 3 },
    low: { priority: 20, workers: 1 },
  }
}
```

#### 5. **速率限制配置**

```typescript
rateLimit: {
  enabled: process.env.QUEUE_RATE_LIMIT === 'true',
  maxJobsPerSecond: Number.parseInt(process.env.QUEUE_MAX_JOBS_PER_SECOND ?? '100', 10),
  maxEventsPerSecond: Number.parseInt(process.env.QUEUE_MAX_EVENTS_PER_SECOND ?? '1000', 10),
}
```

### 🔴 未來擴展（非必需）

- [ ] 分佈式追蹤（OpenTelemetry）
- [ ] Circuit Breaker 配置
- [ ] 自適應重試策略
- [ ] 動態負載平衡
- [ ] 隊列優先級調度

---

## 檢查清單：config 補充完整性

### 基礎配置

- [x] `config/app/queue.ts` 已建立
- [x] 所有環境變數已包含
- [x] 三種驅動配置已完成
- [x] `config/app/index.ts` 已更新
- [x] 環境變數範例 `.env.example.queue` 已建立

### 場景驗證

- [ ] 測試 Memory 驅動啟動
- [ ] 測試 Redis 驅動啟動
- [ ] 測試 RabbitMQ 驅動啟動
- [ ] 驗證環境變數覆蓋工作

### 文檔

- [x] `QUEUE_CONFIG_REFACTOR.md` - 改進指南
- [x] `CONFIG_SUPPLEMENTS.md` - 本文檔
- [ ] 更新主要 README.md

---

## 下一步建議

1. **立即**：確認上述配置檔案是否齐全
2. **可選**：實現「補充設定項目清單」中的 🟡 項目
3. **未來**：實現 🔴 項目以支援更複雜的場景

## 參考資源

- [QUEUE_SYSTEM.md](./QUEUE_SYSTEM.md) - 隊列系統指南
- [QUEUE_CONFIG_REFACTOR.md](./QUEUE_CONFIG_REFACTOR.md) - 配置改進詳情
- [config/app/cache.ts](../config/app/cache.ts) - 類似配置範式
- [config/app/redis.ts](../config/app/redis.ts) - Redis 配置參考
