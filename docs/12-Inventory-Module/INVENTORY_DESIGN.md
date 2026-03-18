# Inventory 模組設計文檔

**日期**: 2026-03-18
**版本**: 1.0
**狀態**: ✅ Domain 層設計完成
**模組**: Inventory
**團隊**: Phase A2

---

## 概述

**Inventory 模組** 管理商品庫存的完整生命週期：

1. **預留** (Reserve) - 購物車結帳時，為訂單預留庫存
2. **扣減** (Deduct) - 訂單支付成功後，預留→已售出
3. **釋放** (Release) - 訂單取消/失敗時，釋放預留（Saga 補償）

**關鍵目標**:
- ✅ 展示樂觀鎖衝突偵測（CheckoutSaga 中）
- ✅ 展示 Saga 3 步驟補償流程
- ✅ 實現庫存預留-扣減-釋放的完整狀態機
- ✅ 與 Cart/Order/Payment 模組協作

---

## Domain 層設計

### 1. SKU Value Object

**責任**: 代表商品庫存狀態（不可變）

**屬性**:
```typescript
{
  code: string        // SKU 代碼（商品編碼）
  quantity: number    // 總庫存
  reserved: number    // 已預留庫存
}
```

**計算屬性**:
```typescript
available = quantity - reserved  // 可用庫存
```

**核心操作**（返回新實例）:
- `reserve(amount)` - 預留庫存（驗證 available >= amount）
- `deduct(amount)` - 扣減庫存（將預留轉為已售出）
- `release(amount)` - 釋放預留（取消時恢復可用）
- `replenish(amount)` - 補充庫存

**設計特點**:
- ✅ 不可變模式：所有操作返回新 SKU 實例
- ✅ 驗證邏輯：方法内檢查庫存充足性
- ✅ 異常處理：拋出有意義的錯誤訊息

### 2. InventoryAggregate 聚合根

**責任**: 管理單個商品的庫存與樂觀鎖

**狀態**:
```typescript
{
  id: string              // 庫存 ID（= productId）
  sku: SKU               // SKU 值物件
  version: number        // 樂觀鎖版本號
  createdAt: Date        // 建立時間
}
```

**公開方法**:
- `reserve(amount, orderId)` - 預留庫存，產生 InventoryReserved 事件
- `deduct(amount, orderId)` - 扣減庫存，產生 InventoryDeducted 事件
- `release(amount, orderId, reason)` - 釋放預留，產生 InventoryReleased 事件
- `replenish(amount)` - 補充庫存
- `hasAvailable(amount)` - 檢查庫存是否充足

**工廠方法**:
- `create(inventoryId, skuCode, initialQuantity)` - 建立新庫存
- `reconstitute(...)` - 從 DB 還原

**Event Sourcing**:
- `applyEvent()` - 應用事件重構聚合根

### 3. Domain Events

**InventoryReserved** - 庫存已預留
```typescript
{
  inventoryId: string
  sku: string
  amount: number
  orderId: string         // 關聯訂單 ID
}
```

**InventoryDeducted** - 庫存已扣減
```typescript
{
  inventoryId: string
  sku: string
  amount: number
  orderId: string
}
```

**InventoryReleased** - 庫存已釋放（補償）
```typescript
{
  inventoryId: string
  sku: string
  amount: number
  orderId: string
  reason: string          // 'order_cancelled' 等
}
```

### 4. IInventoryRepository Port

**責任**: Inventory 聚合根的持久化

**方法**:
- `findByProductId(productId)` - 按商品 ID 查詢
- `findById(id)` - 按庫存 ID 查詢
- `save(inventory)` - 保存（支援樂觀鎖）
- `delete(id)` - 刪除
- `findAll(params)` - 列表（分頁）
- `count()` - 計數

**樂觀鎖**:
- Repository 實現必須檢查 version 字段
- 若版本不匹配，拋出 OptimisticLockException
- 在 CheckoutSaga 中演示衝突場景

---

## 業務流程

### 正常流程

```
1. 購物車結帳 (CartCheckoutRequested)
   └─ CheckoutSaga 啟動

2. CheckoutSaga Step 1: CreateOrder
   └─ Order 建立 (OrderPlaced)

3. CheckoutSaga Step 2: InitiatePayment
   └─ Payment 啟動 (PaymentInitiated)
   └─ Payment 成功 (PaymentSucceeded) ✓

4. CheckoutSaga Step 3: ReserveInventory ← 新增！
   └─ Inventory.reserve(amount) 呼叫
   └─ InventoryReserved 事件發出 ✓

5. 流程完成
   └─ Order.confirm()
```

### 補償流程（支付失敗）

```
1. CheckoutSaga Step 2 失敗
   └─ Payment 失敗 (PaymentFailed)

2. Saga 倒序補償
   └─ Step 3 補償（應發出但未執行，因為還未到達）
   └─ Step 2 補償：Payment.refund()
   └─ Step 1 補償：Order.cancel()

3. 還原狀態
   └─ 庫存無需釋放（未預留）
```

### 補償流程（庫存不足）

```
1. CheckoutSaga 成功到 Step 3
   └─ Inventory.reserve() 失敗（available < amount）

2. Saga 倒序補償
   └─ Step 3 補償：Inventory.release() ✓
   └─ Step 2 補償：Payment.refund() ✓
   └─ Step 1 補償：Order.cancel() ✓

3. 還原狀態
   └─ 庫存恢復、支付退款、訂單取消
```

---

## 與 Saga 的整合

### CheckoutSaga 3 步驟

```typescript
export class CheckoutSaga extends SequentialSaga {
  async execute(context: SagaContext): Promise<void> {
    // Step 1: CreateOrderStep
    const order = await this.executeStep(
      new CreateOrderStep(orderService),
      context
    )

    // Step 2: InitiatePaymentStep
    const payment = await this.executeStep(
      new InitiatePaymentStep(paymentService),
      context
    )

    // Step 3: ReserveInventoryStep ← NEW！
    const inventory = await this.executeStep(
      new ReserveInventorySagaStep(inventoryService),
      context
    )
  }
}
```

### ReserveInventorySagaStep

```typescript
export class ReserveInventorySagaStep implements ISagaStep {
  async execute(context: SagaContext): Promise<void> {
    // 預留庫存
    await this.inventoryService.reserve(
      productId,
      quantity,
      context.get('orderId')
    )
    context.set('reservationId', reservationId)
  }

  async compensate(context: SagaContext): Promise<void> {
    // 補償：釋放預留
    const reservationId = context.get('reservationId')
    await this.inventoryService.release(
      reservationId,
      'saga_compensation'
    )
  }
}
```

---

## 樂觀鎖衝突演示

### 場景：同時預留同一商品

```
Thread 1: Cart A 結帳，預留 5 件
  └─ Inventory.version = 0
  └─ 讀取版本：0
  └─ 預留 5 件
  └─ 寫入：version = 1 ✓

Thread 2: Cart B 結帳，預留 3 件
  └─ Inventory.version = 1（已改變！）
  └─ 讀取版本：0（過期）
  └─ 預留 3 件
  └─ 寫入版本檢查：version != 0
  └─ 拋出 OptimisticLockException ❌

結果：Cart B 需重試
```

### 在 Saga 中的處理

```typescript
try {
  await inventoryService.reserve(...)
} catch (error) {
  if (error instanceof OptimisticLockException) {
    // Saga 補償，訂單取消
    context.fail('Inventory conflict - order cancelled')
  }
}
```

---

## 與現有模組的關係

### Cart → Inventory（查詢防腐層）

**Cart 不直接依賴 Inventory**，而是透過 **IProductQueryPort** 查詢商品資訊：

```typescript
// Cart Domain/Ports/IProductQueryPort.ts
export interface IProductQueryPort {
  getProduct(productId: string): Promise<{
    id: string
    name: string
    price: number
    sku: string
    // ❌ 不包含 quantity/reserved（庫存隱藏）
  }>
}
```

**Inventory 完全隱藏在防腐層後**：
- Cart 模組不知道 Inventory 的存在
- Inventory 可獨立擴展（支援多倉庫、實時庫存等）
- 依賴方向：Cart → (Adapter) → Inventory

### Order ↔ Inventory（Saga 協調）

**Saga 是唯一的跨模組協調者**：

```
Order（被動）
  ← OrderPlaced 事件

Inventory（被動）
  ← InventoryReserved / InventoryReleased 事件

CheckoutSaga（主動協調）
  → Step 1: 建立 Order
  → Step 2: 初始化 Payment
  → Step 3: 預留 Inventory
  ← 若失敗，倒序補償
```

### Payment → Inventory（單向依賴）

Payment 不依賴 Inventory。
Inventory 在必要時訂閱 PaymentSucceeded 自動扣減（Future Phase）。

---

## 完整的文件結構

```
app/Modules/Inventory/
├── Domain/
│   ├── Aggregates/
│   │   └── InventoryAggregate.ts          ✅
│   ├── ValueObjects/
│   │   └── SKU.ts                         ✅
│   ├── Events/
│   │   ├── InventoryReserved.ts           ✅
│   │   ├── InventoryDeducted.ts           ✅
│   │   └── InventoryReleased.ts           ✅
│   └── Repositories/
│       └── IInventoryRepository.ts        ✅
│
├── Application/              ⏳ 待實現（A2.3）
│   ├── Services/
│   │   ├── ReserveInventoryService.ts
│   │   └── DeductInventoryService.ts
│   └── DTOs/
│       └── InventoryResponseDTO.ts
│
├── Infrastructure/           ⏳ 待實現（A2.5）
│   ├── Repositories/
│   │   ├── MemoryInventoryRepository.ts
│   │   ├── AtlasInventoryRepository.ts
│   │   └── DrizzleInventoryRepository.ts
│   └── Providers/
│       └── InventoryServiceProvider.ts
│
├── Presentation/             ⏳ 待實現
│   ├── Controllers/
│   │   └── InventoryController.ts
│   ├── Routes/
│   │   └── Inventory.routes.ts
│   └── Ports/
│       └── IInventoryMessages.ts
│
├── index.ts                  ✅
└── README.md                 ⏳ 待實現
```

---

## 下一步（A2.3-A2.4）

### A2.3：應用層與防腐層
- [ ] ReserveInventoryService
- [ ] DeductInventoryService
- [ ] IInventoryCommandPort（Cart 模組的防腐層）

### A2.4：CheckoutSaga 升級
- [ ] ReserveInventorySagaStep
- [ ] 更新 CheckoutSaga 至 3 步驟
- [ ] 補償邏輯實現

### A2.5-A2.6：Repository 與測試
- [ ] MemoryInventoryRepository 實現
- [ ] 20+ 單元與集成測試
- [ ] 樂觀鎖衝突場景測試

---

## 設計決策記錄

### 1. 為什麼 SKU 是 Value Object？

**決策**: SKU 採用 Value Object 而非 Entity

**原因**:
- ✅ 無獨立身份，只代表數值
- ✅ 不可變，所有操作返回新實例
- ✅ 可安全地用於並發檢測
- ✅ 易於測試與驗證

### 2. 為什麼 Inventory 有 version 字段？

**決策**: InventoryAggregate 包含樂觀鎖 version

**原因**:
- ✅ 同時預留時防衝突
- ✅ CheckoutSaga 可捕獲並補償
- ✅ 向 Repository 傳遞版本信息

### 3. 為什麼三個 Event 而非一個？

**決策**: 分開 InventoryReserved / InventoryDeducted / InventoryReleased

**原因**:
- ✅ 清晰的業務語義（預留 ≠ 扣減 ≠ 釋放）
- ✅ 支援不同的 Saga 步驟
- ✅ 易於事件投影與審計

---

**更新於**: 2026-03-18
**下次里程碑**: A2.3 應用層設計（預計 2026-03-19）
