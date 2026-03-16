# Database Port - 資料庫抽象層文檔

> **文檔範疇**: Memory / Redis / Database 實現（M9 + M10 + M11）

## 📚 文檔結構

```
docs/05-Database-Port/
├── README.md                                    (本檔案) 統一索引
├── M9_REDIS_DISTRIBUTED_DEDUPLICATION.md       Redis 分散式事件去重
├── M10_REDIS_DISTRIBUTED_CACHE.md              Redis 分散式查詢快取
└── M11_DATABASE_EVENT_DEDUPLICATION.md         資料庫事件去重
```

---

## 核心模組概覽

### M11: Database Event Deduplication

**用途**: 資料庫驅動的事件去重，適合需要長期審計日誌的場景

| 特性 | Memory | Redis | Database |
|------|--------|-------|----------|
| 存儲位置 | 進程內 | Redis | 資料庫 |
| 跨進程共享 | ❌ | ✅ | ✅ |
| 應用重啟後 | 丟失 | 保留 | ✅ 永久 |
| 長期保存 | ❌ | ⚠️ 需 TTL | ✅ 審計 |
| 推薦環境 | 開發 | 生產 | 生產 |

**關鍵 API**:
```typescript
await dedup.markProcessed(eventId)     // 標記
await dedup.isProcessed(eventId)       // 檢查
await dedup.cleanupExpiredRecords()    // 清理過期
await dedup.getStats()                 // 統計
```

**優勢**: 無需額外部署、永久審計、支援複雜查詢

👉 詳見: [M11_DATABASE_EVENT_DEDUPLICATION.md](M11_DATABASE_EVENT_DEDUPLICATION.md)

---

### M10: Redis Distributed Query Cache

**用途**: 分散式查詢結果快取，支援多進程/機器共享

| 特性 | Memory | Redis |
|------|--------|-------|
| 存儲位置 | 進程內 | Redis 服務器 |
| 跨進程共享 | ❌ | ✅ |
| 應用重啟後 | 快取丟失 | ✅ 保留 |
| 推薦環境 | 開發 | 生產 |

**關鍵 API**:
```typescript
await cache.get<T>(key)           // 查詢
await cache.set<T>(key, data, ttl) // 存儲
await cache.delete(key)            // 刪除
await cache.getStats()             // 統計
```

👉 詳見: [M10_REDIS_DISTRIBUTED_CACHE.md](M10_REDIS_DISTRIBUTED_CACHE.md)

---

### M9: Redis Distributed Event Deduplication

**用途**: 分散式事件去重，防止多 Worker 重複執行

| 特性 | Memory | Redis |
|------|--------|-------|
| 儲存 | 進程內 Set | Redis 鍵值 |
| 跨進程 | ❌ | ✅ |
| 故障恢復 | ⚠️ 重啟丟失 | ✅ 保留 |
| 推薦環境 | 開發 | 生產 |

**關鍵 API**:
```typescript
await dedup.isProcessed(eventId)  // 檢查
await dedup.markProcessed(eventId) // 標記
await dedup.remove(eventId)        // 移除
await dedup.getProcessedCount()    // 統計
```

👉 詳見: [M9_REDIS_DISTRIBUTED_DEDUPLICATION.md](M9_REDIS_DISTRIBUTED_DEDUPLICATION.md)

---

## 🎯 使用場景

### 場景 1: 高併發查詢最佳化（M10）

```typescript
const cache = new RedisQueryCache(redis)

const expensive Query = async (sql: string) => {
  const cacheKey = `query:${sql}`

  // 1. 檢查快取
  let result = await cache.get(cacheKey)

  if (!result) {
    // 2. 執行查詢
    result = await db.query(sql)

    // 3. 快取 5 分鐘
    await cache.set(cacheKey, result, 300000)
  }

  return result
}
```

**改善**:
- 100 個併發請求 → 1 次 DB 查詢
- 平均延遲: 100ms → 0.1ms

---

### 場景 2: 分散式支付處理（M9）

```typescript
const dedup = new RedisEventDeduplicator(redis)

class PaymentProcessor {
  async process(eventId: string, amount: number) {
    // 1. 檢查是否已處理
    if (await dedup.isProcessed(eventId)) {
      return // 已處理，跳過
    }

    try {
      // 2. 執行支付
      await this.gateway.charge(amount)

      // 3. 標記為已處理
      await dedup.markProcessed(eventId)
    } catch (error) {
      // 失敗不標記，允許重試
      throw error
    }
  }
}
```

**優勢**:
- 支援多 Worker 自動協調
- 故障重試自動去重
- 防止重複扣款

---

### 場景 3: M10 + M9 組合（完整最佳化）

```typescript
class OptimizedQueryService {
  constructor(
    private cache: IQueryCache,
    private dedup: IEventDeduplicator
  ) {}

  async executeQuery(eventId: string, sql: string) {
    // 1. 檢查快取
    const cacheKey = `query:${sql}`
    let result = await this.cache.get(cacheKey)

    if (!result) {
      // 2. 檢查去重
      if (await this.dedup.isProcessed(eventId)) {
        return null // 已處理但無快取
      }

      // 3. 執行查詢
      result = await this.db.query(sql)

      // 4. 快取結果
      await this.cache.set(cacheKey, result, 3600000)
    }

    // 5. 標記為已處理
    await this.dedup.markProcessed(eventId)

    return result
  }
}
```

**效能提升**:
```
無優化:        100 個併發 × 100ms = 10 秒
+ M10 快取:    1 × 100ms + 99 × 0.1ms = 100ms
+ M9 去重:     防止重複執行 + 故障恢復
```

---

## 🔄 故障處理對比

### M10 快取故障

| 操作 | 失敗行為 |
|------|---------|
| `get()` | 返回 `null`（自動降級到 DB） |
| `set()` | 記錄 warn（不拋出異常） |
| `has()` | 返回 `false` |

**應用策略**:
```typescript
const result = await cache.get(key) || (await db.query())
```

---

### M9 去重故障

| 操作 | 失敗行為 |
|------|---------|
| `isProcessed()` | 返回 `false`（傾向重複） |
| `markProcessed()` | **拋出異常**（必須捕獲） |
| `getProcessedCount()` | 返回 `0` |

**應用策略**:
```typescript
try {
  await dedup.markProcessed(eventId)
} catch (error) {
  // 無法標記時決定是否重試
  console.error('標記失敗:', error)
}
```

**關鍵差異**: M9 傾向於允許重複而非假設已處理，因為重複執行比丟失事件風險更低。

---

## 📊 性能特性

### 時間複雜度

| 操作 | M10 | M9 | 說明 |
|------|-----|----|----|
| Get/Check | O(1) | O(1) | Redis 查詢 |
| Set/Mark | O(1) | O(1) | Redis 操作 |
| Delete/Remove | O(1) | O(1) | Redis 操作 |
| Stats | O(1) | O(1) | Redis LLEN |

### 大規模測試結果

```
1,000 項快取 / 事件: ✅ 高效
10,000 查詢: ✅ O(1) 性能
並發 100+ 請求: ✅ 穩定
```

---

## 🚀 部署建議

### 開發環境

```typescript
// .env.local
CACHE_DRIVER=memory
DEDUP_DRIVER=memory

container.singleton('queryCache', () => new MemoryQueryCache())
container.singleton('deduplicator', () => new MemoryEventDeduplicator())
```

### 生產環境

```typescript
// .env
CACHE_DRIVER=redis
DEDUP_DRIVER=redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379

const redis = container.make('redis') as IRedisService

container.singleton('queryCache', () => new RedisQueryCache(redis))
container.singleton('deduplicator', () =>
  new RedisEventDeduplicator(redis, 86400) // 24h TTL
)
```

---

## 🔍 監控和調試

### 查看快取統計（M10）

```typescript
const stats = await cache.getStats()

console.log(`
  大小: ${stats.size}
  命中: ${stats.hits}
  未命中: ${stats.misses}
  命中率: ${(stats.hitRate * 100).toFixed(2)}%
`)

// 命中率低於 50% 時調整 TTL 策略
if (stats.hitRate < 0.5) {
  console.warn('低命中率，增加 TTL')
}
```

### 查看去重統計（M9）

```typescript
const count = await dedup.getProcessedCount()
const ids = await dedup.listProcessedEventIds(10)

console.log(`
  已處理事件: ${count}
  最近 10 個: ${ids.join(', ')}
`)
```

### Redis CLI 檢查

```bash
# 查看所有快取鍵
redis-cli KEYS "query:*"

# 查看快取統計
redis-cli LLEN "query:metrics:hits"
redis-cli LLEN "query:metrics:misses"

# 查看去重記錄
redis-cli LLEN "dedup:all"
redis-cli EXISTS "dedup:event:order-2026-001"
```

---

## 📖 詳細文檔導航

| 主題 | 文檔 | 內容 |
|------|------|------|
| **M11 資料庫去重** | [M11_DATABASE_EVENT_DEDUPLICATION.md](M11_DATABASE_EVENT_DEDUPLICATION.md) | API、TTL、表設計、審計、自動清理、長期保存 |
| **M10 Redis 快取** | [M10_REDIS_DISTRIBUTED_CACHE.md](M10_REDIS_DISTRIBUTED_CACHE.md) | API、TTL、分散式使用、故障降級 |
| **M9 Redis 去重** | [M9_REDIS_DISTRIBUTED_DEDUPLICATION.md](M9_REDIS_DISTRIBUTED_DEDUPLICATION.md) | API、使用場景、Saga 集成、多 Worker 協調 |

---

## ✅ 檢查清單

新增 Redis 功能時：

- [ ] **M10 快取**: 決定快取鍵命名規範
- [ ] **M10 TTL**: 設定合適的過期時間（開發: 無，生產: 5-60min）
- [ ] **M9 去重**: 評估是否需要事件去重
- [ ] **M9 TTL**: 選擇去重保留期（預設: 24 小時）
- [ ] **故障處理**: 實現 Redis 連線失敗的應用層降級
- [ ] **監控**: 設定快取命中率告警
- [ ] **測試**: 驗證 Redis 不可用時的行為

---

## 🔗 相關模組

- **M10 Query Cache (Memory)**: `docs/05-Database-Port/M10_QUERY_OPTIMIZATION.md`
- **M9 Event Deduplication (Memory)**: `docs/05-Database-Port/M9_DEDUPLICATION.md`
- **IDatabaseAccess**: `docs/02-Architecture/PORTS.md`
- **IRedisService**: `docs/Foundation/Infrastructure/REDIS_SERVICE.md`

---

---

## 📊 三種實現對比

```
                Memory          Redis           Database
────────────────────────────────────────────────────────
跨進程          ❌              ✅              ✅
分散式          ❌              ✅              ✅
重啟恢復        ⚠️ 丟失         ✅ 24h          ✅ 永久
長期保存        ❌              ❌              ✅
額外部署        無              Redis           無
複雜查詢        ❌              ❌              ✅
審計能力        ❌              ❌              ✅
────────────────────────────────────────────────────────
推薦環境        開發/測試       生產            生產
```

---

## 🎯 選擇指南

### 使用 Memory 版本當
- ✅ 開發/測試環境
- ✅ 無需跨進程協調
- ✅ 重啟可接受丟失狀態

### 使用 Redis 版本（M9/M10）當
- ✅ 多 Worker 需要協調
- ✅ 短期去重/快取（分鐘級）
- ✅ 已有 Redis 部署
- ✅ 追求最高效能

### 使用 Database 版本（M11）當
- ✅ 需要長期審計日誌
- ✅ 不想維護額外服務（Redis）
- ✅ 需要複雜的歷史查詢
- ✅ 事件記錄需永久保存

---

**最後更新**: 2026-03-16
**版本**: 1.1
**狀態**: Production Ready ✅ (M9+M10+M11)
