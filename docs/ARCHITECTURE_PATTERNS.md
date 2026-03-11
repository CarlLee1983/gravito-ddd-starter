# 🏗️ 進階架構模式指南

本文檔說明何時引入 **CQRS**、**Event Sourcing**、**Saga Pattern** 等進階模式。

## 概述

**原則**：**簡單優先** — Gravito DDD Starter 採用基礎四層架構 + Repository 模式。只有當業務需求確實需要時，才引入進階模式。

### 當前架構（樣版）

```
User 模組（簡單）
├── Presentation/
├── Application/      ← 直接調用 Repository，無 Handler/Service 複雜度
├── Domain/
└── Infrastructure/
    └── Repository   ← 唯一的數據存取抽象
```

**優點**：
- ✅ 代碼簡潔（無 boilerplate）
- ✅ 易於理解（新開發者快速上手）
- ✅ 易於維護（變更影響小）
- ✅ 易於測試（依賴簡單）

---

## 1. CQRS（命令查詢責任分離）

### 何時使用？

| 場景 | 指標 | 例子 |
|------|------|------|
| **讀多寫少** | 讀寫比 > 10:1 | 部落格文章（讀 100 次 vs 寫 1 次） |
| **複雜查詢** | 查詢需要多表 JOIN、聚合、投影 | 統計面板（需要 10+ 種不同查詢） |
| **查詢性能** | 簡單索引無法滿足（需要特殊優化） | 搜尋、分頁、排序組合爆炸 |
| **不同讀模型** | 不同場景需要不同數據結構 | APP 版本 vs Web 版本要不同字段 |

### 不使用 CQRS 的場景

❌ **User 模組**（本樣版）
- 查詢簡單：只有 findById、findByEmail、list
- 讀寫平衡：創建、查詢、更新頻率相近
- 無複雜投影：返回數據結構就是 User 實體

### 架構範例

```typescript
// Command 處理寫入
export class CreatePostHandler {
  async execute(cmd: CreatePostCommand): Promise<void> {
    // 業務驗證 → 創建聚合 → 保存 → 發布事件
  }
}

// Query 處理讀取
export class GetPostsByUserQuery {
  async execute(query: GetPostsByUserQuery): Promise<PostDTO[]> {
    // 直接查詢優化過的讀模型（可能是特殊投影表）
  }
}
```

### 實施步驟

1. 建立 `Application/Commands/` 和 `Application/Queries/` 目錄
2. 為每個寫操作建立 Command + Handler
3. 為每個複雜查詢建立 Query + Handler
4. 建立讀模型（可選 SQL 視圖或專用投影表）

詳見案例：`examples/CQRS_Example/` （待實作）

---

## 2. Event Sourcing（事件溯源）

### 何時使用？

| 場景 | 指標 | 例子 |
|------|------|------|
| **完整審計** | 需要記錄所有變更 | 財務系統、法規遵循、醫療紀錄 |
| **事件回放** | 需要重現過去的狀態 | 訂單歷史、用戶操作追蹤 |
| **時間旅行** | "2024-03-10 的用戶余額是多少?" | 支付系統、版本控制 |
| **複雜業務邏輯** | 状態機遷移複雜，容易出錯 | 訂單生命週期、工作流引擎 |

### 不使用 Event Sourcing 的場景

❌ **User 模組**（本樣版）
- 無審計需求：只需記錄最終狀態
- 無複雜狀態機：只有 active/inactive
- 可覆蓋更新：不需要完整歷史

### 架構範例

```typescript
// 事件定義
export class UserCreatedEvent extends DomainEvent {
  constructor(public userId: string, public email: string) {
    super()
  }
}

// 聚合發布事件
export class User extends Aggregate {
  static create(id: string, email: string): User {
    const user = new User()
    user.apply(new UserCreatedEvent(id, email))
    return user
  }

  private onUserCreated(event: UserCreatedEvent): void {
    this.id = event.userId
    this.email = event.email
    this.createdAt = new Date()
  }
}

// 事件儲存
export class EventSourcingUserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    const events = user.getDomainEvents()
    await this.eventStore.saveEvents(user.id, events)
  }

  async findById(id: string): Promise<User | null> {
    const events = await this.eventStore.getEvents(id)
    return User.fromEvents(events) // 從事件重建狀態
  }
}
```

### 實施步驟

1. 建立 `Domain/Events/` 目錄，定義領域事件
2. 修改 Aggregate，使其聲明和應用事件
3. 建立 `EventStore` 基礎設施（可用 EventStoreDB 等）
4. 建立新的 Repository 實現（基於事件重建）
5. 建立投影層（可選，用於查詢優化）

詳見案例：`examples/EventSourcing_Example/` （待實作）

---

## 3. Saga Pattern（長流程協調）

### 何時使用？

| 場景 | 指標 | 例子 |
|------|------|------|
| **跨聚合事務** | 涉及多個不同聚合的操作 | 訂單 → 庫存 → 支付的一致性 |
| **補償邏輯** | 操作失敗需要回滾多個步驟 | 轉帳失敗需要撤銷兩邊操作 |
| **異步協調** | 步驟無法在同一事務中完成 | 第三方 API 調用（支付網關） |
| **長期流程** | 流程跨越秒級以上 | 訂單履行、核准流程 |

### 不使用 Saga 的場景

❌ **User 模組**（本樣版）
- 單聚合操作：User 本身的創建
- 無跨模組事務：不涉及其他聚合
- 同步完成：操作瞬間完成

### 架構範例

```typescript
// Saga 定義（協調器）
export class OrderFulfillmentSaga {
  async execute(orderId: string): Promise<void> {
    try {
      // Step 1: 預留庫存
      const reservationId = await this.inventoryService.reserve(orderId)

      // Step 2: 處理支付
      const paymentId = await this.paymentService.charge(orderId)

      // Step 3: 發送訂單
      await this.shippingService.ship(orderId, reservationId)

    } catch (error) {
      // 補償：反向操作
      await this.inventoryService.cancelReservation(reservationId)
      await this.paymentService.refund(paymentId)
      throw new SagaException('Order fulfillment failed')
    }
  }
}
```

### 實施步驟

1. 建立 `Application/Sagas/` 目錄
2. 定義 Saga 類別，實現協調邏輯
3. 定義 Port（Service 介面）給其他模組
4. 建立 Adapter 實現，調用各模組 Repository
5. 處理失敗和補償邏輯

詳見案例：`examples/Saga_Example/` （待實作）

---

## 決策樹

```
你的功能有以下特徵嗎？

是否需要複雜查詢優化或讀多寫少？
  ├─ 是 → 使用 CQRS
  └─ 否 → 繼續

是否需要完整變更歷史和事件重放？
  ├─ 是 → 使用 Event Sourcing
  └─ 否 → 繼續

是否涉及跨多個聚合的協調？
  ├─ 是 → 使用 Saga Pattern
  └─ 否 → 繼續

✅ 使用基礎四層架構 + Repository 模式
```

---

## 漸進式實施策略

### Phase 1：基礎（現在）

```
User、Post、Health 模組
↓
直接 Repository 模式
↓
簡單、易懂、易測試
```

### Phase 2：需要時引入 CQRS

```
Payment、Analytics 模組（讀多寫少）
↓
Command/Query Handler
↓
讀寫分離、查詢優化
```

### Phase 3：進階需求

```
Order、Wallet 模組（複雜流程 + 審計）
↓
Event Sourcing + Saga
↓
完整歷史 + 長流程協調
```

---

## 相關資源

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 四層架構基礎
- [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) - 層級分離規則
- [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md) - 防腐層設計

### 外部參考

- Martin Fowler - CQRS: https://martinfowler.com/bliki/CQRS.html
- Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- Saga Pattern: https://microservices.io/patterns/data/saga.html

---

## 案例計畫（待實作）

- ✅ 基礎四層架構（User 模組）
- ⏳ CQRS 案例（Payment 模組）
- ⏳ Event Sourcing 案例（Wallet 模組）
- ⏳ Saga Pattern 案例（Order 模組）

每個案例都會包含：
- 完整代碼實現
- 測試（單元、整合、E2E）
- 遷移指南（從簡單模式升級）
- 性能對比

---

**最後更新**：2026-03-11
