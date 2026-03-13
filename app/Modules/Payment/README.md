# Payment 模組

支付管理模組，實現支付狀態機（Initiated → Succeeded/Failed）和事件驅動架構。

## 功能

### Domain 層
- **Payment 聚合根**: 支付狀態機管理
  - 狀態: `INITIATED` (初始) → `SUCCEEDED` (成功) 或 `FAILED` (失敗)
  - 行為: `create()`, `succeed()`, `fail()`
  - 事件發佈: PaymentInitiated, PaymentSucceeded, PaymentFailed

### Value Objects
- **PaymentId**: 支付唯一識別符
- **Amount**: 金額（新台幣，以分為單位）
- **PaymentMethod**: 支付方式（信用卡、銀行轉帳、電子錢包、LINE Pay、Apple Pay）
- **PaymentStatus**: 支付狀態（初始、成功、失敗）
- **TransactionId**: 交易編號（來自支付網關）

### Application 層
- **InitiatePaymentService**: 建立新支付
- **HandlePaymentSuccessService**: 處理支付成功
- **HandlePaymentFailureService**: 處理支付失敗

### Infrastructure 層
- **PaymentRepository**: Repository 實現（支援 ORM 無關設計）
- **PaymentServiceProvider**: 依賴注入配置

### Presentation 層
- **PaymentController**: HTTP 控制器
  - GET `/api/payments/:id` - 取得支付記錄
  - GET `/api/payments/order/:orderId` - 依訂單取得支付
  - GET `/api/payments` - 列表查詢（含分頁）

## 支付方式

支援 5 種支付方式：
- 信用卡 (CREDIT_CARD)
- 銀行轉帳 (BANK_TRANSFER)
- 電子錢包 (WALLET_TRANSFER)
- LINE Pay (LINE_PAY)
- Apple Pay (APPLE_PAY)

## 事件驅動

### 發佈的事件

**PaymentInitiated** - 支付已建立
```typescript
new PaymentInitiated(paymentId, orderId, userId, amount, paymentMethod)
```

**PaymentSucceeded** - 支付成功
```typescript
new PaymentSucceeded(paymentId, orderId, transactionId)
```

**PaymentFailed** - 支付失敗
```typescript
new PaymentFailed(paymentId, orderId, reason)
```

### 跨 Bounded Context

其他模組（如 Order）可監聽這些事件：
- PaymentSucceeded → 確認訂單
- PaymentFailed → 取消訂單

## 使用例

### 建立支付
```typescript
const service = container.make('initiatePaymentService')
const result = await service.execute({
  orderId: 'ORD-001',
  userId: 'USER-001',
  amountCents: 50000, // 500 元
  paymentMethod: 'CREDIT_CARD'
})
```

### 標記支付成功
```typescript
const service = container.make('handlePaymentSuccessService')
await service.execute('PAY-ID', 'TXN-123')
```

### 標記支付失敗
```typescript
const service = container.make('handlePaymentFailureService')
await service.execute('PAY-ID', '卡片被拒絕')
```

## 金額處理

金額以新台幣（TWD）計價，以分為單位存儲（避免浮點數問題）：

```typescript
// 建立金額
const amount = new Amount(50000) // 500.00 元
console.log(amount.cents) // 50000
console.log(amount.dollars) // 500

// 從元轉換
const amount2 = Amount.fromTWD(99.99)
console.log(amount2.cents) // 9999
```

## 狀態轉換規則

```
Initiated → Succeeded ✓
Initiated → Failed ✓
Succeeded → * ✗ (無法再轉換)
Failed → * ✗ (無法再轉換)
```

## 資料庫模式

```sql
CREATE TABLE payments (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  amount_cents INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

## 測試覆蓋

- **91 個單元測試**
- **Value Objects 測試** (28 tests) - PaymentId, Amount, PaymentMethod, PaymentStatus 等
- **Aggregate 測試** (24 tests) - Payment 聚合根行為和狀態機
- **Application Service 測試** (39 tests) - 支付服務流程
- **Integration 測試** (76+ 場景) - 完整支付流程和邊界情況

## 架構特點

### ORM 無關設計
- Domain 層完全不知道 ORM
- Repository 實現依賴 `IDatabaseAccess` Port
- 可輕鬆切換 ORM（Atlas → Drizzle/Prisma/TypeORM）

### 事件驅動
- 聚合根發佈 DomainEvent
- Repository 分派事件至其他模組
- 支持跨 Bounded Context 通訊

### 完整的狀態機
- 明確的狀態定義和轉換規則
- 業務規則驗證
- 清晰的錯誤提示

## 相關文檔

- [DDD 架構設計](../../docs/02-Architecture/ARCHITECTURE.md)
- [模組生成指南](../../docs/04-Module-Development/MODULE_GENERATION_WITH_ADAPTERS.md)
- [抽象化規則](../../docs/02-Architecture/ABSTRACTION_RULES.md)
