# Refund 模組設計規格

**日期**: 2026-03-26
**狀態**: 設計完成，待實施
**模組路徑**: `app/Modules/Refund/`

## 概述

Refund 模組是 gravito-ddd 購物系統的退貨退款模組，作為獨立的 Bounded Context，透過 IntegrationEvent 和 Saga 與 Order、Payment、Inventory 模組協調。

### 業務範圍

- 僅退款（Refund Only）：不退貨，直接退款
- 退貨退款（Return + Refund）：退貨確認後退款
- 部分退貨：訂單中只退部分商品
- 換貨：拆解為「退貨 + 用戶手動下新訂單」，不做獨立流程，系統不自動建立新訂單
- 混合審核：小額/符合政策自動通過，大額/特殊情況人工審核
- 精確金額計算：折扣按比例分攤 + 手續費扣除
- 退款去向：僅原路退回

---

## 1. Domain 層

### 1.1 Refund 聚合根

```typescript
Refund (AggregateRoot)
  ├── id: RefundId
  ├── orderId: OrderId
  ├── userId: UserId
  ├── type: RefundType                   // RefundOnly | ReturnAndRefund
  ├── status: RefundStatus               // 狀態機
  ├── items: ReturnItem[]                // 退貨品項（子實體）
  ├── calculation: RefundCalculation     // 退款金額計算（VO）
  ├── policy: PolicyDecision             // 審核決策（VO）
  ├── reason: RefundReason               // 退款原因（VO）
  ├── requestedAt: Date
  ├── resolvedAt?: Date
  └── rejectionNote?: string
```

### 1.2 狀態機

```
                    ┌─────────────┐
                    │  Requested  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
               ┌────┤ UnderReview ├────┐
               │    └─────────────┘    │
        ┌──────▼──────┐         ┌──────▼──────┐
        │   Approved  │         │  Rejected   │
        └──────┬──────┘         └─────────────┘
               │
         ┌─────┴─────┐
         │            │
  (RefundOnly)  (ReturnAndRefund)
         │            │
         │     ┌──────▼──────────┐
         │     │ AwaitingReturn  │
         │     └──────┬──────────┘
         │            │
         │     ┌──────▼──────────┐
         │     │ ItemsReceived   │
         │     └──────┬──────────┘
         │            │
         └─────┬──────┘
               │
        ┌──────▼──────┐
        │ Processing  │  ← Payment 退款進行中
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  Completed  │
        └─────────────┘

        ┌─────────────┐
        │   Failed    │ ← 可重試 → Processing
        └─────────────┘
```

合法狀態轉換：
- `Requested → UnderReview`（提交審核）
- `UnderReview → Approved`（審核通過）
- `UnderReview → Rejected`（審核拒絕）
- `Approved → AwaitingReturn`（僅 ReturnAndRefund）
- `Approved → Processing`（僅 RefundOnly）
- `AwaitingReturn → ItemsReceived`（倉庫確認收貨）
- `ItemsReceived → Processing`（開始退款）
- `Processing → Completed`（退款成功）
- `Processing → Failed`（退款失敗，可重試）
- `Failed → Processing`（重試退款）

### 1.3 Value Objects

| Value Object | 職責 |
|---|---|
| **RefundId** | UUID 封裝 |
| **RefundType** | `RefundOnly` \| `ReturnAndRefund` |
| **RefundStatus** | 狀態枚舉 + 轉換驗證（`canTransitionTo(target)` 方法） |
| **RefundReason** | `Defective` \| `WrongItem` \| `NotAsDescribed` \| `ChangeOfMind` \| `Other(description)` |
| **RefundCalculation** | subtotal, restockingFee, shippingFee, totalDeductions, refundAmount, breakdown[] |
| **RefundFees** | restockingFeeRate, shippingFee, waivedReasons[] |
| **PolicyDecision** | `Auto(rule)` \| `Manual(reviewerId, note)` |
| **RefundPolicyConfig** | maxAutoApprovalDays, maxAutoApprovalAmount, maxRecentRefunds, recentRefundWindowDays, autoApprovalReasons[] |
| **OrderReference** | orderId + orderLineId 的防腐層封裝 |
| **OrderContext** | orderId, orderDate, totalAmount, discountAmount, paymentMethod, items[] |
| **Money** | amount (integer cents) + currency，不可變，支援加減乘運算 |
| **ItemCondition** | `Good` \| `Damaged` \| `Missing` |

### 1.4 ReturnItem 子實體

```typescript
ReturnItem (Entity)
  ├── id: ReturnItemId
  ├── productId: string
  ├── productName: string           // 快照，防腐層
  ├── originalPrice: Money
  ├── discountShare: Money          // 分攤的折扣金額
  ├── quantity: Quantity
  ├── reason: RefundReason
  ├── status: ReturnItemStatus      // Pending | Shipped | Received | Inspected
  └── condition?: ItemCondition     // Good | Damaged | Missing
```

### 1.5 Domain Services

#### RefundPolicy（審核策略）

```typescript
RefundPolicy.evaluate(refund: Refund, orderContext: OrderContext, refundHistory: number): PolicyDecision

自動通過條件（全部滿足）:
  1. 申請距下單 ≤ maxAutoApprovalDays（預設 7 天）
  2. 退款總額 ≤ maxAutoApprovalAmount（預設 $100）
  3. 用戶近期退款次數 ≤ maxRecentRefunds（預設 3 次 / 30 天）
  4. 退款原因在 autoApprovalReasons 白名單中（預設排除 Other）

否則 → ManualReview
```

#### RefundCalculator（金額計算）

```typescript
RefundCalculator.calculate(items: ReturnItem[], orderContext: OrderContext, fees: RefundFees): RefundCalculation

折扣分攤演算法:
  1. 計算退貨品項原價小計
  2. 計算退貨品項佔訂單總額的比例
  3. 按比例分攤訂單折扣
  4. 各品項折後價 = 原價 - 分攤折扣
  5. subtotal = 所有退貨品項折後價之和

手續費計算:
  1. 若退款原因在 waivedReasons 中 → 手續費全免
  2. restockingFee = subtotal × restockingFeeRate
  3. shippingFee = 固定物流費
  4. totalDeductions = restockingFee + shippingFee
  5. refundAmount = subtotal - totalDeductions

所有金額使用整數分（cents），避免浮點誤差。
```

### 1.6 Domain Ports（防腐層）

```typescript
// 定義在 Refund Domain，由 Infrastructure 實現
IOrderQueryPort {
  getOrderContext(orderId: string): Promise<OrderContext>
}

IRefundHistoryPort {
  countRecentRefunds(userId: string, withinDays: number): Promise<number>
}
```

### 1.7 Domain Events

| Event | 觸發時機 | 消費者 |
|---|---|---|
| `RefundRequested` | 用戶提交退款申請 | AuditLog, Notification |
| `RefundAutoApproved` | 策略自動通過 | Notification |
| `RefundManualReviewRequired` | 需人工審核 | Notification（通知管理員） |
| `RefundApproved` | 審核通過（自動或人工） | — |
| `RefundRejected` | 審核拒絕 | Notification |
| `ReturnItemsShipped` | 用戶寄出退貨 | — |
| `ReturnItemsReceived` | 倉庫確認收貨 | Inventory（回補庫存） |
| `RefundProcessing` | 開始退款 | Payment（發起反向操作） |
| `RefundCompleted` | 退款完成 | Order（更新狀態）, Notification |
| `RefundFailed` | 退款失敗 | Notification, AuditLog |

---

## 2. Application 層

### 2.1 Application Services

```typescript
// 命令側
RefundApplicationService
  ├── requestRefund(dto: CreateRefundDTO): Promise<RefundDTO>
  ├── approveRefund(refundId: string, reviewerId?: string): Promise<RefundDTO>
  ├── rejectRefund(refundId: string, reviewerId: string, note: string): Promise<RefundDTO>
  ├── markItemsShipped(refundId: string, trackingNumber?: string): Promise<RefundDTO>
  ├── confirmItemsReceived(refundId: string, itemConditions: ItemConditionDTO[]): Promise<RefundDTO>
  └── processRefund(refundId: string): Promise<RefundDTO>  // 觸發 RefundSaga

// 查詢側
IRefundQueryService
  ├── getById(refundId: string): Promise<RefundDTO | null>
  ├── getByOrderId(orderId: string): Promise<RefundDTO[]>
  ├── getByUserId(userId: string, pagination): Promise<PaginatedResult<RefundDTO>>
  └── getPendingReviews(pagination): Promise<PaginatedResult<RefundDTO>>
```

### 2.2 DTOs

```typescript
CreateRefundDTO {
  orderId: string
  type: 'refund_only' | 'return_and_refund'
  items: { orderLineId: string, quantity: number, reason: string }[]
}

RefundDTO {
  id: string
  orderId: string
  userId: string
  type: string
  status: string
  items: ReturnItemDTO[]
  calculation: RefundCalculationDTO | null
  policy: PolicyDecisionDTO | null
  reason: string
  requestedAt: string
  resolvedAt: string | null
}

ItemConditionDTO {
  returnItemId: string
  condition: 'good' | 'damaged' | 'missing'
}
```

### 2.3 RefundSaga

```
RefundSaga（Approved 後觸發）:

Step 1: UpdateOrderStatus
  execute    → Order 標記「部分退款中」
  compensate → Order 回復原狀態

Step 2: RestoreInventory（僅 ReturnAndRefund + ItemsReceived）
  execute    → Inventory 回補庫存
  compensate → Inventory 扣回庫存

Step 3: ProcessPaymentRefund
  execute    → Payment 發起原路退款
  compensate → 標記 Failed（Payment 退款無法補償）

Step 4: CompleteRefund
  execute    → Refund 狀態轉 Completed
  compensate → Refund 狀態轉 Failed
```

---

## 3. Presentation 層

### 3.1 REST API

| Method | Path | 用途 | 角色 |
|---|---|---|---|
| `POST` | `/refunds` | 提交退款申請 | User |
| `GET` | `/refunds/:id` | 查詢退款詳情 | User/Admin |
| `GET` | `/refunds?userId=&status=` | 查詢退款列表 | User/Admin |
| `GET` | `/orders/:orderId/refunds` | 查詢訂單的退款 | User/Admin |
| `POST` | `/refunds/:id/approve` | 審核通過 | Admin |
| `POST` | `/refunds/:id/reject` | 審核拒絕 | Admin |
| `POST` | `/refunds/:id/ship` | 標記已寄出退貨 | User |
| `POST` | `/refunds/:id/receive` | 確認收到退貨 | Admin |
| `GET` | `/refunds/pending-reviews` | 待審核列表 | Admin |

### 3.2 IRefundMessages（i18n Port）

```typescript
// 位於 Modules/Refund/Presentation/Ports/IRefundMessages.ts
IRefundMessages {
  notFound(): string
  alreadyProcessing(): string
  invalidStatusTransition(from: string, to: string): string
  requestSuccess(): string
  approveSuccess(): string
  rejectSuccess(): string
  itemsShippedSuccess(): string
  itemsReceivedSuccess(): string
  refundCompleted(amount: string): string
  refundFailed(): string
  missingRequiredFields(): string
  exceedsOrderAmount(): string
  orderNotEligible(): string
  policyAutoApproved(): string
  policyManualReviewRequired(): string
}
```

---

## 4. Infrastructure 層

### 4.1 Repository

`RefundRepository` 實現 `IRefundRepository`，使用 `IDatabaseAccess` Port，ORM 無關。

### 4.2 防腐層 Adapters

- `OrderQueryAdapter`：實現 `IOrderQueryPort`，從 Order 模組查詢訂單上下文
- `RefundHistoryAdapter`：實現 `IRefundHistoryPort`，從 Refund Repository 統計退款次數

### 4.3 Event Handlers

- `PaymentRefundHandler`：監聽 `PaymentRefunded` → Refund 轉 Completed
- `PaymentRefundHandler`：監聽 `PaymentRefundFailed` → Refund 轉 Failed

### 4.4 Payment 模組擴展

Payment 模組需新增：
- `PaymentService.refund(paymentId: string, amount: Money): Promise<void>`
- `PaymentRefunded` 事件
- `PaymentRefundFailed` 事件

### 4.5 翻譯檔案

```
resources/lang/zh-TW/refund.json
resources/lang/en/refund.json
```

---

## 5. 模組目錄結構

```
app/Modules/Refund/
├── Domain/
│   ├── Entities/
│   │   ├── Refund.ts
│   │   └── ReturnItem.ts
│   ├── ValueObjects/
│   │   ├── RefundId.ts
│   │   ├── RefundType.ts
│   │   ├── RefundStatus.ts
│   │   ├── RefundReason.ts
│   │   ├── RefundCalculation.ts
│   │   ├── RefundFees.ts
│   │   ├── PolicyDecision.ts
│   │   ├── RefundPolicyConfig.ts
│   │   ├── OrderReference.ts
│   │   ├── OrderContext.ts
│   │   ├── Money.ts
│   │   └── ItemCondition.ts
│   ├── Repositories/
│   │   └── IRefundRepository.ts
│   ├── Ports/
│   │   ├── IOrderQueryPort.ts
│   │   └── IRefundHistoryPort.ts
│   ├── Services/
│   │   ├── RefundPolicy.ts
│   │   └── RefundCalculator.ts
│   └── Events/
│       ├── RefundRequested.ts
│       ├── RefundAutoApproved.ts
│       ├── RefundManualReviewRequired.ts
│       ├── RefundApproved.ts
│       ├── RefundRejected.ts
│       ├── ReturnItemsShipped.ts
│       ├── ReturnItemsReceived.ts
│       ├── RefundProcessing.ts
│       ├── RefundCompleted.ts
│       └── RefundFailed.ts
├── Application/
│   ├── Services/
│   │   └── RefundApplicationService.ts
│   ├── Queries/
│   │   └── IRefundQueryService.ts
│   ├── DTOs/
│   │   ├── CreateRefundDTO.ts
│   │   ├── RefundDTO.ts
│   │   ├── ReturnItemDTO.ts
│   │   └── ItemConditionDTO.ts
│   └── Sagas/
│       └── RefundSaga.ts
├── Presentation/
│   ├── Controllers/
│   │   └── RefundController.ts
│   ├── Routes/
│   │   └── Refund.routes.ts
│   └── Ports/
│       └── IRefundMessages.ts
├── Infrastructure/
│   ├── Repositories/
│   │   └── RefundRepository.ts
│   ├── Adapters/
│   │   ├── OrderQueryAdapter.ts
│   │   └── RefundHistoryAdapter.ts
│   ├── Services/
│   │   ├── RefundMessageService.ts
│   │   └── RefundQueryService.ts
│   ├── EventHandlers/
│   │   └── PaymentRefundHandler.ts
│   └── Providers/
│       └── RefundServiceProvider.ts
├── index.ts
└── tests/
    ├── Unit/
    │   ├── Refund.test.ts
    │   ├── RefundCalculator.test.ts
    │   ├── RefundPolicy.test.ts
    │   └── ValueObjects.test.ts
    ├── Integration/
    │   ├── RefundRepository.test.ts
    │   ├── RefundSaga.test.ts
    │   └── RefundEventHandlers.test.ts
    └── E2E/
        └── RefundFlow.test.ts
```

---

## 6. 測試策略

### 6.1 Unit Tests（~25 個）

| 測試檔案 | 測試重點 | 預估數量 |
|---|---|---|
| `Refund.test.ts` | 狀態機轉換（合法/非法）、建立退款、新增退貨品項 | 8 |
| `RefundCalculator.test.ts` | 折扣分攤演算法、手續費計算、免手續費情境、整數精度 | 7 |
| `RefundPolicy.test.ts` | 自動通過/人工審核各條件組合、邊界值 | 6 |
| `ValueObjects.test.ts` | Money 運算、RefundStatus 轉換驗證、RefundReason 建構 | 4 |

### 6.2 Integration Tests（~12 個）

| 測試檔案 | 測試重點 | 預估數量 |
|---|---|---|
| `RefundRepository.test.ts` | CRUD、按 orderId/userId 查詢、分頁 | 4 |
| `RefundSaga.test.ts` | 正向完成、中途失敗補償、部分補償失敗容錯 | 4 |
| `RefundEventHandlers.test.ts` | PaymentRefunded → Completed、PaymentRefundFailed → Failed | 4 |

### 6.3 E2E Tests（~8 個）

| 測試場景 | 描述 |
|---|---|
| 僅退款完整流程 | 申請 → 自動通過 → Payment 退款 → 完成 |
| 退貨退款完整流程 | 申請 → 審核 → 寄出 → 收貨 → 退款 → 完成 |
| 部分退貨 | 訂單 3 件退 1 件，驗證折扣分攤正確 |
| 人工審核拒絕 | 申請 → 人工審核 → 拒絕 |
| Saga 補償 | Payment 退款失敗 → 回滾 Order 狀態 |
| 不合法狀態轉換 | 已完成的退款再次審核 → 報錯 |
| 防濫用 | 30 天內第 4 次退款 → 強制人工審核 |
| 手續費豁免 | Defective 原因 → 手續費為 0 |

### 總計：~45 個測試，目標覆蓋率 80%+

---

## 7. 跨模組影響

### Payment 模組新增

- `refund()` 方法
- `PaymentRefunded` 事件
- `PaymentRefundFailed` 事件

### Order 模組

- 監聽 `RefundCompleted` 更新訂單狀態（可選，由 Saga Step 1 處理）

### Inventory 模組

- 監聯 `ReturnItemsReceived` 回補庫存（由 Saga Step 2 處理）

### Notification 模組

- 監聽 Refund 事件發送通知（退款申請、審核結果、退款完成）

### AuditLog 模組

- 監聽 `RefundRequested`、`RefundFailed` 記錄審計日誌
