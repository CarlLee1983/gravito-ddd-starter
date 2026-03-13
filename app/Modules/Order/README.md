# Order 模組

Order 模組實現完整的訂單管理系統，包括狀態機、事件驅動架構和跨模組事件監聽。

## 架構設計

### Domain 層

**聚合根**: `Order`
- 狀態機: `Pending → Confirmed → Shipped / Cancelled`
- 業務規則:
  - Pending 狀態無法重複轉為 Pending
  - Shipped 狀態無法取消
  - Cancelled 狀態無法轉為其他狀態

**實體**: `OrderLine`
- 訂單行項目
- 包含產品 ID、名稱、數量、單價和小計

**值物件**:
- `OrderId`: 訂單唯一標識
- `OrderStatus`: 訂單狀態（Pending/Confirmed/Shipped/Cancelled）
- `Money`: 金額表示（金額 + 幣種）
- `OrderTotal`: 訂單總額（小計 + 稅金 + 總計）

**Events**:
- `OrderPlaced`: 訂單建立時發佈，供 Payment 等模組監聽
- `OrderConfirmed`: 訂單確認時發佈
- `OrderShipped`: 訂單發貨時發佈
- `OrderCancelled`: 訂單取消時發佈

### Application 層

**服務**: `PlaceOrderService`
- 協調建立訂單的業務流程
- 驗證輸入、計算總額、創建聚合根、保存到數據庫

### Infrastructure 層

**Repository**: `OrderRepository`
- 實現 `IOrderRepository` 介面
- 與數據庫交互（Gravito ORM）
- 分派領域事件到事件調度器

**ServiceProvider**: `OrderServiceProvider`
- 註冊 Repository、Service、Event Listeners
- 配置依賴注入容器

**Event Listeners**:
- `CartCheckoutRequested`: 監聽購物車結帳事件，自動建立訂單
- `PaymentCompleted`: 監聽支付完成事件，自動確認訂單

### Presentation 層

**Controller**: `OrderController`
- `POST /orders` - 建立訂單
- `GET /orders/:id` - 獲取訂單詳情
- `GET /users/:userId/orders` - 獲取用戶訂單列表
- `POST /orders/:id/confirm` - 確認訂單
- `POST /orders/:id/ship` - 發貨
- `POST /orders/:id/cancel` - 取消訂單

## API 示例

### 建立訂單

```bash
POST /orders
Content-Type: application/json

{
  "userId": "user-123",
  "lines": [
    {
      "productId": "prod-1",
      "productName": "商品 A",
      "quantity": 2,
      "unitPrice": 100
    }
  ],
  "taxAmount": 40
}
```

**回應** (201):
```json
{
  "success": true,
  "data": {
    "orderId": "ord-xyz",
    "userId": "user-123",
    "status": "PENDING",
    "lines": [
      {
        "productId": "prod-1",
        "productName": "商品 A",
        "quantity": 2,
        "unitPrice": 100,
        "lineTotal": 200
      }
    ],
    "total": {
      "subtotal": 200,
      "tax": 40,
      "total": 240,
      "currency": "TWD"
    },
    "createdAt": "2026-03-13T10:00:00Z",
    "updatedAt": "2026-03-13T10:00:00Z"
  }
}
```

### 確認訂單

```bash
POST /orders/ord-xyz/confirm
```

### 發貨

```bash
POST /orders/ord-xyz/ship
Content-Type: application/json

{
  "trackingNumber": "TRACK-123456"
}
```

### 取消訂單

```bash
POST /orders/ord-xyz/cancel
Content-Type: application/json

{
  "reason": "客戶要求取消"
}
```

## 事件驅動集成

### OrderPlaced 事件

其他模組可訂閱此事件進行後續業務邏輯：

```typescript
eventDispatcher.subscribe('OrderPlaced', async (event: OrderPlaced) => {
  // 發送訂單確認郵件
  // 初始化支付流程
  // 扣減庫存
})
```

### 跨模組事件流

1. **Cart 模組** → 發佈 `CartCheckoutRequested`
2. **Order 模組** ← 監聽並建立訂單，發佈 `OrderPlaced`
3. **Payment 模組** ← 監聽 `OrderPlaced` 並進行支付處理，發佈 `PaymentCompleted`
4. **Order 模組** ← 監聽 `PaymentCompleted` 並確認訂單

## 測試

模組包含約 74 個單元測試，覆蓋：

- **Domain 層** (40 tests):
  - ValueObjects 驗證
  - Order 聚合根行為
  - 狀態機轉換規則

- **Application 層** (20 tests):
  - PlaceOrderService 建立邏輯
  - 金額計算
  - 輸入驗證

- **Infrastructure 層** (14 tests):
  - Repository CRUD 操作
  - 事件分派
  - 錯誤處理

運行測試：

```bash
bun test tests/Unit/Modules/Order
```

## 設計原則

✅ **Domain 層 ORM 無關**: Order 聚合根完全不知道 ORM 選擇
✅ **Port/Adapter 模式**: Repository 介面定義於 Domain，實現在 Infrastructure
✅ **事件驅動**: 所有狀態變化通過事件發佈，支持非同步處理
✅ **不可變性**: 所有操作返回新物件，不修改原物件
✅ **完整驗證**: 所有業務規則在 Domain 層強制執行

## 擴展點

### 添加新狀態

1. 在 `OrderStatus.ts` 添加新的 `OrderStatusEnum` 值
2. 在 `Order.ts` 添加新的狀態轉換方法
3. 在 `OrderController.ts` 添加對應的 HTTP 端點
4. 編寫單元測試驗證新狀態行為

### 集成新的 ORM

只需修改 `OrderRepository.ts`，不影響其他層代碼。新的 ORM 實現應：
- 實現 `IOrderRepository` 介面
- 維持相同的方法簽名
- 正確分派領域事件

---

**更新於**: 2026-03-13
**Version**: 1.0.0
