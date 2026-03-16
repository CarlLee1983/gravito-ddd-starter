# M11: Database Event Deduplication

**版本**: 1.0 | **狀態**: Production Ready | **測試**: 19/19 通過

## 概述

M11 Database 實現提供了資料庫驅動的事件去重解決方案，為需要長期保留審計日誌的場景設計。相比 Redis 版本（M9），Database 版本不需額外部署，利用既有的資料庫基礎設施。

### 核心價值

在分散式系統中，確保冪等性是關鍵。M11 Database 實現：

1. **長期審計能力**: 事件記錄永久保存在資料庫
2. **零額外部署**: 無需 Redis、Memcached 等外部服務
3. **自動 TTL 管理**: 過期記錄可按計劃自動清理
4. **元數據追蹤**: 儲存事件來源、處理者等上下文資訊
5. **跨進程共享**: 多進程安全的去重狀態

### 與其他版本的對比

| 特性 | Memory | Redis | Database |
|------|--------|-------|----------|
| **存儲** | 進程內 Set | Redis 鍵值 | 資料庫表 |
| **跨進程** | ❌ | ✅ | ✅ |
| **分散式** | ❌ | ✅ | ✅ |
| **故障恢復** | ⚠️ 重啟丟失 | ✅ 保留 | ✅ 保留 |
| **長期保存** | ❌ | ⚠️ TTL 清理 | ✅ 永久 |
| **審計日誌** | ❌ | ❌ | ✅ |
| **環境** | 開發/測試 | 生產 | 生產 |

## 快速開始

### 安裝和配置

```typescript
import { DatabaseEventDeduplicator } from '@/Foundation/Infrastructure/Services/DatabaseEventDeduplicator'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'

const db: IDatabaseAccess = container.make('database')

// 建立去重器（24 小時 TTL）
const dedup = new DatabaseEventDeduplicator(db, 86400)

// 在 DI 容器註冊
container.singleton('deduplicator', () => new DatabaseEventDeduplicator(db))
```

### 基本使用

```typescript
import { v4 as uuidv4 } from 'uuid'

const eventId = uuidv4()

// 檢查是否已處理
if (!(await dedup.isProcessed(eventId))) {
  // 執行業務邏輯
  await processPayment(eventId)

  // 標記為已處理
  await dedup.markProcessed(eventId)
}

// 重試時自動跳過
if (!(await dedup.isProcessed(eventId))) {
  // 不會執行（已標記）
  await processPayment(eventId)
}
```

### 建立資料庫表

```bash
# 執行遷移
bun migrate
```

遷移文件 `database/migrations/007_create_deduplication_records_table.ts` 會建立：

```sql
CREATE TABLE deduplication_records (
  id UUID PRIMARY KEY,
  event_id VARCHAR UNIQUE NOT NULL,
  processed_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  metadata JSON,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  INDEX(expires_at)
)
```

## 詳細 API

### markProcessed(eventId: string, metadata?: Record<string, unknown>): Promise<void>

標記事件為已處理。

```typescript
const eventId = 'order-2026-001'
const metadata = { source: 'api', userId: '123', ip: '192.168.1.1' }

// 標記為已處理並儲存元數據
await dedup.markProcessed(eventId, metadata)

// 後續檢查時會返回 true
expect(await dedup.isProcessed(eventId)).toBe(true)
```

**行為**:
- 在資料庫中插入新記錄，包含 event_id、processed_at、expires_at 和元數據
- 自動設定 expires_at = now + ttlSeconds
- 處理唯一約束衝突（事件已存在時優雅降級）
- 確保 created_at 遞增，支援穩定的 DESC 排序

### isProcessed(eventId: string): Promise<boolean>

檢查事件是否已處理且未過期。

```typescript
const processed = await dedup.isProcessed(eventId)

if (!processed) {
  // 執行業務邏輯
  await handle(eventId)
  await dedup.markProcessed(eventId)
}
```

**行為**:
- 查詢資料庫尋找 event_id 記錄
- 檢查 expires_at > now（未過期）
- 資料庫連線失敗時返回 `false`（安全優先，傾向重複執行）

### remove(eventId: string): Promise<boolean>

移除事件記錄。

```typescript
const removed = await dedup.remove(eventId)

if (removed) {
  console.log('事件記錄已移除')
} else {
  console.log('事件不存在')
}
```

**返回值**: 是否成功刪除（true 如果記錄存在並被刪除）

### clear(): Promise<void>

清空所有事件記錄。

```typescript
// 緊急故障恢復
await dedup.clear()
```

**⚠️ 注意**: 會刪除所有去重記錄。

### getProcessedCount(): Promise<number>

取得未過期的已處理事件計數。

```typescript
const count = await dedup.getProcessedCount()
console.log(`已處理事件: ${count}`)
```

### listProcessedEventIds(limit?: number): Promise<string[]>

列出已處理事件 ID（最近的優先）。

```typescript
// 列出最近 100 個已處理事件
const ids = await dedup.listProcessedEventIds(100)
console.log(`最近事件 ID:`, ids)
```

**排序**: 按 created_at DESC（最新優先），id DESC（作為穩定排序）

### cleanupExpiredRecords(): Promise<number>

清理過期的事件記錄（應由 CRON Job 定期調用）。

```typescript
// 每小時清理一次
cron.schedule('0 * * * *', async () => {
  const cleaned = await dedup.cleanupExpiredRecords()
  console.log(`清理了 ${cleaned} 條過期記錄`)
})
```

**返回值**: 刪除的記錄數量

### getStats(): Promise<{total, active, expired, oldestRecord}>

取得統計資訊。

```typescript
const stats = await dedup.getStats()

console.log(`
  總記錄數: ${stats.total}
  活躍記錄: ${stats.active}
  已過期記錄: ${stats.expired}
  最舊記錄時間: ${stats.oldestRecord}
`)
```

**返回值**:
```typescript
{
  total: number              // 所有記錄（包括已過期）
  active: number             // 未過期記錄
  expired: number            // 已過期但未清理的記錄
  oldestRecord?: string      // 最舊記錄的 created_at 時間戳
}
```

## 實現細節

### 表結構

```sql
deduplication_records:
  id              UUID PRIMARY KEY
  event_id        VARCHAR UNIQUE NOT NULL  -- 業務事件 ID
  processed_at    TIMESTAMP NOT NULL      -- 處理時間
  expires_at      TIMESTAMP               -- 過期時間（TTL 基礎）
  metadata        JSON                    -- 事件上下文（源、使用者等）
  created_at      TIMESTAMP NOT NULL      -- 記錄建立時間（排序用）
  updated_at      TIMESTAMP NOT NULL      -- 記錄更新時間

  INDEX(expires_at)                       -- 用於清理查詢優化
```

### TTL 管理

```typescript
constructor(
  private db: IDatabaseAccess,
  private ttlSeconds = 86400  // 24 小時
) {}

// markProcessed 中
const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000).toISOString()
```

**TTL 計算**:
- 預設: 86400 秒（24 小時）
- 可在構造時自定義
- 自動清理需要定期呼叫 `cleanupExpiredRecords()`

### 穩定排序機制

為確保 DESC 排序時的穩定性，實現使用遞增的 timestampCounter：

```typescript
private timestampCounter = 0

async markProcessed(eventId: string, metadata?: Record<string, unknown>): Promise<void> {
  const nowMs = Date.now()
  const now = new Date(nowMs + this.timestampCounter++).toISOString()
  // ...
}
```

**優勢**:
- 快速連續插入的記錄有遞增的 created_at 值
- 確保 `listProcessedEventIds()` 返回穩定的倒序結果
- 不依賴於資料庫的隱式 ROWID

## 使用場景

### 場景 1：支付流程去重

```typescript
class PaymentProcessor {
  async processPayment(eventId: string, amount: number) {
    // 檢查是否已處理
    if (await this.dedup.isProcessed(eventId)) {
      console.log('支付已處理，跳過')
      return
    }

    try {
      // 執行支付
      const result = await this.paymentGateway.charge(amount)

      // 成功時標記為已處理（含元數據）
      await this.dedup.markProcessed(eventId, {
        source: 'payment-api',
        provider: 'stripe',
        transactionId: result.id,
      })

      return result
    } catch (error) {
      // 失敗時不標記，下次重試仍會執行
      console.error('支付失敗:', error)
      throw error
    }
  }
}
```

### 場景 2：多 Worker 協調

```typescript
class OrderEventWorker {
  async handle(event: OrderCreated) {
    // 多個 Worker 同時消費相同事件
    if (await this.dedup.isProcessed(event.id)) {
      return // 已被其他 Worker 處理
    }

    try {
      // 執行業務邏輯（建立訂單、扣庫存等）
      await this.orderService.create(event)

      // 標記為已處理（其他 Worker 也能看到）
      await this.dedup.markProcessed(event.id, {
        source: 'event-worker',
        workerId: process.env.WORKER_ID,
      })
    } catch (error) {
      // 失敗時不標記，允許重試
      throw error
    }
  }
}
```

### 場景 3：定期清理

```typescript
// 每天凌晨 2 點清理過期記錄
cron.schedule('0 2 * * *', async () => {
  try {
    const cleaned = await dedup.cleanupExpiredRecords()
    console.log(`清理完成，刪除 ${cleaned} 條記錄`)

    // 記錄統計
    const stats = await dedup.getStats()
    logger.info('去重統計', { stats })
  } catch (error) {
    logger.error('清理失敗', error)
  }
})
```

### 場景 4：審計查詢

```typescript
// 查詢最近處理的 50 個事件
const recentEvents = await dedup.listProcessedEventIds(50)

// 查詢統計資訊
const stats = await dedup.getStats()

console.log(`
  總處理事件: ${stats.total}
  活躍事件（未過期）: ${stats.active}
  最舊事件時間: ${stats.oldestRecord}
`)
```

## 故障處理

### 資料庫連線失敗時的行為

| 操作 | 失敗行為 |
|------|---------|
| `isProcessed()` | 返回 `false`（傾向重複執行） |
| `markProcessed()` | 拋出異常 |
| `remove()` | 返回 `false` |
| `getProcessedCount()` | 返回 `0` |
| `listProcessedEventIds()` | 返回 `[]` |
| `cleanupExpiredRecords()` | 返回 `0` |

### 故障恢復策略

**傾向於重複而非丟失**:
```typescript
// isProcessed 失敗時返回 false，允許重新執行
// 這比假設已處理而實際未處理要安全
```

**業務邏輯應是冪等的**:
```typescript
// ✅ 好：冪等操作
const upsertUser = async (id: string, data: UserData) => {
  await db('users').insert(data).onConflict().merge()
}

// ❌ 壞：非冪等操作
const incrementBalance = async (userId: string, amount: number) => {
  await db.raw('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId])
}
```

## 監控和調試

### 查看去重統計

```typescript
const count = await dedup.getProcessedCount()
const ids = await dedup.listProcessedEventIds(10)
const stats = await dedup.getStats()

console.log(`
  已處理事件: ${count}
  最近 10 個: ${ids.join(', ')}
  統計: ${JSON.stringify(stats)}
`)
```

### SQL 查詢檢查

```sql
-- 查看所有未過期的記錄
SELECT * FROM deduplication_records
WHERE expires_at > NOW()
ORDER BY created_at DESC;

-- 查看統計
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired
FROM deduplication_records;

-- 查看最舊記錄
SELECT MIN(created_at) as oldest FROM deduplication_records;
```

## 性能特性

### 時間複雜度

| 操作 | 複雜度 | 說明 |
|------|--------|------|
| `isProcessed()` | O(1) | 索引查詢 (INDEX on event_id) |
| `markProcessed()` | O(1) | 插入操作 |
| `remove()` | O(1) | 索引刪除 |
| `getProcessedCount()` | O(n) | 全表掃描過期檢查 |
| `listProcessedEventIds()` | O(n) | 查詢未過期記錄 |
| `cleanupExpiredRecords()` | O(n) | 掃描並刪除過期記錄 |
| `getStats()` | O(n) | 多個掃描操作 |

### 空間複雜度

假設儲存 N 個活躍記錄：

```
資料庫存儲 = N × (event_id_size + metadata_size + overhead)
```

例如：1000 個事件，平均 metadata 500 字節 = ~1MB

### 優化建議

**查詢優化**:
- 確保 `INDEX(expires_at)` 被建立（遷移已包含）
- 定期清理過期記錄以保持表大小
- 監控表大小和查詢效能

**批量操作**:
```typescript
// 批量標記（未直接支援，需循環）
for (const eventId of eventIds) {
  await dedup.markProcessed(eventId)
}
```

## 與其他系統的整合

### EventDispatcher 整合

```typescript
class UserCreatedHandler implements IEventHandler {
  async handle(event: UserCreated): Promise<void> {
    // 去重檢查
    if (await this.dedup.isProcessed(event.id)) {
      return
    }

    try {
      // 業務邏輯
      await this.userService.create(event.data)

      // 標記為已處理
      await this.dedup.markProcessed(event.id, {
        source: 'user-created-handler',
        userId: event.data.id,
      })
    } catch (error) {
      // 異常時不標記，允許重試
      throw error
    }
  }
}
```

### QueryCache（M10）整合

```typescript
const cache = new RedisQueryCache(redis)
const dedup = new DatabaseEventDeduplicator(db)

const processQuery = async (eventId: string, sql: string) => {
  // 1. 快取檢查
  const cacheKey = `query:${sql}`
  let result = await cache.get(cacheKey)

  if (!result) {
    // 2. 去重檢查
    if (await dedup.isProcessed(eventId)) {
      return null // 已處理但無快取
    }

    // 3. 執行查詢
    result = await db.query(sql)

    // 4. 快取結果
    await cache.set(cacheKey, result, 3600000)
  }

  // 5. 標記為已處理
  await dedup.markProcessed(eventId)

  return result
}
```

## 常見問題

### Q: 何時該使用 Database 版本而非 Redis？

**A**: 使用 Database 版本當：
- 需要長期保留審計日誌（>數天）
- 不想維護額外的 Redis 服務
- 資料庫已是核心基礎設施
- 需要對去重記錄進行複雜查詢

**使用 Redis 版本當**:
- 只需短期去重（分鐘級）
- 追求最高效能（Redis 更快）
- 已有 Redis 部署

### Q: 如何設定不同的 TTL？

```typescript
// 24 小時 TTL
const dedup24h = new DatabaseEventDeduplicator(db, 86400)

// 1 小時 TTL
const dedup1h = new DatabaseEventDeduplicator(db, 3600)

// 7 天 TTL
const dedup7d = new DatabaseEventDeduplicator(db, 604800)
```

### Q: 資料庫連線失敗時會怎樣？

```typescript
// isProcessed 返回 false（允許重複執行，更安全）
const isProcessed = await dedup.isProcessed(eventId) // false (連線失敗)

// markProcessed 拋出異常（上層需捕獲）
try {
  await dedup.markProcessed(eventId)
} catch (error) {
  console.error('無法標記事件為已處理:', error)
  // 決定是否重新執行或放棄
}
```

### Q: 過期記錄如何清理？

```typescript
// 方式 1：定期 CRON Job
cron.schedule('0 * * * *', async () => {
  const cleaned = await dedup.cleanupExpiredRecords()
  console.log(`清理了 ${cleaned} 條記錄`)
})

// 方式 2：資料庫觸發器（可選）
// CREATE TRIGGER auto_cleanup_dedup
// BEFORE INSERT ON deduplication_records
// FOR EACH ROW
// BEGIN
//   DELETE FROM deduplication_records WHERE expires_at < NOW();
// END;
```

### Q: 如何監控去重效果？

```typescript
// 追蹤已處理事件
const count = await dedup.getProcessedCount()

// 追蹤處理成功率
const stats = await dedup.getStats()
const successRate = (stats.active / stats.total) * 100

console.log(`
  已處理: ${count}
  成功率: ${successRate}%
  統計: ${JSON.stringify(stats)}
`)
```

## 部署建議

### 開發環境

使用 Memory 版本：

```typescript
container.singleton('deduplicator', () => new MemoryEventDeduplicator())
```

### 生產環境

使用 Database 版本：

```typescript
const db = container.make('database') as IDatabaseAccess
container.singleton('deduplicator', () => new DatabaseEventDeduplicator(db, 86400))
```

**確保**:
- ✅ 執行過遷移 (`bun migrate`)
- ✅ 配置清理 CRON Job
- ✅ 監控表大小和效能
- ✅ 定期備份資料庫

## 下一步

- [ ] 實現 Redis Cluster 支援
- [ ] 實現 DatabaseQueryCache（持久化版本）
- [ ] 實現指標導出（Prometheus）
- [ ] 實現自動清理 CRON Job 整合

---

**最後更新**: 2026-03-16 | **版本**: 1.0 | **狀態**: Production Ready
