# Outbox Pattern 架構設計文檔

**日期**: 2026-03-18
**版本**: 1.0
**狀態**: ✅ 架構設計完成
**實施階段**: A1（Phase A）

---

## 概述

Outbox Pattern 是確保「應用層狀態改變 + 事件發佈」原子性的經典模式。通過在同一筆 Transaction 內寫入聚合根 + Outbox 記錄，並由後台 Worker 異步分派事件，確保：

- ✅ 事件不會遺失（即使事件分派失敗）
- ✅ 事件不會重複（Worker 通過冪等性 ID 防重）
- ✅ 最終一致性（worker 保證事件最終被分派）

---

## 現有問題分析

### 當前 Event Sourcing 流程

```typescript
async save(entity: T): Promise<void> {
  // 事務內：DB 寫入 + Event Store
  await this.db.transaction(async (trx) => {
    await trx.table(...).update(...)
    await this.persistEventsToStore(entity)
  })

  // 事務外：事件分派 ⚠️ 危險區
  if (this.eventDispatcher) {
    await this.dispatchEvents(entity)  // ← 若崩潰，事件遺失！
  }
}
```

### 問題

| 場景 | 結果 |
|------|------|
| DB 寫入成功，事件分派成功 | ✅ 完美 |
| DB 寫入失敗 | ✅ 事務回滾，沒有副作用 |
| DB 寫入成功，事件分派失敗 | ❌ **事件遺失！** |
| DB 寫入成功，分派中崩潰 | ❌ **事件遺失！** |

---

## Outbox Pattern 解決方案

### 改進流程

```typescript
async save(entity: T): Promise<void> {
  // 事務內：DB 寫入 + Outbox 項目
  await this.db.transaction(async (trx) => {
    // 1. 樂觀鎖檢查 + 版本更新
    await trx.table(tableName).update(...)

    // 2. 事件存儲
    if (this.eventStore) {
      await this.persistEventsToStore(entity)
    }

    // 3. 寫入 Outbox（同一事務 ✨）
    const outboxEntries = entity.getUncommittedEvents()
      .map(event => OutboxEntry.createNew(...))
    await outboxRepository.saveBatch(outboxEntries)
  })

  // 事務外：Worker 異步處理
  // 若程序崩潰，下次啟動時 Worker 會恢復
}
```

### 關鍵改進

| 改進項 | 說明 |
|--------|------|
| **原子性** | DB + Outbox 在同一 Transaction，失敗全部回滾 |
| **可靠性** | 事件分派失敗不影響 DB，Worker 可重試 |
| **可觀測** | 可查詢 Outbox 狀態，知道哪些事件待分派 |
| **重試機制** | 失敗項目自動重試，超限進入 Dead Letter Queue |

---

## 核心設計

### 1. OutboxEntry 聚合根

**位置**: `app/Foundation/Domain/Aggregates/OutboxEntry.ts`

**責任**: 代表待分派的單個事件記錄

**關鍵屬性**:
```typescript
{
  id: string              // UUID
  eventId: string         // 來自事件本身（用於冪等性）
  aggregateId: string     // 聚合根 ID（用於追蹤）
  aggregateType: string   // 'Order' | 'Payment' | 'User'
  eventType: string       // 'OrderPlaced' | 'PaymentSucceeded'
  payload: IntegrationEvent
  createdAt: Date
  processedAt?: Date      // null = 未處理
  status: 'pending' | 'processed' | 'failed'
  retryCount: number
  lastError?: string
  version: number         // 樂觀鎖
}
```

**核心方法** (返回新實例，保持不可變):
- `markAsProcessed()` - 標記為已處理
- `markAsFailed(error)` - 標記為失敗，retryCount +1
- `resetForRetry()` - 重置為待處理
- `shouldMoveToDeadLetterQueue(maxRetries)` - 判斷是否應進入 DLQ

### 2. IOutboxRepository Port

**位置**: `app/Foundation/Domain/Repositories/IOutboxRepository.ts`

**層級**: Domain Port（在 Domain 層定義）

**關鍵方法**:
```typescript
interface IOutboxRepository {
  // 持久化
  save(entry: OutboxEntry): Promise<void>
  findById(id: string): Promise<OutboxEntry | null>

  // Worker 查詢
  findUnprocessed(limit?: number): Promise<OutboxEntry[]>
  findFailed(limit?: number): Promise<OutboxEntry[]>
  findByDeadLetterQueue(maxRetries?: number): Promise<OutboxEntry[]>

  // 監控
  countUnprocessed(): Promise<number>
  countFailed(): Promise<number>
  getStats(): Promise<Stats>

  // 清理
  deleteProcessed(olderThan?: Date): Promise<number>
  delete(id: string): Promise<void>
}
```

### 3. IOutboxWorker Port

**位置**: `app/Foundation/Application/Ports/IOutboxWorker.ts`

**層級**: Application Port（在 Application 層定義）

**責任**: 非同步處理 Outbox 隊列

**核心方法**:
```typescript
interface IOutboxWorker {
  start(): Promise<void>                      // 啟動後台任務
  stop(): Promise<void>                       // 停止運行
  processNextBatch(batchSize?: number): Promise<number>
  retryFailed(maxRetries?: number): Promise<number>
  moveToDeadLetterQueue(maxRetries?: number): Promise<number>
  getMetrics(): Promise<OutboxWorkerMetrics>
  isRunning(): boolean
}
```

---

## 集成策略

### Phase 1：修改 BaseEventSourcedRepository.save()

在 `save()` 方法中：
1. 事務內：保存聚合根 + Outbox 記錄
2. 事務外：由 Worker 負責事件分派

**偽代碼**:
```typescript
async save(entity: T): Promise<void> {
  await this.db.transaction(async (trx) => {
    // 1. 樂觀鎖檢查與更新
    const beforeUpdate = await trx.table(...).where(...)
    if (!beforeUpdate) throw new OptimisticLockException(...)
    await trx.table(...).update(...)

    // 2. Event Store
    if (this.eventStore) {
      await this.persistEventsToStore(entity)
    }

    // 3. 寫入 Outbox ✨
    const events = entity.getUncommittedEvents()
    for (const event of events) {
      const entry = OutboxEntry.createNew(...)
      await outboxRepository.save(entry)  // 同一事務
    }
  })

  // ❌ 不再直接分派事件！
  // entity.markEventsAsCommitted()
}
```

### Phase 2：啟動 OutboxWorker

在 `ModuleAutoWirer` 或應用啟動流程中：
```typescript
const worker = container.make<IOutboxWorker>('outboxWorker')
await worker.start()  // 啟動後台定期掃描

// 應用關閉時：
await worker.stop()
```

**Worker 定期任務**:
```
每 2 秒：
  ├─ processNextBatch(50)        // 處理 50 個待處理項目
  └─ retryFailed(3, 20)          // 重試失敗項目（最多 3 次）

每 1 分鐘：
  └─ moveToDeadLetterQueue(3)    // 移至 DLQ

每 1 小時：
  ├─ deleteProcessed(7天前)       // 清理過期項目
  └─ 重設指標計數器
```

### Phase 3：防重機制（冪等性）

Outbox 防重依賴 **eventId**：
- 每個 DomainEvent 都有唯一的 `eventId`
- OutboxEntry 記錄該 `eventId`
- Worker 分派前檢查 `eventId` 是否已分派過

**實現**:
```typescript
// Worker 分派時
const storedEventIds = new Set(await repository.getProcessedEventIds())
for (const entry of entries) {
  if (storedEventIds.has(entry.eventId)) {
    // 已分派過，跳過
    continue
  }
  await this.eventDispatcher.dispatch(entry.payload)
  await repository.markAsProcessed(entry.id)
}
```

---

## Dead Letter Queue (DLQ) 流程

**觸發條件**: `retryCount > maxRetries`（預設 3）

**DLQ 項目特徵**:
- 分派失敗超過 3 次
- 存儲在 Outbox 表中（可通過狀態篩選）
- 需要人工檢查與處理

**處理流程**:
```
1. 監控系統發現 DLQ 項目 (countFailed() > threshold)
2. 發送告警通知運維
3. 運維檢查錯誤信息（lastError）
4. 診斷問題（例如下游服務宕機）
5. 修復問題後手動重試或刪除
```

**查詢 DLQ**:
```typescript
const dlqEntries = await outboxRepository.findByDeadLetterQueue(3)
console.log(`DLQ 中有 ${dlqEntries.length} 個項目`)
for (const entry of dlqEntries) {
  console.log(`- EventId: ${entry.eventId}, Error: ${entry.lastError}`)
}
```

---

## 實施清單

### A1.2：OutboxEntry 聚合根實現
- [ ] 不可變設計確認
- [ ] Domain 事件（OutboxEntryCreated 等）
- [ ] 單元測試（狀態轉移、防重）

### A1.3：Repository 實現
- [ ] MemoryOutboxRepository（含樂觀鎖）
- [ ] AtlasOutboxRepository（DDL + ORM）
- [ ] DrizzleOutboxRepository（Schema + ORM）

### A1.4：OutboxWorker 實現
- [ ] SequentialOutboxWorker（定期掃描）
- [ ] 修改 BaseEventSourcedRepository.save()
- [ ] 集成至 ModuleAutoWirer

### A1.5：完整測試
- [ ] OutboxEntry 單元測試 (4+)
- [ ] Repository 集成測試 (8+)
- [ ] Worker 集成測試 (6+)

---

## 性能指標

| 指標 | 目標 | 說明 |
|------|------|------|
| **處理延遲** | < 5 秒 | Worker 2 秒掃描一次，加上分派時間 |
| **吞吐量** | 100+ 事件/秒 | 取決於事件分派器實現 |
| **失敗率** | < 0.1% | 假設下游服務穩定 |
| **恢復時間** | < 1 分鐘 | 失敗重試應在 1 分鐘內恢復 |

---

## 與現有系統集成

### EventStore 兼容性

Outbox + EventStore 可同時使用：
- **EventStore**: 事件溯源，用於重構聚合根狀態
- **Outbox**: 事件分派，確保下游系統收到通知

```typescript
await db.transaction(async (trx) => {
  // 1. 聚合根狀態更新
  await trx.table('users').update(...)

  // 2. EventStore（歷史記錄）
  await eventStore.append([storedEvents])

  // 3. Outbox（待分派）
  await outboxRepository.saveBatch([outboxEntries])
})
```

### 與 IntegrationEvent 的關係

- **Outbox.payload**: 包含完整的 IntegrationEvent
- **Outbox.eventId**: 來自 IntegrationEvent.eventId
- **防重**: 基於 eventId 的冪等性檢查

---

## 架構圖

```
┌──────────────────────────────┐
│   Application Layer          │
│  (Repository.save())         │
└──────────────┬───────────────┘
               │
               ▼
        ┌──────────────┐
        │ Transaction  │
        │   Begin      │
        └──────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
   ┌────────┐      ┌──────────┐
   │  User  │      │ Outbox   │  ← 新增
   │ Table  │      │  Table   │
   └────────┘      └──────────┘
       │                │
       └───────┬────────┘
               │
               ▼
        ┌──────────────┐
        │ Transaction  │
        │   Commit     │
        └──────────────┘
               │
               ▼
    ┌────────────────────┐
    │  OutboxWorker      │
    │  (Background)      │  ← 非同步
    │                    │
    │ 1. Poll Outbox     │
    │ 2. Dispatch        │
    │ 3. Mark processed  │
    └────────────────────┘
```

---

## 參考資料

- **Transactional Outbox Pattern**: https://microservices.io/patterns/data/transactional-outbox.html
- **Event Sourcing**: https://martinfowler.com/eaaDev/EventSourcing.html
- **Saga Pattern vs Outbox**: 兩者常配合使用

---

**更新於**: 2026-03-18
**下一步**: A1.2 實現 OutboxEntry + 聚合根
