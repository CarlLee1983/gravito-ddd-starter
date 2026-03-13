# 事件驅動系統 (Event-Driven Architecture)

**版本**: v2.0 | **狀態**: ✅ 完成 | **最後更新**: 2026-03-13

## 概述

Gravito DDD 實現了完整的事件驅動架構，支持領域事件 (Domain Events) 和跨模組整合事件 (Integration Events)，具備自動重試、死信隊列和三種分發策略。

## 核心特性

- ✅ **可靠的事件分發**: 指數退避重試機制，確保事件最終被處理
- ✅ **死信隊列 (DLQ)**: 失敗事件持久化，便於審計和恢復
- ✅ **多種分發策略**: Memory (同步)、Redis (異步隊列)、RabbitMQ (AMQP)
- ✅ **完整測試覆蓋**: 363 個單元測試，26 個事件系統專項測試

## 架構圖

```
┌─────────────────────────────────────────────────────────┐
│            Domain Aggregate (聚合根)                     │
│  - 執行業務邏輯                                          │
│  - 發佈領域事件 (uncommitted events)                    │
└──────────────────┬──────────────────────────────────────┘
                   │ Repository.save()
                   ↓
┌─────────────────────────────────────────────────────────┐
│         Repository (倉儲層)                              │
│  - 收集未提交事件 (getUncommittedEvents)               │
│  - 分派事件到 EventDispatcher                           │
│  - 標記事件已提交 (markEventsAsCommitted)              │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴────────────┬──────────────┐
         ↓                      ↓              ↓
   ┌─────────────┐   ┌──────────────────┐  ┌──────────────┐
   │   Memory    │   │  Redis Queue     │  │  RabbitMQ    │
   │ (同步分發)   │   │  (異步+隊列)     │  │  (AMQP)      │
   │             │   │                  │  │              │
   │ 立即執行    │   │ SystemWorker     │  │ Consumer     │
   │ Handler     │   │ 消費隊列         │  │ 監聽隊列     │
   └─────┬───────┘   └─────────┬────────┘  └─────┬────────┘
         │                     │                  │
         └─────────────────────┼──────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Event Handlers      │
                    │                      │
                    │ - 業務邏輯執行       │
                    │ - 副作用處理         │
                    │ - 跨模組訊息         │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                ↓              ↓              ↓
            ✅ Success   ❌ Failure    🔄 Retry
                              │
                    ┌─────────┴──────────┐
                    ↓                    ↓
            🔄 Exponential      📋 Dead Letter
               Backoff             Queue (DLQ)
               Retry
```

## 三層事件系統架構 (H1-H5)

### H1: Repository 介面定義 ✅

所有模組的 Repository 都實現統一的 `IRepository` 基類和模組特定的介面：

```typescript
// 基類介面 (Domain/Repositories/IRepository.ts)
export interface IRepository<T> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<void>
  delete(id: string): Promise<void>
}

// 模組特定介面 (Post/Domain/Repositories/IPostRepository.ts)
export interface IPostRepository extends IRepository<Post> {
  findByTitle(title: Title): Promise<Post | null>
  findByAuthor(authorId: string): Promise<Post[]>
}

// 實現類 (Post/Infrastructure/Repositories/PostRepository.ts)
export class PostRepository
  extends BaseEventSourcedRepository<Post>
  implements IPostRepository {
  // 業務特定方法實現
}
```

**驗證清單**:
- ✅ 所有 Repository 都實現相應介面
- ✅ 基類提供統一的事件分派邏輯
- ✅ 支援 ORM 無關的設計

### H3: 事件失敗策略 ✅

統一的重試和失敗處理機制，支援指數退避和死信隊列：

```typescript
// EventFailurePolicy.ts
export interface RetryPolicy {
  maxRetries: number        // 最大重試次數 (default: 4)
  initialDelay: number      // 初始延遲 (default: 1000ms)
  backoffMultiplier: number // 延遲倍數 (default: 2)
  maxDelay: number          // 最大延遲 (default: 30000ms)
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 4,
  initialDelay: 1000,     // 1s
  backoffMultiplier: 2,
  maxDelay: 30000,        // 30s
}

// 延遲計算範例
calculateDelay(attempt, policy):
// 尝试1: 0ms (无延迟)
// 尝试2: 1000ms × 2^0 = 1000ms
// 尝试3: 1000ms × 2^1 = 2000ms
// 尝试4: 1000ms × 2^2 = 4000ms
// 尝试5: 1000ms × 2^3 = 8000ms
// 尝试6: 1000ms × 2^4 = 16000ms (未超 30s)
// 尝试7: 1000ms × 2^5 = 32000ms → 限制為 30000ms
```

**重試判斷邏輯**:
- ✅ 可重試錯誤: `timeout`, `ECONNREFUSED`, `ECONNRESET`, `temporarily unavailable`
- ❌ 不可重試: 驗證錯誤、業務規則違反、程式碼錯誤

### H4: 事件分發器統一 ✅

三種分發器共享統一的基類，確保一致的重試和失敗處理：

```typescript
// BaseEventDispatcher.ts - 所有分發器的基類
export abstract class BaseEventDispatcher implements IEventDispatcher {
  protected handlers: Map<string, EventHandler[]>
  protected retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY
  protected deadLetterQueue?: IDeadLetterQueue

  // 統一的 Handler 執行邏輯（包含重試）
  protected async executeHandlers(eventName: string, eventData: any)

  // 統一的單個 Handler 重試邏輯
  private async executeHandlerWithRetry(...)
}
```

**三種分發策略**:

#### 1. MemoryEventDispatcher (同步分發)
```typescript
// 特點: 立即同步執行，適合開發/測試
dispatcher.subscribe('UserCreated', async (event) => {
  console.log('Handler 立即執行')
})

await dispatcher.dispatch(new UserCreatedEvent(...))
// 立即執行，無隊列延遲
```

#### 2. RedisEventDispatcher (異步隊列)
```typescript
// 特點: 事件推入 Redis 列表，由 SystemWorker 消費
dispatcher.subscribe('UserCreated', handler)
await dispatcher.dispatch(event)  // 立即返回
// SystemWorker 稍後消費並執行 Handler
```

#### 3. RabbitMQEventDispatcher (AMQP)
```typescript
// 特點: 事件發佈到 RabbitMQ topic exchange，由 Consumer 消費
dispatcher.subscribe('UserCreated', handler)
await dispatcher.dispatch(event)  // 立即返回
// RabbitMQ Consumer 消費並執行 Handler
```

### H5: 失敗處理和死信隊列 ✅

完整的失敗事件追蹤和恢復機制：

```typescript
// DeadLetterQueue.ts
export interface IDeadLetterQueue {
  add(entry: DeadLetterEntry): Promise<void>
  list(eventName?: string): Promise<DeadLetterEntry[]>
  get(id: string): Promise<DeadLetterEntry | null>
  clear(): Promise<void>
  stats(): Promise<DLQStats>
}

// 失敗事件結構
export interface DeadLetterEntry {
  id: string                    // 唯一識別碼
  eventName: string            // 事件名稱
  eventData: Record<string, any> // 事件內容
  error: string                // 錯誤信息
  attempts: number             // 嘗試次數
  failedAt: string            // 失敗時間 (ISO)
  retryable: boolean          // 是否可重試
  reason: string              // 失敗原因詳情
}
```

**DLQ 實現**:
- `MemoryDeadLetterQueue`: 開發/測試用，內存存儲
- `RedisDeadLetterQueue`: 生產環境，Redis 存儲，7 天自動過期

## 事件流程示例

### 完整端到端流程

```typescript
// 1️⃣ 領域層：發佈事件
export class User extends AggregateRoot {
  static create(id: string, name: UserName): User {
    const user = new User(id, name)
    user.addEvent(new UserCreatedEvent(id, name.value))
    return user
  }
}

// 2️⃣ Repository：分派事件
export class UserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    // 保存聚合根
    await this.db.table('users').insert(...)

    // 分派未提交的事件
    const events = user.getUncommittedEvents()
    for (const event of events) {
      await this.eventDispatcher.dispatch(event)
    }

    // 標記已提交
    user.markEventsAsCommitted()
  }
}

// 3️⃣ Handler：訂閱和處理事件
export class SendWelcomeEmailHandler {
  async handle(event: UserCreatedEvent): Promise<void> {
    const { userId, userName } = event
    // 發送歡迎郵件...
  }
}

// 4️⃣ 註冊 Handler
dispatcher.subscribe('UserCreated', new SendWelcomeEmailHandler().handle)

// 5️⃣ 完整使用
const user = User.create('user-1', new UserName('Alice'))
await userRepository.save(user)
// → UserCreatedEvent 被自動分派
// → Handler 執行並發送歡迎郵件
```

### 失敗和重試示例

```typescript
const handler = async (event) => {
  if (Math.random() < 0.5) {
    throw new Error('Network timeout')  // 可重試
  }
  console.log('成功')
}

dispatcher.subscribe('UserCreated', handler)
dispatcher.setRetryPolicy({
  maxRetries: 4,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000
})
dispatcher.setDeadLetterQueue(dlq)

await dispatcher.dispatch(event)

// 執行流程：
// 嘗試1: 隨機失敗「Network timeout」
//   → shouldRetry(error, 1, 4) → true
//   → sleep(0ms) → 重試
// 嘗試2: 隨機成功
//   → return ✅
//
// 如果全部失敗 (4 次):
// 嘗試4: 失敗
//   → shouldRetry(error, 4, 4) → false
//   → 記錄到 DLQ
//   → throw Error
```

## 跨模組事件通訊

### 防腐層 (Anti-Corruption Layer, ACL)

Repository 將領域事件轉換為整合事件，實現 Bounded Context 邊界：

```typescript
export class PostRepository extends BaseEventSourcedRepository<Post> {
  protected toIntegrationEvent(event: DomainEvent): IntegrationEvent | null {
    // 領域事件 → 整合事件
    if (event instanceof PostCreated) {
      return toIntegrationEvent(
        'PostCreated',
        'Post',  // sourceContext
        {
          postId: event.postId,
          title: event.title,
          content: event.content,
          authorId: event.authorId,
          createdAt: event.createdAt.toISOString(),
        },
        event.postId  // aggregateId
      )
    }
    return null
  }
}

// User 模組訂閱 Post 模組的整合事件
dispatcher.subscribe('PostCreated', async (event) => {
  // 在 User 模組中響應
  // 例如：更新用戶的文章計數
})
```

## 性能最佳實踐

### 1. 選擇正確的分發器

| 分發器 | 同步 | 可靠性 | 延遲 | 適用場景 |
|-------|------|-------|------|---------|
| Memory | ✅ | 低 | <1ms | 開發、測試 |
| Redis | ❌ | 中 | <1s | 中等規模系統 |
| RabbitMQ | ❌ | 高 | <2s | 關鍵業務流程 |

### 2. 優化 Handler 執行

```typescript
// ❌ 不要在 Handler 中進行長時間操作
dispatcher.subscribe('UserCreated', async (event) => {
  // ❌ 同步發送大量郵件
  for (let i = 0; i < 1000; i++) {
    await sendEmail(...)  // 會阻塞其他 Handler
  }
})

// ✅ 推遲重操作到後台任務隊列
dispatcher.subscribe('UserCreated', async (event) => {
  // ✅ 只是推入任務隊列
  await jobQueue.enqueue('send-batch-emails', { userId: event.userId })
})
```

### 3. 死信隊列監控

```typescript
// 定期檢查 DLQ 統計
const stats = await dlq.stats()
console.log(`DLQ 中有 ${stats.total} 個失敗事件`)
console.log(`按事件類型分布:`, stats.byEventName)

// 恢復失敗事件
const entries = await dlq.list('UserCreated')
for (const entry of entries) {
  // 檢查是否可恢復
  if (entry.retryable) {
    // 手動重新分派
    await dispatcher.dispatch(entry.eventData)
  }
}
```

## 測試指南

### 單位測試

```typescript
it('應在所有重試失敗後將事件寫入死信隊列', async () => {
  const handler = vi.fn().mockRejectedValue(
    new Error('Network timeout')
  )

  dispatcher.subscribe('TestEvent', handler)
  dispatcher.setRetryPolicy({
    maxRetries: 3,
    initialDelay: 10,
    // ...
  })

  await dispatcher.dispatch(new TestEvent())

  // 驗證重試
  expect(handler).toHaveBeenCalledTimes(3)

  // 驗證 DLQ 記錄
  const entries = await dlq.list()
  expect(entries).toHaveLength(1)
  expect(entries[0].attempts).toBe(3)
})
```

### 集成測試

```typescript
it('應能跨模組分發事件', async () => {
  // 1. User 模組建立用戶
  const user = await userService.createUser('Alice')

  // 2. 驗證 UserCreated 事件被分派
  expect(eventDispatcher.dispatch).toHaveBeenCalled()

  // 3. Post 模組的 Handler 應被執行
  const userCreatedHandler = jest.fn()
  dispatcher.subscribe('UserCreated', userCreatedHandler)

  // 4. 重新分派事件
  await dispatcher.dispatch(userCreatedEvent)

  // 5. 驗證 Handler 執行
  expect(userCreatedHandler).toHaveBeenCalledWith(
    expect.objectContaining({ userId: user.id })
  )
})
```

## 故障排除

### Handler 沒有被執行

**檢查清單**:
1. 事件名稱是否正確? `dispatcher.subscribe('UserCreated', ...)` vs `UserCreatedEvent`
2. 是否使用了正確的分發器? (Memory 同步 vs Redis 異步)
3. Handler 是否有訂閱? `dispatcher.subscribe()` 是否被呼叫?
4. 事件是否真的被分派? `await dispatcher.dispatch(event)`

### 事件重試不工作

**檢查清單**:
1. 錯誤是否可重試? 只有特定錯誤信息會觸發重試
2. 是否設置了重試策略? `dispatcher.setRetryPolicy(...)`
3. `maxRetries` 值是否足夠?

### DLQ 沒有記錄失敗

**檢查清單**:
1. 是否設置了 DLQ? `dispatcher.setDeadLetterQueue(dlq)`
2. Handler 失敗次數是否達到 `maxRetries`?
3. 失敗是否是「不可重試」錯誤 (會立即拋出)?

## 進階配置

### 自訂重試策略

```typescript
const aggressiveRetry: RetryPolicy = {
  maxRetries: 10,      // 更多重試機會
  initialDelay: 100,   // 更短的初始延遲
  backoffMultiplier: 1.5, // 更緩和的指數增長
  maxDelay: 60000,     // 最多 1 分鐘
}

dispatcher.setRetryPolicy(aggressiveRetry)
```

### 自訂死信隊列實現

```typescript
export class CustomDLQ implements IDeadLetterQueue {
  async add(entry: Omit<DeadLetterEntry, 'id'>): Promise<void> {
    // 存儲到數據庫、發送警報等...
    await database.insert('dead_letter_queue', entry)
    await alertService.notifyFailedEvent(entry)
  }
  // ... 其他方法實現
}

dispatcher.setDeadLetterQueue(new CustomDLQ())
```

## 總結

完整的事件驅動系統，支援：
- ✅ 統一的重試和失敗處理 (H3-H4)
- ✅ 三種分發策略適應不同場景
- ✅ 完整的死信隊列審計
- ✅ 跨模組事件通訊
- ✅ 363 個單元測試驗證

**建議開始**: 閱讀 [模組開發指南](./DEVELOPMENT_GUIDE.md) 了解如何在新模組中使用事件系統。
