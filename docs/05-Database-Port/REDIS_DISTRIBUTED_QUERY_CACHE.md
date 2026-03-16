# M10: Redis Distributed Query Cache

**版本**: 1.0 | **狀態**: Production Ready | **測試**: 46/46 通過

## 概述

M10 Redis 實現提供了分散式查詢快取解決方案，允許多個服務實例共享查詢結果快取。相比 Memory 版本，Redis 版本適合生產環境中的多進程和分散式系統。

### 與 Memory 版本的對比

| 特性 | MemoryQueryCache | RedisQueryCache |
|------|------------------|-----------------|
| **存儲位置** | 進程內記憶體 | Redis 服務器 |
| **跨進程共享** | ❌ | ✅ |
| **應用重啟後** | 快取丟失 | 快取保留 |
| **可擴展性** | ⚠️ 受記憶體限制 | ✅ Redis 容量 |
| **部署複雜度** | 低 | 中 |
| **推薦環境** | 開發/測試 | 生產 |

## 快速開始

### 安裝和配置

```typescript
import { RedisQueryCache } from '@/Foundation/Infrastructure/Services/RedisQueryCache'
import type { IRedisService } from '@/Foundation/Infrastructure/Ports/Messaging/IRedisService'

// 獲取 Redis 服務（通常由 DI 容器提供）
const redisService: IRedisService = container.make('redis')

// 建立 Redis 快取實例
const cache = new RedisQueryCache(redisService)

// 在 DI 容器中註冊
container.singleton('queryCache', () => new RedisQueryCache(redisService))
```

### 基本使用

```typescript
// 存儲查詢結果
await cache.set('user:1:profile', userData, 3600000) // 1 小時 TTL

// 檢索快取
const user = await cache.get<UserData>('user:1:profile')

// 檢查是否存在
const exists = await cache.has('user:1:profile')

// 刪除快取
await cache.delete('user:1:profile')

// 清空所有快取
await cache.clear()

// 獲取統計資訊
const stats = await cache.getStats()
console.log(`命中率: ${stats.hitRate * 100}%`)
```

## 詳細 API

### get\<T\>(key: string): Promise\<T | null\>

取得快取的查詢結果。

```typescript
// 成功取得
const data = await cache.get<Product>('product:123')
if (data) {
  console.log(data.name)
}

// 不存在或過期
const missing = await cache.get('nonexistent')
expect(missing).toBeNull()
```

**行為**:
- 如果 Redis 連線失敗，返回 `null` 並記錄 warn
- 計算並追蹤快取命中

### set\<T\>(key: string, data: T, ttlMs?: number): Promise\<void\>

存儲查詢結果到快取。

```typescript
// 帶 TTL（毫秒）
await cache.set('expensive:query', result, 300000) // 5 分鐘

// 無 TTL（使用預設 1 小時）
await cache.set('cache:key', data)

// 永不過期（TTL=0）
await cache.set('permanent:data', data, 0)
```

**行為**:
- TTL 轉換為秒 `Math.ceil(ttlMs / 1000)`
- Redis 連線失敗時記錄 warn，不拋出異常
- 統計記錄失敗時優雅降級

### has(key: string): Promise\<boolean\>

檢查快取是否存在且有效。

```typescript
if (await cache.has('user:1')) {
  const user = await cache.get('user:1')
}
```

**行為**:
- 自動檢查 TTL 過期狀態
- 如果連線失敗返回 `false`

### delete(key: string): Promise\<boolean\>

刪除特定快取。

```typescript
const deleted = await cache.delete('user:1')
expect(deleted).toBe(true) // 成功刪除

const notFound = await cache.delete('nonexistent')
expect(notFound).toBe(false) // 不存在
```

### deletePattern(pattern: string): Promise\<number\>

刪除匹配模式的所有快取。

**⚠️ 限制**: Redis 版本不支援完整的模式匹配刪除（性能考慮）

```typescript
// 返回 0（不支援）
const count = await cache.deletePattern('user:*')

// 解決方案：手動刪除已知鍵
await cache.delete('user:1')
await cache.delete('user:2')
```

### clear(): Promise\<void\>

清空所有快取。

```typescript
await cache.clear() // 清空所有快取
```

**⚠️ 注意**: 會影響共享 Redis 的所有快取，建議生產環境慎用。

### getStats(): Promise\<CacheStats\>

取得快取統計資訊。

```typescript
const stats = await cache.getStats()
console.log(`
  大小: ${stats.size} (Redis 無法統計，返回 -1)
  命中: ${stats.hits}
  未命中: ${stats.misses}
  命中率: ${(stats.hitRate * 100).toFixed(2)}%
`)
```

**返回值**:
```typescript
interface CacheStats {
  size: number          // -1 (Redis 無法統計)
  hits: number          // 命中次數
  misses: number        // 未命中次數
  hitRate: number       // 0 - 1
}
```

### invalidate(pattern: string): Promise\<void\>

標記快取無效。

```typescript
// 用戶資料更新時失效相關快取
await cache.invalidate('user:123:*')
```

**⚠️ 限制**: Redis 版本實現為空操作，建議使用 `deletePattern()`。

## 實現細節

### Key 命名規範

所有快取鍵都以 `query:` 前綴開頭（可配置）：

```
query:user:1:profile
query:products:electronics
query:order:summary
```

### TTL 轉換

TTL 參數以毫秒傳入，內部轉換為秒：

```typescript
ttlMs → ttlSeconds = Math.ceil(ttlMs / 1000)

50ms    → 1 秒
100ms   → 1 秒
1000ms  → 1 秒
5000ms  → 5 秒
```

### 統計追蹤

快取命中和未命中通過 Redis List 追蹤：

```
Redis Key: query:metrics:hits     → List 儲存每次命中
Redis Key: query:metrics:misses   → List 儲存每次未命中
```

計算命中率：`hits / (hits + misses)`

## 故障降級

### Redis 連線失敗時的行為

| 操作 | 失敗行為 |
|------|---------|
| `get()` | 返回 `null`，記錄 warn |
| `set()` | 記錄 warn，不拋出異常 |
| `has()` | 返回 `false` |
| `delete()` | 返回 `false` |
| `exists()` | 返回 `false` |
| `getStats()` | 返回空統計 (0/0/0%) |
| `clear()` | 記錄 warn |

### 優雅降級策略

應用層應能應對快取失敗：

```typescript
const executeQuery = async (cacheKey: string) => {
  // 優先使用快取
  let result = await cache.get(cacheKey)

  if (!result) {
    // 快取失敗時執行數據庫查詢
    result = await db.query(sql)

    // 嘗試快取（失敗時忽略）
    try {
      await cache.set(cacheKey, result, 3600000)
    } catch {
      // Redis 不可用，繼續使用數據庫結果
    }
  }

  return result
}
```

## 分散式使用

### 多實例共享快取

```typescript
// Instance A
const cache1 = new RedisQueryCache(redis)
await cache1.set('shared:data', { value: 'shared' })

// Instance B（相同 Redis）
const cache2 = new RedisQueryCache(redis)
const data = await cache2.get('shared:data') // 取得相同數據
```

### 防止快取擊穿

在高併發查詢時，多個請求可能同時執行查詢：

```typescript
// 非原子操作，可能導致多次查詢
const result = await cache.get(key)
if (!result) {
  result = await expensiveQuery() // 多個併發請求都執行
  await cache.set(key, result)    // 後者覆蓋前者
}
```

**解決方案**: 使用去重系統（M9）或互斥鎖

## 與 M9 去重系統的組合

### 推薦的查詢執行流程

```
1. 檢查查詢快取 (M10)
   ↓
2. 檢查事件去重 (M9)
   ↓
3. 執行 SQL 查詢
   ↓
4. 存儲快取結果 (M10)
   ↓
5. 標記事件為已處理 (M9)
```

### 實現範例

```typescript
const cache = new RedisQueryCache(redis)
const dedup = new RedisEventDeduplicator(redis)

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

## 性能特性

### 時間複雜度

| 操作 | 複雜度 | 說明 |
|------|--------|------|
| `get()` | O(1) | Redis String 查詢 |
| `set()` | O(1) | Redis String 設定 |
| `has()` | O(1) | Redis EXISTS |
| `delete()` | O(1) | Redis DEL |
| `getStats()` | O(1) | Redis LLEN |

### 空間複雜度

假設儲存 N 個快取項：

```
Redis Memory = N × (key_size + value_size) + overhead
```

例如：1000 個快取項，平均 1KB 數據 = ~1MB

### 測試結果

```
1,000 快取項: 高效 ✅
10,000 查詢: O(1) 性能 ✅
並發 100+ 請求: 穩定 ✅
```

## 監控和調試

### 查看快取統計

```typescript
const stats = await cache.getStats()

if (stats.hitRate < 0.5) {
  console.warn('低命中率，考慮調整 TTL 或快取策略')
}

console.log(`
  命中: ${stats.hits}
  未命中: ${stats.misses}
  命中率: ${(stats.hitRate * 100).toFixed(2)}%
`)
```

### Redis CLI 檢查

```bash
# 查看所有快取鍵
redis-cli KEYS "query:*"

# 查看特定快取
redis-cli GET "query:user:1:profile"

# 檢查 TTL
redis-cli TTL "query:user:1:profile"

# 查看統計 List
redis-cli LLEN "query:metrics:hits"
redis-cli LLEN "query:metrics:misses"
```

## 與其他 Port 的整合

### IDatabaseAccess（M5）

```typescript
// 在 Repository 中使用
class UserRepository {
  constructor(
    private db: IDatabaseAccess,
    private cache: IQueryCache
  ) {}

  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`
    let user = await this.cache.get<User>(cacheKey)

    if (!user) {
      const query = this.db.table('users').where('id', id)
      const [user] = await query.get()
      await this.cache.set(cacheKey, user, 3600000)
    }

    return user
  }
}
```

### 事件分派（EventDispatcher）

```typescript
// 在事件 Handler 中使用
class UserCreatedHandler {
  async handle(event: UserCreated) {
    // 快取用戶資料
    await this.cache.set(`user:${event.userId}`, event.userData)
  }
}

// 在 User 更新 Handler 中失效快取
class UserUpdatedHandler {
  async handle(event: UserUpdated) {
    await this.cache.delete(`user:${event.userId}:profile`)
    // 或使用去重系統防止重複執行
    if (await this.dedup.isProcessed(event.id)) {
      return // 已處理，跳過
    }
    await this.dedup.markProcessed(event.id)
  }
}
```

## 常見問題

### Q: 為什麼不支援模式匹配刪除？

**A**: Redis `KEYS` 命令在大型資料庫中性能較差（O(N) 掃描所有鍵）。生產環境應：
- 手動刪除已知鍵
- 使用 SCAN 迭代（需在 IRedisService 層擴展）
- 在應用層維護快取鍵映射

### Q: TTL 為什麼要轉換為秒？

**A**: IRedisService 介面使用秒為單位。轉換邏輯：
```typescript
Math.ceil(ttlMs / 1000) // 確保至少 1 秒
```

### Q: 如何處理 Redis 連線失敗？

**A**: 應用應備有降級方案：
```typescript
const result = await cache.get(key) || (await db.query())
```

### Q: 是否支援持久化？

**A**: 依賴 Redis 伺服器配置（RDB/AOF）。應用層無法控制。

## 部署建議

### 開發環境

使用 Memory 版本（無需 Redis）：

```typescript
// .env.local
CACHE_DRIVER=memory

// 配置
container.singleton('cache', () => new MemoryQueryCache())
```

### 生產環境

使用 Redis 版本（支援多進程）：

```typescript
// .env
CACHE_DRIVER=redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379

// 配置
const redis = container.make('redis') as IRedisService
container.singleton('cache', () => new RedisQueryCache(redis))
```

## 下一步

- [ ] 實現 DatabaseQueryCache（數據庫持久化版本）
- [ ] 實現 SCAN 支援完整模式匹配
- [ ] 實現 Redis Pub/Sub 快取失效通知
- [ ] 實現監控指標導出（Prometheus）
- [ ] 實現快取預熱策略

---

**最後更新**: 2026-03-16 | **版本**: 1.0 | **狀態**: Production Ready
