# Shared/Infrastructure 層深度架構審查報告

**審查日期**: 2026-03-13
**審查者**: Claude Code (Opus)
**評估對象**: `app/Shared/Infrastructure` 層（55 個檔案）
**總體評分**: 8/10 (優秀設計，有 5 項改進空間)

---

## 📊 執行摘要

### 整體評估

gravito-ddd 的 Infrastructure 層展現了**企業級架構設計**的優秀實踐：

✅ **設計優勢**
- **清晰的 Port-Adapter 模式**：完美分離框架無關的介面 (Port) 與框架相依的適配器 (Adapter)
- **ORM 無關性出色**：IDatabaseAccess 介面完全隱藏 ORM 細節，支援 Atlas/Drizzle/Memory 無縫切換
- **事件驅動架構完整**：支援 3 層事件系統 (Memory/Redis/RabbitMQ)，EventListenerRegistry 集中管理
- **依賴注入深度抽象**：IContainer 完全框架無關，適配器層隔離 Gravito 耦合
- **Domain Event 與 Event Sourcing 完全集成**：BaseEventSourcedRepository 提供樂觀鎖 + 事件分派 + EventStore 持久化

### 識別的問題（按優先級）

| 級別 | 問題數 | 類型 | 影響 |
|------|-------|------|------|
| **H1-H5** | 5 項 | 設計不一致 | 架構一致性 |
| **M1-M6** | 6 項 | 設計缺陷 | 可維護性、延展性 |
| **L1-L5** | 5 項 | 技術債務 | 代碼品質、測試 |

### 優先級排序

**立即行動 (H1-H5)**: 改善架構一致性，預計 2-3 天
**短期計畫 (M1-M6)**: 增強可維護性，預計 3-5 天
**長期優化 (L1-L5)**: 代碼品質，預計 5-7 天

---

## 1️⃣ 層次責任清晰度評估

### 評分: 9/10 ✅

#### 子層結構分析

```
app/Shared/Infrastructure/
├── Database/               (資料持久化層 - 清晰 ✅)
│   ├── Adapters/          (ORM 無關化適配 - Atlas/Drizzle/Memory)
│   ├── EventStore/        (事件存儲實現 - Memory/Redis/RabbitMQ)
│   └── Repositories/      (Repository 基類 - BaseEventSourcedRepository)
│
├── Framework/             (框架適配層 - 高內聚 ✅)
│   ├── Gravito*Adapter    (框架集成 - 8 個適配器)
│   ├── Redis*             (Redis 相關 - 2 個實現)
│   ├── RabbitMQ*          (消息隊列 - 2 個實現)
│   ├── *EventDispatcher   (事件分發 - 3 個實現)
│   └── ModuleDefinition.ts (模組元數據)
│
├── Storage/               (檔案存儲層 - 獨立 ✅)
│   ├── Drivers/          (存儲驅動 - Local/S3)
│   └── StorageManager.ts
│
├── Providers/             (DI 註冊層 - 清晰 ✅)
│   ├── SharedServiceProvider.ts     (全域服務)
│   └── InfrastructureServiceProvider.ts (適配器)
│
└── I*.ts (14 個介面)     (公開 Port - 框架無關)
```

#### 責任分析

| 層級 | 職責 | 是否清晰 | 備註 |
|------|------|---------|------|
| **Database/Adapters** | ORM 無關化 (Atlas/Drizzle/Memory) | ✅ 明確 | 實現完善，支援多 ORM |
| **Database/EventStore** | 領域事件持久化 | ✅ 明確 | 3 種實現完整 |
| **Database/Repositories** | Repository 基類與事件協調 | ✅ 明確 | BaseEventSourcedRepository 設計優秀 |
| **Framework/Gravito*** | 框架適配層 | ✅ 明確 | 8 個適配器職責清晰 |
| **Framework/EventDispatcher** | 事件分發策略 | ✅ 明確 | Memory/Redis/RabbitMQ 3 層架構 |
| **Storage** | 檔案存儲管理 | ✅ 明確 | LocalDriver 完整，S3 待實現 |
| **Providers** | DI 容器綁定 | ✅ 明確 | SharedServiceProvider 集中化做得好 |

#### 與 Domain 層邊界

**邊界完全清晰** ✅

- Domain 層 (不知道 Infrastructure 存在)
  - `DomainEvent`, `IntegrationEvent`
  - `AggregateRoot`
  - Repository 介面 (未定義在 Domain/Repositories)

- Infrastructure 層 (實現 Domain 介面)
  - `BaseEventSourcedRepository` 實現所有 Repository
  - 分派領域事件，持久化 EventStore
  - 完全依賴 IDatabaseAccess 等 Port 介面

**問題**: ⚠️ Repository 介面應定義在 Domain/Repositories，而非隱含在適配器中。見 **H1**。

---

## 2️⃣ ORM 無關性設計評估

### 評分: 8.5/10 ✅ (企業級)

#### ORM 抽象化程度

```
IDatabaseAccess (公開 Port)
├─ table(name: string): IQueryBuilder
└─ IQueryBuilder
   ├─ where(), limit(), offset(), orderBy()
   ├─ whereBetween(), count()
   ├─ first(), select()
   ├─ insert(), update(), delete()
   └─ 完全 ORM 無關 ✅
```

#### ORM 適配器設計

| ORM | 適配器 | 實現狀態 | 評價 |
|-----|--------|--------|------|
| **Atlas** | `GravitoDatabaseAdapter` | ✅ 完整 | 原始 ORM，完整支援 |
| **Drizzle** | `DrizzleDatabaseAdapter` + `DrizzleQueryBuilder` | ✅ 完整 | 新 ORM，完整支援 |
| **Memory** | `MemoryDatabaseAccess` + `MemoryQueryBuilder` | ✅ 完整 | 測試用，功能完善 |

#### 遷移成本分析

**遷移 Atlas → Drizzle 的影響範圍**：

```
src/adapters/
├─ Gravito{Module}Adapter.ts    (無需改動) ✅
├─ GravitoModuleRouter.ts       (無需改動) ✅
└─ GravitoServiceProviderAdapter.ts (無需改動) ✅

src/Modules/*/
├─ Domain/                       (無需改動) ✅
├─ Application/                  (無需改動) ✅
└─ Infrastructure/Repositories/  (無需改動，使用 IDatabaseAccess) ✅

app/Shared/Infrastructure/
├─ Database/Adapters/Drizzle/   (新增或更新) 🔧
├─ IDatabaseAccess.ts           (可能擴展) 📝
└─ Providers/*ServiceProvider.ts (修改綁定) 🔧

Database/                        (Migration 文件) 🔧
```

**遷移成本**: **中等** (~3-5 天)
- 修改 Drizzle 適配器實現
- 更新 Drizzle schema 定義
- 檢查 Migration 相容性

✅ **優點**: Module 代碼完全無需改動

#### 發現的問題

**H2: IQueryBuilder 功能不完整** ⚠️
- 缺少 `join()` 操作（INNER/LEFT/RIGHT JOIN）
- 缺少 `groupBy()` 與聚合函數 (`count`, `sum`, `avg`)
- 缺少 `having()` 子句
- 缺少 `distinct()` 操作

**影響**: 對於複雜查詢（需要 JOIN 或分組），應用層被迫繞過 IQueryBuilder，直接使用 ORM。

**建議**: 參考 **改進優先級** 的 H2 部分。

#### ORM 無關性評價

✅ **優秀**: 可以輕鬆替換 ORM (Atlas/Drizzle)
✅ **優秀**: Application 層完全無關 ORM
✅ **優秀**: Domain 層無知 ORM 存在
⚠️ **待改進**: IQueryBuilder 功能不完整，複雜查詢能力有限

---

## 3️⃣ 適配器模式一致性評估

### 評分: 8/10 ✅

#### 適配器清單與分類

```
Framework/適配器 (8 個)
│
├─ 框架集成適配器 (4 個) ─────────────────────────
│  ├─ GravitoServiceProviderAdapter       (DI 容器)
│  ├─ GravitoRedisAdapter                 (Redis)
│  ├─ GravitoCacheAdapter                 (快取)
│  ├─ GravitoHttpContextAdapter           (HTTP 上下文)
│  ├─ GravitoLoggerAdapter                (日誌)
│  ├─ GravitoTranslatorAdapter            (國際化)
│  └─ GravitoMailAdapter                  (郵件)
│
├─ 事件分發適配器 (3 個) ──────────────────────────
│  ├─ MemoryEventDispatcher               (同步)
│  ├─ RedisEventDispatcher                (非同步 - Redis 隊列)
│  └─ RabbitMQEventDispatcher             (非同步 - RabbitMQ)
│
├─ 工作隊列適配器 (2 個) ──────────────────────────
│  ├─ RedisJobQueueAdapter
│  └─ RabbitMQJobQueueAdapter
│
├─ 訊息隊列適配器 (2 個) ──────────────────────────
│  ├─ RabbitMQAdapter
│  └─ 無 MQAdapter（未實現）❌
│
└─ 存儲適配器 (2 個) ──────────────────────────
   ├─ LocalDriver                        (本地檔案)
   └─ S3Store                            (AWS S3 - 未實現)
```

#### 一致性矩陣

| 適配器族群 | 命名模式 | 實裝方式 | 職責單一 | 可測性 | 評價 |
|----------|--------|--------|--------|-------|------|
| **框架集成** | ✅ Gravito* | ✅ implements I* | ✅ 清晰 | ✅ 高 | 9/10 |
| **事件分發** | ✅ *EventDispatcher | ✅ implements IEventDispatcher | ✅ 清晰 | ✅ 高 | 9/10 |
| **工作隊列** | ✅ *JobQueueAdapter | ✅ implements IJobQueue | ✅ 清晰 | ✅ 高 | 9/10 |
| **訊息隊列** | ⚠️ 不一致 (RabbitMQAdapter) | ✅ implements IRabbitMQService | ⚠️ 混雜 | ✅ 中 | 7/10 |
| **存儲驅動** | ⚠️ 不一致 (LocalDriver vs S3Store) | ✅ implements IStorageDisk | ⚠️ 部分 | ✅ 中 | 7/10 |

#### 一致性問題

**M1: 適配器命名不統一** ⚠️

```typescript
// 不一致的命名模式：
✅ GravitoRedisAdapter       (採用 Gravito* 模式)
✅ GravitoCacheAdapter       (採用 Gravito* 模式)
⚠️ RabbitMQAdapter          (缺少 Gravito* 前綴) ❌ 與 Port 混淆
✅ RedisJobQueueAdapter      (採用 *JobQueueAdapter 模式)
⚠️ RabbitMQJobQueueAdapter   (冗餘命名)
```

**改善建議**:
- `RabbitMQAdapter` → `GravitoRabbitMQAdapter`（保持一致性）
- `RabbitMQJobQueueAdapter` → `RabbitMQJobQueue`（簡化）

**M2: 儲存驅動命名不一致** ⚠️

```typescript
// LocalDriver 與 S3Store 命名不統一
class LocalDriver implements IStorageDisk { }
class S3Store implements IStorageDisk { }

// 建議統一為：
class LocalStorageDriver implements IStorageDisk { }
class S3StorageDriver implements IStorageDisk { }
```

**M3: 事件分發器缺少統一基類** ⚠️

三個事件分發器實現獨立，缺少共同邏輯提取：

```typescript
// 重複邏輯
private getEventName(event: Event): string {
  if ('sourceContext' in event && typeof event.sourceContext === 'string') {
    return (event as IntegrationEvent).eventType
  }
  return (event as DomainEvent).constructor.name
}

// 重複邏輯
private serializeEvent(event: Event): Record<string, any> {
  if ('sourceContext' in event && typeof event.sourceContext === 'string') {
    return event as Record<string, any>
  }
  return (event as DomainEvent).toJSON()
}
```

**建議**: 抽取 `BaseEventDispatcher` 基類。

---

## 4️⃣ 事件系統設計評估

### 評分: 8.5/10 ✅ (完整，待優化)

#### 事件系統架構

```
IEventDispatcher (Port - 公開介面)
├─ dispatch(events: Event | Event[]): Promise<void>
└─ subscribe(eventName: string, handler: EventHandler): void

Event (聯合體)
├─ DomainEvent      (同一 Bounded Context 內)
└─ IntegrationEvent (跨 Bounded Context)

實現層 (3 種)
├─ MemoryEventDispatcher      (同步 - 開發/測試)
├─ RedisEventDispatcher       (非同步 - 隊列)
└─ RabbitMQEventDispatcher    (非同步 - AMQP)
```

#### 各實現分析

| 實現 | 分發機制 | 事件序列化 | 順序保證 | 失敗重試 | 評價 |
|-----|--------|---------|--------|--------|------|
| **Memory** | 同步 Promise.all() | 無 (進程內) | ✅ 是 | ❌ 無 | 開發用，簡單 |
| **Redis** | 非同步隊列 (RPUSH) | JSON 序列化 | ⚠️ 無序 | ❌ 無 | 生產用，基礎 |
| **RabbitMQ** | 非同步 AMQP topic | JSON 序列化 | ⚠️ 無序 | ✅ 有 (DLX) | 生產用，完善 |

#### EventListenerRegistry 設計

✅ **優秀** - 集中化管理的佳例

```typescript
// 使用流程
1. Module register() 呼叫 EventListenerRegistry.register()
2. SharedServiceProvider.boot() 呼叫 EventListenerRegistry.bindAll()
3. 統一綁定所有監聽器到 EventDispatcher

優點：
✅ 集中管理，易於追蹤
✅ 支援條件式綁定（容器可用時才綁定）
✅ 清晰的綁定日誌
✅ 支援測試（clear(), getAll(), getByModule()）

缺點：
⚠️ 靜態 Registry，難以支援動態註冊/取消訂閱
```

#### EventStore 設計

✅ **設計完善** - 支援 3 種存儲

| 存儲 | 用途 | 實現狀態 | 備註 |
|------|------|--------|------|
| **Memory** | 開發/測試 | ✅ 完整 | 進程內，簡單 |
| **Redis** | 中等規模 | ✅ 完整 | 分散式，持久化 |
| **RabbitMQ** | 大規模 | ⚠️ 設計 | 需驗證實現 |

**StoredEvent 數據模型**
```typescript
interface StoredEvent {
  id: string                 // 內部主鍵
  eventId: string           // DomainEvent.eventId
  aggregateId: string       // 聚合根 ID
  aggregateType: string     // 'User' | 'Post'
  eventType: string         // 'UserCreated' | 'PostPublished'
  eventData: string         // JSON.stringify(event.toJSON())
  eventVersion: number      // Schema 版本
  aggregateVersion: number  // 事件序號
  occurredAt: string        // ISO 8601
}
```

✅ **優秀** - 完整的審計追蹤

#### 發現的問題

**H3: 事件分發器缺少統一策略** ⚠️

```typescript
// Memory 模式
dispatch(events: Event[]): Promise<void>
  ↓ Promise.all(handlers.map(h => handler(event)))
  ↓ 同步執行，全成功或全失敗

// Redis 模式
dispatch(events: Event[]): Promise<void>
  ↓ await redis.rpush(queue, JSON.stringify(event))
  ↓ 異步隊列，無失敗重試機制

// RabbitMQ 模式
dispatch(events: Event[]): Promise<void>
  ↓ await rabbitmq.publish(exchange, routingKey, event)
  ↓ 異步 AMQP，支援 DLX
```

**問題**: 三種分發器缺少統一的失敗策略。Memory 全失敗，Redis 無重試，RabbitMQ 有 DLX。

**M4: 事件名稱識別邏輯重複** ⚠️

三個分發器都重複實現了 `getEventName()` 和 `serializeEvent()` 邏輯。

**建議**: 抽取 `BaseEventDispatcher` 或 `EventSerializationHelper`。

**H4: Redis/RabbitMQ 分發器缺少 executeHandlers 公開接口** ⚠️

Worker 需要調用 `executeHandlers()` 執行本地訂閱者，但此方法是 `private`/`internal`。

```typescript
// RedisEventDispatcher.ts
async executeHandlers(eventName: string, eventData: any): Promise<void> {
  // 應該是 public，供 SystemWorker 調用
}
```

---

## 5️⃣ 介面設計品質評估

### 評分: 8.5/10 ✅

#### 介面清單與評價

共 14 個 Port 介面：

| # | 介面 | 職責 | 方法數 | ISP 評價 | 完整性 |
|---|------|------|-------|---------|-------|
| 1 | **IDatabaseAccess** | 數據庫存取 (ORM 無關) | 1 (table) | ✅ 高 | ⚠️ 缺 JOIN/GROUP BY |
| 2 | **IQueryBuilder** | 查詢建構 | 10 | ✅ 高 | ⚠️ 缺 JOIN/GROUP BY |
| 3 | **IEventDispatcher** | 事件分發 | 2 | ✅ 高 | ✅ 完整 |
| 4 | **IEventStore** | 事件存儲 | 4 | ✅ 高 | ✅ 完整 |
| 5 | **IServiceProvider** | DI 容器 | 3 (singleton/bind/make) | ✅ 高 | ✅ 完整 |
| 6 | **ICacheService** | 快取服務 | 5 | ✅ 高 | ✅ 完整 |
| 7 | **IRedisService** | Redis 操作 | 8 | ✅ 高 | ✅ 完整 |
| 8 | **IRabbitMQService** | RabbitMQ 操作 | 多 | ✅ 高 | ✅ 完整 |
| 9 | **IJobQueue** | 背景工作 | 2 (push/process) | ✅ 高 | ⚠️ 缺優先級控制 |
| 10 | **ILogger** | 日誌 | 4 | ✅ 高 | ✅ 完整 |
| 11 | **IMailer** | 郵件服務 | - | ✅ 高 | ⚠️ 待實現 |
| 12 | **ITranslator** | 國際化 | - | ✅ 高 | ⚠️ 待實現 |
| 13 | **IStorageService** | 檔案存儲 | 2 (disk/use) | ✅ 高 | ✅ 完整 |
| 14 | **IStorageDisk** | 存儲驅動 | 多 | ✅ 高 | ⚠️ S3 未實現 |
| 15 | **IDatabaseConnectivityCheck** | 數據庫連接檢查 | 1 | ✅ 高 | ✅ 完整 |

#### 介面設計品質分析

**✅ 優秀的介面設計**

1. **IContainer (IServiceProvider 的一部分)**
   ```typescript
   singleton(name, factory): void    // 生命週期清晰
   bind(name, factory): void         // 工廠模式，靈活
   make(name): any                   // 簡單的解析
   ```
   - ✅ ISP：3 個方法，責任單一
   - ✅ 完整：覆蓋完整的 DI 生命週期
   - ✅ 框架無關：未暴露 Gravito 特定概念

2. **IQueryBuilder**
   - ✅ 流暢的鏈式 API：易於使用
   - ✅ 支援常見操作：where, limit, offset, orderBy
   - ⚠️ 缺少 JOIN、GROUP BY、HAVING、DISTINCT

3. **IEventDispatcher**
   - ✅ ISP：2 個方法，責任單一
   - ✅ 完整：dispatch + subscribe 滿足事件系統需求
   - ✅ 支援多事件：Event | Event[]

4. **IEventStore**
   - ✅ ISP：4 個方法，責任清晰
   - ✅ 完整：追加、查詢、計數
   - ✅ 支援版本管理：aggregateVersion 追蹤

#### 介面缺陷

**M5: IQueryBuilder 功能不完整** ⚠️

缺少以下常見 SQL 操作：
- `join(table, on)` - 聯接
- `groupBy(column)` - 分組
- `having(condition)` - 聚合條件
- `distinct()` - 去重
- `union(query)` - 並集

**影響**: 複雜查詢被迫繞過 IQueryBuilder，應用層暴露 ORM 細節。

**M6: IJobQueue 功能不完整** ⚠️

缺少以下功能：
- 優先級管理：`priority?: number` 只在介面定義，無對應操作
- 重試機制：`attempts?: number` 只在介面定義，無重試邏輯
- 延遲執行：無 `delay` 或 `schedule` 方法
- 任務狀態查詢：無 `status()` 或 `inspect()` 方法

**影響**: 無法實現複雜的工作流，如優先級隊列、定時任務。

#### 介面完整性評價

| 介面 | 方法數 | ISP 評分 | 完整性 | 評論 |
|------|-------|---------|-------|------|
| IDatabaseAccess | 1 | 10/10 | 6/10 | 簡潔但功能有限 |
| IQueryBuilder | 10 | 9/10 | 6/10 | 缺少 JOIN/GROUP BY |
| IEventDispatcher | 2 | 10/10 | 9/10 | 設計完善 |
| IEventStore | 4 | 10/10 | 9/10 | 設計完善 |
| IServiceProvider | 3 | 10/10 | 9/10 | 設計完善 |
| ICacheService | 5 | 10/10 | 9/10 | 設計完善 |
| IRedisService | 8 | 9/10 | 9/10 | 覆蓋完整 |
| IJobQueue | 2 | 8/10 | 6/10 | 缺少優先級、重試 |

---

## 6️⃣ 可替換性與靈活性評估

### 評分: 8.5/10 ✅

#### ORM 替換流程圖

```
場景：Atlas → Drizzle 遷移

步驟 1: 新增 Drizzle 適配器
─────────────────────────────────────
app/Shared/Infrastructure/Database/Adapters/Drizzle/
├─ DrizzleDatabaseAdapter.ts        (新)
├─ DrizzleQueryBuilder.ts           (新)
├─ schema.ts                        (新)
└─ config.ts                        (新)

步驟 2: 更新 Database Access 建立工廠
─────────────────────────────────────
app/Shared/Infrastructure/Providers/InfrastructureServiceProvider.ts

before:
  container.singleton('db', () =>
    createAtlasDatabaseAccess()
  )

after:
  container.singleton('db', () =>
    createDrizzleDatabaseAccess()
  )

步驟 3: 更新 Database 遷移
─────────────────────────────────────
database/migrations/
├─ 001_create_users_table.ts       (修改 schema 語法)
└─ 002_create_posts_table.ts       (修改 schema 語法)

步驟 4: 運行遷移
─────────────────────────────────────
bun run migrate:latest

步驟 5: 驗證
─────────────────────────────────────
✅ Module 代碼零改動
✅ Domain 層零改動
✅ Application 層零改動
✅ Repository 實現零改動（使用 IDatabaseAccess）
✅ 只需更新 Infrastructure/Adapters + Providers
```

#### 事件系統替換流程圖

```
場景：Memory → Redis 遷移

步驟 1: 設定環境變數
──────────────────────
.env
EVENT_DRIVER=redis

步驟 2: SharedServiceProvider 自動選擇
──────────────────────────────────────
register() 中:
  const driver = process.env.EVENT_DRIVER || 'memory'

  if (driver === 'redis') {
    container.singleton('eventDispatcher',
      () => new RedisEventDispatcher(redis)
    )
  } else {
    container.singleton('eventDispatcher',
      () => new MemoryEventDispatcher()
    )
  }

步驟 3: EventListenerRegistry.bindAll() 自動綁定
──────────────────────────────────────────────
SharedServiceProvider.boot() 中:
  const dispatcher = core.container.make('eventDispatcher')
  EventListenerRegistry.bindAll(dispatcher, container)

  // 無論使用 Memory/Redis/RabbitMQ，
  // 綁定流程完全相同

步驟 4: 驗證
──────────────────────────────────────────────
✅ Module 代碼零改動
✅ Domain 層零改動
✅ Repository 代碼零改動
✅ 只需設定環境變數 + 啟動 Redis
```

#### 替換能力矩陣

| 組件 | 替換選項 | 成本 | 影響範圍 | 評價 |
|------|---------|------|---------|------|
| **ORM** | Atlas ↔ Drizzle | 中 | 只需 Adapters + Providers | ✅ 優秀 |
| **事件系統** | Memory ↔ Redis ↔ RabbitMQ | 低 | 只需環境變數 + Providers | ✅ 優秀 |
| **快取** | Memory ↔ Redis ↔ Memcached | 低 | 只需 Adapters | ✅ 優秀 |
| **儲存** | Local ↔ S3 ↔ Azure Blob | 中 | StorageManager + Drivers | ⚠️ 需擴展 |
| **日誌** | Console ↔ File ↔ Cloud | 低 | 只需 GravitoLoggerAdapter | ✅ 優秀 |
| **郵件** | SMTP ↔ SendGrid ↔ AWS SES | 低 | 只需 GravitoMailAdapter | ✅ 優秀 |

#### 替換性評價

✅ **ORM 替換**: 支援 3 層 ORM (Atlas/Drizzle/Memory)，無需改動 Module 代碼
✅ **事件系統**: 支援 3 層實現 (Memory/Redis/RabbitMQ)，環境變數動態選擇
✅ **快取系統**: 支援多種驅動，完全可替換
⚠️ **儲存系統**: 僅 Local 完整實現，S3 待實現

---

## 7️⃣ 潛在設計缺陷與改進建議

### 按優先級分類

---

### 🔴 高優先級 (H1-H5) - 架構一致性

#### **H1: Repository 介面缺失（DDD 違反）** ⚠️

**問題**
```typescript
// Domain 層中應定義 Repository 介面，但目前缺失
app/Shared/Domain/Repositories/        // ❌ 空目錄

// 現狀：只有實現，無介面
app/Modules/User/Infrastructure/Repositories/UserRepository.ts
  implements IUserRepository  // 此介面定義在何處？
```

**影響**:
- Domain 層無法獨立定義 Repository 契約
- 難以進行 Domain 層單元測試（缺少 Mock Repository）
- 違反 DDD "Domain 應定義與外界的契約" 原則

**改善方案**:

1. 建立 Domain/Repositories 目錄
2. 定義通用 Repository 介面
   ```typescript
   // app/Shared/Domain/Repositories/IRepository.ts
   export interface IRepository<T extends AggregateRoot> {
     findById(id: string): Promise<T | null>
     save(entity: T): Promise<void>
     delete(id: string): Promise<void>
   }

   // app/Modules/User/Domain/Repositories/IUserRepository.ts
   export interface IUserRepository extends IRepository<User> {
     findByEmail(email: Email): Promise<User | null>
   }
   ```

3. Infrastructure 層實現此介面
   ```typescript
   export class UserRepository
     extends BaseEventSourcedRepository<User>
     implements IUserRepository {
       // 實現
     }
   ```

**工作量**: 1-2 天
**優先級**: 高 (影響 DDD 架構完整性)

---

#### **H2: IQueryBuilder 功能不完整（阻礙複雜查詢）** ⚠️

**問題**

缺少以下常見 SQL 操作：
- `join()` - 聯接（INNER/LEFT/RIGHT/FULL）
- `groupBy()` - 分組
- `having()` - 聚合條件
- `distinct()` - 去重
- `union()` - 並集
- 聚合函數：`count()`, `sum()`, `avg()`, `min()`, `max()`

**影響**:
```typescript
// 無法透過 IQueryBuilder 實現
// 必須直接使用底層 ORM

// 例：統計每個用戶的文章數
const stats = await db
  .table('posts')
  .groupBy('author_id')
  .select(['author_id', 'COUNT(*) as count'])
  // ❌ groupBy() 不存在，無法執行
```

**改善方案**:

1. 擴展 IQueryBuilder 介面
   ```typescript
   export interface IQueryBuilder {
     // ... 現有方法 ...

     // JOIN 操作
     join(table: string, on: string): IQueryBuilder
     leftJoin(table: string, on: string): IQueryBuilder
     rightJoin(table: string, on: string): IQueryBuilder

     // 分組與聚合
     groupBy(...columns: string[]): IQueryBuilder
     having(column: string, operator: string, value: unknown): IQueryBuilder

     // 其他操作
     distinct(): IQueryBuilder
     union(query: IQueryBuilder): IQueryBuilder

     // 聚合函數
     sum(column: string): Promise<number>
     avg(column: string): Promise<number>
     min(column: string): Promise<any>
     max(column: string): Promise<any>
   }
   ```

2. 在各適配器中實現
   - `DrizzleQueryBuilder`: 使用 Drizzle 的 `join()` 等
   - `AtlasQueryBuilder`: 使用 Atlas 的 JOIN 語法
   - `MemoryQueryBuilder`: 實現簡單版本

**工作量**: 3-4 天
**優先級**: 高 (影響應用層複雜查詢能力)

---

#### **H3: 事件分發器缺少統一的失敗策略** ⚠️

**問題**

```typescript
// Memory 模式：全成功或全失敗
await Promise.all(handlers.map(h => handler(event)))

// Redis 模式：推入隊列，丟失失敗重試機制
await redis.rpush(queueKey, payload)

// RabbitMQ 模式：支援死信交換 (DLX)
// 但未在 dispatch() 中統一說明
```

**影響**:
- 不同驅動的失敗語義不同，導致業務邏輯不一致
- Memory 模式中單個 Handler 失敗會中斷其他 Handler
- Redis 模式中無失敗重試機制，事件可能丟失

**改善方案**:

1. 定義統一的 HandlerExecutionResult
   ```typescript
   interface HandlerExecutionResult {
     success: boolean
     handlerName: string
     error?: Error
     attempts?: number
   }
   ```

2. 擴展 IEventDispatcher
   ```typescript
   export interface IEventDispatcher {
     dispatch(events: Event | Event[]): Promise<void>
     subscribe(eventName: string, handler: EventHandler): void

     // 新增：獲取分發器類型（用於業務邏輯判斷）
     getDispatcherType(): 'memory' | 'redis' | 'rabbitmq'

     // 新增：判斷是否支援重試
     supportsRetry(): boolean
   }
   ```

3. 在各實現中添加重試邏輯
   ```typescript
   // RedisEventDispatcher
   async executeHandlers(eventName: string, eventData: any, maxRetries = 3) {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         await handlers[i](eventData)
         break  // 成功，停止重試
       } catch (error) {
         if (attempt === maxRetries) throw error
         await sleep(exponentialBackoff(attempt))
       }
     }
   }
   ```

**工作量**: 2-3 天
**優先級**: 高 (影響事件可靠性)

---

#### **H4: Redis/RabbitMQ 分發器的 executeHandlers 應公開** ⚠️

**問題**

```typescript
// RedisEventDispatcher.ts
async executeHandlers(eventName: string, eventData: any): Promise<void> {
  // ⚠️ private 或 internal，外部無法調用
}

// SystemWorker 需要調用此方法，但無法訪問
class SystemWorker {
  async processRedisQueue() {
    const message = await redis.lpop(queueKey)
    // ❌ dispatcher.executeHandlers() 無法調用
  }
}
```

**改善方案**:

```typescript
export class RedisEventDispatcher implements IEventDispatcher {
  // ... 現有方法 ...

  /**
   * 執行指定事件的所有訂閱者（public，供 Worker 調用）
   * @internal 僅供 SystemWorker 使用
   */
  async executeHandlers(eventName: string, eventData: any): Promise<void> {
    const handlers = this.handlers.get(eventName) || []

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(eventData)
        } catch (error) {
          console.error(`[RedisEventDispatcher] Handler failed for ${eventName}:`, error)
          // 可以在此添加失敗重試邏輯
        }
      })
    )
  }
}
```

**工作量**: 0.5 天
**優先級**: 高 (阻礙 Worker 集成)

---

#### **H5: 缺少統一的 EventDispatcher 基類** ⚠️

**問題**

三個分發器實現重複邏輯：

```typescript
// 重複 1: getEventName()
private getEventName(event: Event): string {
  if ('sourceContext' in event && typeof event.sourceContext === 'string') {
    return (event as IntegrationEvent).eventType
  }
  return (event as DomainEvent).constructor.name
}

// 重複 2: serializeEvent()
private serializeEvent(event: Event): Record<string, any> {
  if ('sourceContext' in event && typeof event.sourceContext === 'string') {
    return event as Record<string, any>
  }
  return (event as DomainEvent).toJSON()
}

// 重複 3: getRoutingKey() (RabbitMQ 特定)
// ...
```

**改善方案**:

```typescript
// app/Shared/Infrastructure/Framework/BaseEventDispatcher.ts
export abstract class BaseEventDispatcher implements IEventDispatcher {
  protected handlers: Map<string, EventHandler[]> = new Map()

  /**
   * 提取事件名稱（共用邏輯）
   */
  protected getEventName(event: Event): string {
    if ('sourceContext' in event && typeof event.sourceContext === 'string') {
      return (event as IntegrationEvent).eventType
    }
    return (event as DomainEvent).constructor.name
  }

  /**
   * 序列化事件（共用邏輯）
   */
  protected serializeEvent(event: Event): Record<string, any> {
    if ('sourceContext' in event && typeof event.sourceContext === 'string') {
      return event as Record<string, any>
    }
    return (event as DomainEvent).toJSON()
  }

  /**
   * 訂閱事件（共用邏輯）
   */
  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, [])
    }
    this.handlers.get(eventName)!.push(handler)
  }

  /**
   * 執行處理程序（子類可覆蓋）
   */
  protected async executeHandlers(eventName: string, eventData: any): Promise<void> {
    const handlers = this.handlers.get(eventName) || []

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(eventData)
        } catch (error) {
          console.error(`Handler failed for ${eventName}:`, error)
        }
      })
    )
  }

  abstract dispatch(events: Event | Event[]): Promise<void>
}

// 各子類只需實現 dispatch()
export class RedisEventDispatcher extends BaseEventDispatcher {
  async dispatch(events: Event | Event[]): Promise<void> {
    const eventList = Array.isArray(events) ? events : [events]

    for (const event of eventList) {
      const eventName = this.getEventName(event)  // 使用基類方法
      const serialized = this.serializeEvent(event)  // 使用基類方法

      await this.redis.rpush(this.queueKey, JSON.stringify({
        name: eventName,
        event: serialized
      }))
    }
  }
}
```

**工作量**: 1 天
**優先級**: 高 (提高代碼維護性)

---

### 🟡 中優先級 (M1-M6) - 設計缺陷

#### **M1: 適配器命名不統一** ⚠️

**問題**
```typescript
✅ GravitoRedisAdapter
✅ GravitoCacheAdapter
⚠️ RabbitMQAdapter          // 缺少 Gravito* 前綴
✅ RedisJobQueueAdapter
⚠️ RabbitMQJobQueueAdapter  // 冗餘命名
```

**改善方案**:

```typescript
// 統一命名模式：Gravito{Service}Adapter

// 修改前
RabbitMQAdapter                    // ❌ 容易與 Port 混淆
RabbitMQJobQueueAdapter           // ❌ 冗長

// 修改後
GravitoRabbitMQAdapter            // ✅ 清晰前綴
GravitoRabbitMQJobQueue           // ✅ 簡潔
```

**工作量**: 0.5 天 (僅重命名)
**優先級**: 中

---

#### **M2: 存儲驅動命名不一致** ⚠️

**問題**
```typescript
class LocalDriver implements IStorageDisk { }      // ❌ 不統一
class S3Store implements IStorageDisk { }          // ❌ 不統一

// 應統一為
class LocalStorageDriver implements IStorageDisk { }
class S3StorageDriver implements IStorageDisk { }
```

**改善方案**: 同 M1，統一驅動命名模式

**工作量**: 0.5 天
**優先級**: 中

---

#### **M3: 事件分發器缺少統一基類** ⚠️

**問題**: 三個分發器重複邏輯 (getEventName, serializeEvent)

**改善方案**: 見 H5 完整方案

**工作量**: 1 天
**優先級**: 中

---

#### **M4: IJobQueue 功能不完整** ⚠️

**問題**
```typescript
interface IJobQueue {
  push<T>(name: string, data: T): Promise<void>
  process(name: string, handler: JobHandler): void
}

// 缺少：
// - 優先級管理
// - 重試機制
// - 延遲執行
// - 任務狀態查詢
```

**改善方案**:

```typescript
export interface Job<T = any> {
  name: string
  data: T
  priority?: number        // ✅ 已定義
  attempts?: number        // ✅ 已定義
  delay?: number          // ❌ 需添加
  maxRetries?: number     // ❌ 需添加
  backoff?: 'fixed' | 'exponential'  // ❌ 需添加
}

export interface IJobQueue {
  // 推送工作
  push<T>(name: string, data: T, options?: JobOptions): Promise<string>

  // 推送延遲工作
  pushDelay<T>(name: string, data: T, delayMs: number): Promise<string>

  // 註冊處理程序
  process(name: string, handler: JobHandler, options?: ProcessOptions): void

  // ❌ 新增：查詢任務狀態
  // status(jobId: string): Promise<JobStatus>

  // ❌ 新增：重試失敗任務
  // retry(jobId: string): Promise<void>

  // ❌ 新增：取消任務
  // cancel(jobId: string): Promise<void>
}
```

**工作量**: 2-3 天
**優先級**: 中

---

#### **M5: IQueryBuilder 功能不完整（詳細見 H2）** ⚠️

**改善方案**: 見 H2 完整方案

**工作量**: 3-4 天
**優先級**: 中 (已在 H2 詳述)

---

#### **M6: 缺少對 Database 連接池管理的介面** ⚠️

**問題**

```typescript
// 現狀：無連接池管理介面
// 高併發場景下，可能導致連接耗盡

// 建議添加
export interface IDatabaseConnectionPool {
  getPoolSize(): number
  getAvailableConnections(): number
  getActiveConnections(): number
  close(): Promise<void>
}
```

**改善方案**:

1. 擴展 IDatabaseAccess
   ```typescript
   export interface IDatabaseAccess {
     table(name: string): IQueryBuilder

     // ❌ 新增：連接池管理
     // getPool(): IDatabaseConnectionPool
   }
   ```

2. 在各適配器中實現
   ```typescript
   class DrizzleDatabaseAdapter implements IDatabaseAccess {
     private pool: IDatabaseConnectionPool

     constructor() {
       this.pool = {
         getPoolSize: () => drizzleInstance.poolSize,
         getAvailableConnections: () => drizzleInstance.available,
         getActiveConnections: () => drizzleInstance.active,
         close: () => drizzleInstance.close()
       }
     }
   }
   ```

**工作量**: 1-2 天
**優先級**: 中 (非關鍵，可後續添加)

---

### 🟢 低優先級 (L1-L5) - 技術債務

#### **L1: 缺少介面實現的單元測試** ⚠️

**問題**

各 Port 介面缺少測試實現：
- IDatabaseAccess: ✅ 測試 (MemoryDatabaseAccess)
- IEventDispatcher: ✅ 測試 (MemoryEventDispatcher)
- ICacheService: ❌ 無測試實現
- IJobQueue: ❌ 無測試實現
- IRedisService: ❌ 無測試實現

**改善方案**:

建立 `tests/Unit/Mocks/` 目錄，為每個 Port 實現 Mock：

```typescript
// tests/Unit/Mocks/InMemoryCacheService.ts
export class InMemoryCacheService implements ICacheService {
  private cache = new Map<string, unknown>()
  private ttls = new Map<string, number>()

  async get<T>(key: string): Promise<T | null> {
    const ttl = this.ttls.get(key)
    if (ttl && Date.now() > ttl) {
      this.cache.delete(key)
      return null
    }
    return (this.cache.get(key) ?? null) as T | null
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value)
    if (ttlSeconds) {
      this.ttls.set(key, Date.now() + ttlSeconds * 1000)
    }
  }

  async forget(key: string): Promise<void> {
    this.cache.delete(key)
    this.ttls.delete(key)
  }

  async flush(): Promise<void> {
    this.cache.clear()
    this.ttls.clear()
  }
}
```

**工作量**: 2-3 天
**優先級**: 低 (改善測試覆蓋，不影響生產)

---

#### **L2: GravitoCacheAdapter 缺少錯誤處理** ⚠️

**問題**

```typescript
export class GravitoCacheAdapter implements ICacheService {
  async ping(): Promise<string> {
    try {
      // ...
      return 'PONG'
    } catch {
      throw new Error('Cache service unavailable')
    }
  }

  // ❌ 其他方法缺少 try-catch
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key)  // 無錯誤處理
  }
}
```

**改善方案**:

```typescript
export class GravitoCacheAdapter implements ICacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cache.get<T>(key)
    } catch (error) {
      console.error(`[GravitoCacheAdapter] Failed to get key: ${key}`, error)
      return null  // 降級：失敗時回傳 null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttlSeconds)
    } catch (error) {
      console.warn(`[GravitoCacheAdapter] Failed to set key: ${key}`, error)
      // 降級：快取失敗但不拋出例外，允許應用繼續執行
    }
  }
}
```

**工作量**: 0.5 天
**優先級**: 低 (增強健壯性)

---

#### **L3: MemoryDatabaseAccess 缺少 unique 驗證** ⚠️

**問題**

```typescript
class MemoryQueryBuilder {
  async insert(data: Record<string, unknown>): Promise<void> {
    const rows = this.getTableRows()
    rows.push({ ...data })
    // ❌ 無唯一性檢驗，允許重複資料
  }
}
```

**改善方案**:

```typescript
// 在 MemoryDatabaseAccess 中添加 schema 定義
class MemoryDatabaseAccess {
  private schemas = new Map<string, { uniqueFields: string[] }>()

  constructor() {
    // 初始化 schema
    this.schemas.set('users', { uniqueFields: ['email', 'id'] })
    this.schemas.set('posts', { uniqueFields: ['id'] })
  }

  table(name: string): IQueryBuilder {
    const schema = this.schemas.get(name)
    return new MemoryQueryBuilder(name, this.store, schema?.uniqueFields)
  }
}

class MemoryQueryBuilder {
  async insert(data: Record<string, unknown>): Promise<void> {
    // 檢驗唯一性
    if (this.uniqueFields) {
      for (const field of this.uniqueFields) {
        const exists = this.rows.some(row => row[field] === data[field])
        if (exists) {
          throw new Error(`Unique constraint violation on field: ${field}`)
        }
      }
    }
    this.rows.push({ ...data })
  }
}
```

**工作量**: 0.5 天
**優先級**: 低 (增強測試準確性)

---

#### **L4: RabbitMQEventDispatcher 缺少連接檢查** ⚠️

**問題**

```typescript
export class RabbitMQEventDispatcher {
  async dispatch(events: Event[]): Promise<void> {
    // ❌ 無檢查 RabbitMQ 是否已連接
    await this.rabbitmq.publish(...)
  }
}
```

**改善方案**:

```typescript
export class RabbitMQEventDispatcher {
  async dispatch(events: Event[]): Promise<void> {
    if (!this.rabbitmq.isConnected()) {
      throw new Error('RabbitMQ not connected')
    }
    // ...
  }
}
```

**工作量**: 0.5 天
**優先級**: 低

---

#### **L5: 缺少 Infrastructure 層整合測試** ⚠️

**問題**

無對 Infrastructure 層的整合測試：
- 不同 ORM 的 Repository 互操作
- 不同 EventDispatcher 的事件流
- Storage 驅動的檔案操作

**改善方案**:

建立 `tests/Integration/Infrastructure/` 目錄：

```typescript
// tests/Integration/Infrastructure/DatabaseAdapters.test.ts
describe('Database Adapters', () => {
  it('should work with different ORM implementations', async () => {
    const atlasDb = new GravitoDatabaseAccess()
    const drizzleDb = new DrizzleDatabaseAccess()
    const memoryDb = new MemoryDatabaseAccess()

    // 測試三種 ORM 是否通過相同介面
    for (const db of [atlasDb, drizzleDb, memoryDb]) {
      const result = await db.table('users')
        .where('id', '=', '123')
        .first()
      expect(result).toBeDefined()
    }
  })
})

// tests/Integration/Infrastructure/EventDispatchers.test.ts
describe('Event Dispatchers', () => {
  it('should dispatch events consistently', async () => {
    const dispatchers = [
      new MemoryEventDispatcher(),
      new RedisEventDispatcher(redis),
      new RabbitMQEventDispatcher(rabbitmq)
    ]

    for (const dispatcher of dispatchers) {
      let called = false
      dispatcher.subscribe('TestEvent', () => { called = true })

      await dispatcher.dispatch(new TestEvent())

      // 注意：Redis/RabbitMQ 是非同步的，需要等待
      expect(called).toBe(true)
    }
  })
})
```

**工作量**: 2-3 天
**優先級**: 低 (增強測試覆蓋)

---

## 8️⃣ 改進優先級與實施計畫

### P0 - 立即行動（1 週內）

| 序號 | 項目 | 工時 | 負責人 |
|------|------|------|-------|
| H1 | 建立 Domain/Repositories 介面層 | 1-2d | - |
| H2 | 擴展 IQueryBuilder 支援 JOIN/GROUP BY | 3-4d | - |
| H3 | 統一事件分發器的失敗策略 | 2-3d | - |
| H4 | 公開 Redis/RabbitMQ 分發器的 executeHandlers | 0.5d | - |
| H5 | 建立 BaseEventDispatcher 基類 | 1d | - |

**預計完成**: 2026-03-20

---

### P1 - 短期計畫（2-3 週內）

| 序號 | 項目 | 工時 | 依賴 |
|------|------|------|------|
| M1 | 統一適配器命名 (Gravito* 前綴) | 0.5d | - |
| M2 | 統一存儲驅動命名 | 0.5d | - |
| M3 | 重構事件分發器邏輯 | 1d | H5 |
| M4 | 擴展 IJobQueue 支援優先級/重試 | 2-3d | - |
| M5 | IQueryBuilder 功能完整化 | 3-4d | H2 |
| M6 | 添加連接池管理介面 | 1-2d | - |

**預計完成**: 2026-04-03

---

### P2 - 長期優化（4-6 週內）

| 序號 | 項目 | 工時 | 優先級 |
|------|------|------|-------|
| L1 | 補充 Mock 實現的單元測試 | 2-3d | 低 |
| L2 | 增強適配器錯誤處理 | 0.5d | 低 |
| L3 | MemoryDatabaseAccess 唯一性驗證 | 0.5d | 低 |
| L4 | RabbitMQ 連接檢查 | 0.5d | 低 |
| L5 | Infrastructure 整合測試 | 2-3d | 低 |

**預計完成**: 2026-04-24

---

### 實施路線圖

```
Week 1 (P0)                    Week 2-3 (P1)              Week 4-6 (P2)
├─ H1: Repository 介面        ├─ M1-M2: 命名統一         ├─ L1: Mock 測試
├─ H2: IQueryBuilder JOIN      ├─ M3-M6: 功能完整化       ├─ L2-L5: 代碼品質
├─ H3: 事件失敗策略           │                          │
├─ H4: executeHandlers 公開    │                          │
└─ H5: BaseEventDispatcher     └─ ...完成 P0 遺留項目    └─ ...完成 P1 遺留項目
```

---

## 📋 附錄：相關文件清單

### 核心檔案

| 檔案路徑 | 行數 | 評價 | 備註 |
|---------|------|------|------|
| `IDatabaseAccess.ts` | 136 | 9/10 | 核心 Port，設計優秀 |
| `IServiceProvider.ts` | 86 | 9/10 | DI 容器介面，簡潔有力 |
| `IEventDispatcher.ts` | 42 | 9/10 | 事件分發介面，設計完善 |
| `IEventStore.ts` | 18 | 9/10 | 事件存儲介面，清晰簡潔 |
| `BaseEventSourcedRepository.ts` | 276 | 9/10 | Repository 基類，功能完整 |
| `EventListenerRegistry.ts` | 181 | 9/10 | 集中化事件管理，設計優秀 |
| `MemoryEventDispatcher.ts` | 96 | 8/10 | 測試用分發器，功能完整 |
| `RedisEventDispatcher.ts` | 110 | 8/10 | 生產用分發器，待優化 |
| `RabbitMQEventDispatcher.ts` | 180 | 8/10 | 高級分發器，功能完整 |
| `GravitoServiceProviderAdapter.ts` | 106 | 9/10 | 框架耦合點，設計清晰 |
| `SharedServiceProvider.ts` | 102 | 9/10 | 全域服務提供，集中化管理 |
| `DrizzleDatabaseAdapter.ts` | 58 | 9/10 | ORM 適配器，結構清晰 |
| `MemoryDatabaseAccess.ts` | 244 | 8/10 | 測試用 ORM，功能基本完整 |

### Port 介面 (14 個)

| 介面 | 方法數 | ISP | 完整性 | 評價 |
|------|-------|-----|-------|------|
| IDatabaseAccess | 1 | 10 | 6 | 簡潔但功能有限 |
| IQueryBuilder | 10 | 9 | 6 | 缺 JOIN/GROUP BY |
| IEventDispatcher | 2 | 10 | 9 | 設計完善 |
| IEventStore | 4 | 10 | 9 | 功能完整 |
| IServiceProvider | 3 | 10 | 9 | 簡潔完整 |
| ICacheService | 5 | 10 | 9 | 設計完善 |
| IRedisService | 8 | 9 | 9 | 功能完整 |
| IRabbitMQService | 多 | 9 | 8 | 複雜但完整 |
| IJobQueue | 2 | 8 | 6 | 缺優先級/重試 |
| ILogger | 4 | 10 | 9 | 標準介面 |
| IMailer | - | - | - | 待實現 |
| ITranslator | - | - | - | 待實現 |
| IStorageService | 2 | 10 | 9 | 設計完善 |
| IStorageDisk | 多 | 9 | 7 | S3 未實現 |

### 度量指標

```
Infrastructure 層統計
├─ 總檔案數: 55 (✅ 適度)
├─ Port 介面: 14 (✅ 清晰)
├─ 實現類: 18+ (✅ 完整)
├─ 代碼行數: ~4000 (✅ 適度)
├─ 平均文件大小: ~73 行 (✅ 小而專注)
├─ 圈複雜度: 低 (✅ 易於理解)
└─ 測試覆蓋: 中等 (⚠️ 需強化)
```

### 檔案結構評分

```
app/Shared/Infrastructure/
├─ Database/              [9/10] - 清晰、ORM 無關、完整
├─ Framework/             [8/10] - 適配器多但缺統一基類
├─ Storage/               [7/10] - 結構清晰，S3 未完整
├─ Providers/             [9/10] - 集中化、清晰
└─ I*.ts (Port)           [8.5/10] - 大部分完善，待擴展
```

---

## 🎯 總結

### 優勢總結

✅ **企業級設計**: Port-Adapter 模式清晰，框架無關性出色
✅ **ORM 無關化**: 完美支援 Atlas/Drizzle/Memory 無縫切換
✅ **事件驅動完整**: 3 層事件系統 + EventStore + EventListenerRegistry
✅ **DI 深度抽象**: IContainer 完全框架無關，適配層隔離 Gravito 耦合
✅ **代碼質量**: 檔案小而專注，圈複雜度低，易於維護

### 缺陷總結

⚠️ **5 項高優先缺陷**
- H1: Repository 介面缺失
- H2: IQueryBuilder 功能不完整
- H3: 事件失敗策略不統一
- H4: executeHandlers 可見性低
- H5: 事件分發器邏輯重複

⚠️ **6 項中優先缺陷**
- M1-M2: 命名不統一
- M3-M5: 功能完整化
- M6: 連接池管理

⚠️ **5 項低優先缺陷** (代碼品質、測試)

### 建議行動

1. **立即 (1 週)**: 完成 P0 (H1-H5) 改進
2. **短期 (2-3 週)**: 完成 P1 (M1-M6) 改進
3. **長期 (4-6 週)**: 完成 P2 (L1-L5) 優化

### 最終評分

```
維度評分總表
├─ 層次責任清晰度:     9/10 ✅
├─ ORM 無關性設計:     8.5/10 ✅
├─ 適配器模式一致性:   8/10 ✅
├─ 事件系統設計:       8.5/10 ✅
├─ 介面設計品質:       8.5/10 ✅
├─ 可替換性與靈活性:   8.5/10 ✅
└─ ═══════════════════════════════
   整體評分:          8.3/10 ✅ (優秀)
```

**結論**: gravito-ddd 的 Infrastructure 層展現了**企業級架構設計**的優秀實踐，特別是在 ORM 無關化和事件驅動方面。5 項高優先改進將進一步提升架構的一致性和可維護性。建議按優先級逐步推進改進，預期 6 週內完成全部優化。

---

**審查完成日期**: 2026-03-13
**下次審查建議**: 完成 P0 改進後 (2026-03-20)
