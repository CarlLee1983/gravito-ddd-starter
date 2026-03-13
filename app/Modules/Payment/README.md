# Payment 模組 — 支付管理

## 概述

Payment 模組管理支付生命週期，支援 5 種支付方式，並監聽 Order 模組的事件自動發起支付。

## 核心職責

- 支付生命週期管理（發起、成功、失敗）
- 5 種支付方式支援
- 事件監聽（OrderPlaced）
- 事件發佈（PaymentSucceeded、PaymentFailed）

## Domain 層

### Aggregate Root — Payment
狀態機：`Initiated → Succeeded` 或 `Failed`

- `initiate()` — 發起支付
- `succeed()` — 標記成功（自動觸發 Order.confirm()）
- `fail()` — 標記失敗（自動觸發 Order.cancel()）

### ValueObjects
- `PaymentId` — UUID 支付識別碼
- `PaymentMethod` — 支付方式（CreditCard、BankTransfer、WalletTransfer、LinePay、ApplePay）
- `Amount` — 支付金額 + 貨幣
- `TransactionId` — 外部交易編號
- `PaymentStatus` — 支付狀態（Initiated、Succeeded、Failed）

## Application 層 — 事件監聽

### OrderPlacedHandler
自動監聽 Order 的 `OrderPlaced` 事件，發起支付並發佈 `PaymentSucceeded/Failed` 事件。

## REST API

```bash
# 發起支付
POST /api/payments
{ "orderId": "uuid", "amount": 100000, "currency": "TWD", "method": "credit_card" }

# 確認支付成功
POST /api/payments/:id/confirm

# 標記支付失敗
POST /api/payments/:id/fail

# 查詢訂單支付
GET /api/payments/order/:orderId
```

## 支付方式

- **CreditCard** — 信用卡
- **BankTransfer** — 銀行轉帳
- **WalletTransfer** — 電子錢包轉帳
- **LinePay** — LINE Pay
- **ApplePay** — Apple Pay

## 設計特點

✅ 完整的支付狀態機
✅ 5 種支付方式支援
✅ 跨模組事件驅動
✅ Event Sourcing 支援
✅ ORM 無關設計

## 測試

```bash
bun test tests/Unit/Modules/Payment/
```

## 參考文檔

- [購物系統完整開發指南](../../docs/04-Module-Development/SHOPPING_MODULES_GUIDE.md)
