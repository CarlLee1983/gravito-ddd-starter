# Inventory 應用層與防腐層設計

**日期**: 2026-03-18
**版本**: 1.0
**狀態**: ✅ 應用層設計完成
**實施**: A2.3

---

## 概述

**應用層職責**:
- 封裝業務用例（預留、扣減、釋放庫存）
- 協調 Domain 層與 Infrastructure 層
- 不依賴具體 ORM，只使用 IDatabaseAccess Port

**應用層組件**:

1. **ReserveInventoryService** - 預留庫存用例
2. **DeductInventoryService** - 扣減庫存用例
3. **InventoryCommandAdapter** - 防腐層實現

---

## 應用層服務

### 1. ReserveInventoryService

**職責**: 購物車結帳時預留庫存

**流程**:
```
Request: {productId, quantity, orderId}
  ↓
1. 查詢 Inventory 聚合根
2. 驗證庫存存在
3. 驗證可用庫存 >= quantity
4. 呼叫 inventory.reserve()
5. 保存聚合根（同時保存 InventoryReserved 事件）
6. 返回預留結果
  ↓
Response: {inventoryId, sku, reserved, available}
```

**異常情況**:
- 商品不存在 → `Error: '商品庫存不存在'`
- 庫存不足 → `Error: '庫存不足：需要 X，可用 Y'`
- 樂觀鎖衝突 → `OptimisticLockException`（傳播至 Saga）

**實現細節**:
```typescript
async execute(request): Promise<Response> {
  // 1. 查詢
  const inventory = await this.repo.findByProductId(request.productId)
  if (!inventory) throw Error('...')

  // 2. 驗證
  if (!inventory.hasAvailable(request.quantity)) throw Error('...')

  // 3. 預留（Domain 層）
  inventory.reserve(request.quantity, request.orderId)

  // 4. 保存（Transport 至 Repository）
  await this.repo.save(inventory)  // 樂觀鎖檢查在此
}
```

### 2. DeductInventoryService

**職責**: 訂單支付成功時扣減庫存

**流程**:
```
Request: {productId, quantity, orderId}
  ↓
1. 查詢 Inventory 聚合根
2. 驗證庫存存在
3. 驗證預留庫存 >= quantity
4. 呼叫 inventory.deduct()
5. 保存聚合根（同時保存 InventoryDeducted 事件）
6. 返回扣減結果
  ↓
Response: {inventoryId, quantity, available}
```

**特點**:
- 必須在 `reserve()` 之後調用（預設預留已存在）
- 扣減 = 預留 → 已售出（預留-數量，總庫存-數量）
- 只在支付成功後調用

---

## 防腐層設計（Anti-Corruption Layer）

### 為什麼需要防腐層？

**現狀問題**:
- Cart 直接依賴 Inventory
- 若 Inventory 變更，Cart 代碼也需改動
- 難以測試（無法獨立 Mock Inventory）

**防腐層解決方案**:
- Cart 只依賴 `IInventoryCommandPort` Port（Cart 定義）
- Inventory 實現該 Port 的 Adapter
- 變更時只需修改 Adapter，Cart 代碼零改動

### 1. IInventoryCommandPort（防腐層 Port）

**位置**: `Cart/Domain/Ports/IInventoryCommandPort.ts`

**責任**: 定義 Cart 對 Inventory 的需求介面

**公開方法**:
```typescript
// 查詢庫存可用性
checkAvailability(productId, quantity): Promise<{available, currentStock}>

// 預留庫存
reserve(productId, quantity, orderId): Promise<{reservationId, reserved, available}>

// 扣減庫存
deduct(productId, quantity, orderId): Promise<{inventoryId, remainingStock}>

// 釋放預留（補償）
release(productId, quantity, orderId, reason): Promise<void>
```

**設計原則**:
- ✅ 只暴露 Cart 關心的操作
- ✅ 隱藏 Inventory 的內部模型（版本、聚合根等）
- ✅ 返回值簡化（不返回 SKU 等複雜物件）
- ✅ 易於 Mock 測試

### 2. InventoryCommandAdapter（防腐層實現）

**位置**: `Inventory/Infrastructure/Adapters/InventoryCommandAdapter.ts`

**責任**: 實現 Cart 的 Port，橋接至 Inventory 領域

**實現方式**:
```
Cart Request (IInventoryCommandPort)
  ↓
InventoryCommandAdapter
  ├─ 查詢 Inventory 聚合根
  ├─ 呼叫聚合根方法
  ├─ 保存至 Repository
  └─ 返回簡化的結果
  ↓
Cart Response
```

**翻譯邏輯示例** (reserve):
```typescript
// Cart 側調用
const result = await inventoryPort.reserve(productId, qty, orderId)

// 實際執行
// 1. InventoryCommandAdapter.reserve()
// 2. 查詢 inventory = await repo.findByProductId(productId)
// 3. inventory.reserve(qty, orderId)  // Domain 操作
// 4. await repo.save(inventory)        // Repository 持久化
// 5. return {reservationId: inventory.id, ...}
```

---

## 依賴流向圖

### 模組依賴（高層視圖）

```
┌─────────────────────┐
│   Cart Module       │
│                     │
│ Domain/Application/ │
│ Presentation        │
└──────────┬──────────┘
           │ 依賴
           ↓
┌─────────────────────────────────────┐
│ IInventoryCommandPort               │
│ (防腐層 Port，Cart 定義)             │
└──────────┬──────────────────────────┘
           │ 實現
           ↓
┌─────────────────────────────────────┐
│ InventoryCommandAdapter             │
│ (Inventory 提供)                     │
└──────────┬──────────────────────────┘
           │ 依賴
           ↓
┌─────────────────────┐
│ Inventory Module    │
│                     │
│ Domain/Application/ │
│ Infrastructure      │
└─────────────────────┘
```

### 詳細互動流程

```
CheckoutSaga
  ├─ Step 1: CreateOrder
  │   └─ Order.create()
  │
  ├─ Step 2: InitiatePayment
  │   └─ Payment.initiate()
  │
  └─ Step 3: ReserveInventory ← 新增！
      └─ inventoryPort.reserve()
          ├─ InventoryCommandAdapter
          │   ├─ repo.findByProductId()
          │   ├─ inventory.reserve()
          │   └─ repo.save()
          │
          └─ InventoryAggregate
              ├─ SKU.reserve()
              ├─ InventoryReserved 事件
              └─ version++
```

---

## 集成至 Service Provider

### Inventory ServiceProvider

```typescript
export class InventoryServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 1. 註冊 Repository
    container.singleton('inventoryRepository', (c) => {
      const db = c.make('database')
      return new MemoryInventoryRepository()  // 或 Atlas/Drizzle
    })

    // 2. 註冊應用服務
    container.singleton('reserveInventoryService', (c) => {
      const repo = c.make('inventoryRepository')
      const db = c.make('database')
      return new ReserveInventoryService(repo, db)
    })

    container.singleton('deductInventoryService', (c) => {
      const repo = c.make('inventoryRepository')
      return new DeductInventoryService(repo)
    })

    // 3. 註冊防腐層 Adapter（實現 Cart 的 Port）
    container.singleton('inventoryCommandPort', (c) => {
      const repo = c.make('inventoryRepository')
      return new InventoryCommandAdapter(repo)
    })
  }
}
```

### Cart 模組中注入

```typescript
// Cart Application Service
export class CartApplicationService {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly inventoryPort: IInventoryCommandPort  // ← 注入防腐層
  ) {}

  async checkout(cartId: string, orderId: string): Promise<void> {
    const cart = await this.cartRepository.findById(cartId)

    // 驗證庫存
    for (const item of cart.items) {
      const {available} = await this.inventoryPort.checkAvailability(
        item.productId,
        item.quantity
      )
      if (!available) throw Error('庫存不足')
    }

    // 預留庫存（由 Saga 調用）
    for (const item of cart.items) {
      await this.inventoryPort.reserve(
        item.productId,
        item.quantity,
        orderId
      )
    }
  }
}
```

---

## 測試策略

### Unit Tests（應用層）

```typescript
describe('ReserveInventoryService', () => {
  it('should reserve inventory when available', async () => {
    const mockRepo = new MockInventoryRepository()
    const service = new ReserveInventoryService(mockRepo)

    const result = await service.execute({
      productId: 'prod-1',
      quantity: 5,
      orderId: 'ord-1'
    })

    expect(result.reserved).toBe(5)
  })

  it('should throw when inventory insufficient', async () => {
    const mockRepo = new MockInventoryRepository({available: 3})
    const service = new ReserveInventoryService(mockRepo)

    await expect(() => service.execute({
      productId: 'prod-1',
      quantity: 5,
      orderId: 'ord-1'
    })).rejects.toThrow('庫存不足')
  })
})
```

### Integration Tests（防腐層）

```typescript
describe('InventoryCommandAdapter', () => {
  it('should adapt Cart request to Inventory operation', async () => {
    const repo = new MemoryInventoryRepository()
    const adapter = new InventoryCommandAdapter(repo)

    // Cart 呼叫防腐層
    const result = await adapter.reserve('prod-1', 5, 'ord-1')

    // 驗證 Inventory 聚合根被更新
    const inventory = await repo.findByProductId('prod-1')
    expect(inventory.reserved).toBe(5)
    expect(result.reserved).toBe(5)
  })
})
```

### Mock 實現（測試 Cart）

```typescript
// Cart 測試時使用 Mock
class MockInventoryCommandPort implements IInventoryCommandPort {
  async checkAvailability() {
    return {available: true, currentStock: 100}
  }

  async reserve() {
    return {reservationId: 'res-1', reserved: 5, available: 95}
  }

  // ...
}

// Cart 測試無需真實 Inventory
const cartService = new CartApplicationService(
  cartRepo,
  new MockInventoryCommandPort()  // 使用 Mock
)
```

---

## 設計決策

### 1. 防腐層在消費者側（Cart）定義

**決策**: `IInventoryCommandPort` 在 Cart Domain/Ports 定義

**原因**:
- ✅ Cart 定義自己的需求，不被 Inventory 影響
- ✅ Inventory 被迫遵守 Cart 的介面
- ✅ 避免雙向依賴

### 2. Adapter 在提供者側（Inventory）實現

**決策**: `InventoryCommandAdapter` 在 Inventory Infrastructure/Adapters 實現

**原因**:
- ✅ Inventory 負責適配 Cart 的需求
- ✅ 符合「高層模組→低層模組」的依賴原則

### 3. 簡化的返回值

**決策**: 返回簡化後的結果（如 `{available, currentStock}`），不返回 SKU 等複雜物件

**原因**:
- ✅ Cart 不需知道 SKU 的內部結構
- ✅ 隱藏 Inventory 的實現細節
- ✅ 易於未來替換為遠程服務

---

## 異常處理

### 應用層異常

| 異常 | 來源 | 處理 |
|------|------|------|
| `Error: '商品不存在'` | Repository | 傳播至 Saga（訂單失敗） |
| `Error: '庫存不足'` | Domain 驗證 | 傳播至 Saga（觸發補償） |
| `OptimisticLockException` | Repository | 傳播至 Saga（重試或取消） |

### Saga 中的異常處理

```typescript
try {
  await inventoryPort.reserve(productId, qty, orderId)
} catch (error) {
  if (error instanceof OptimisticLockException) {
    // 樂觀鎖衝突 → 觸發補償
    context.fail('Inventory version conflict')
  } else {
    // 其他錯誤 → 觸發補償
    context.fail(error.message)
  }
}
```

---

## 完整流程圖

```
購物車結帳開始
  ↓
CheckoutSaga.execute()
  ├─ Step 1: createOrder()
  │   └─ Order.create() → OrderPlaced
  │
  ├─ Step 2: initiatePayment()
  │   ├─ Payment.initiate() → PaymentInitiated
  │   └─ Payment.process() → PaymentSucceeded
  │
  └─ Step 3: reserveInventory() ← NEW！
      ├─ inventoryPort.reserve()
      │   ├─ InventoryCommandAdapter
      │   │   ├─ repo.findByProductId()
      │   │   ├─ inventory.reserve()
      │   │   └─ repo.save()
      │   │       └─ InventoryReserved 事件
      │   └─ return {reservationId, reserved, available}
      │
      └─ 若失敗：
         ├─ 補償 Step 2: payment.refund()
         ├─ 補償 Step 1: order.cancel()
         └─ Saga 結束（失敗）

成功 → Order confirmed
```

---

## 後續（A2.4）

**CheckoutSaga 升級**:
- [ ] 新增 ReserveInventorySagaStep
- [ ] 更新 CheckoutSaga 流程圖
- [ ] 測試補償場景

---

**更新於**: 2026-03-18
**下次步驟**: A2.4 - CheckoutSaga 升級至 3 步驟
