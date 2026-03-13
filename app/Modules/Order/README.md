# Order 模組 — 訂單管理

## 概述

Order 模組管理訂單生命週期，實現完整的狀態機設計，並監聽 Cart 模組的事件自動建立訂單。

## 核心職責

- 訂單生命週期管理（建立、確認、發貨、取消）
- 完整的狀態機實現
- 事件監聽（CartCheckoutRequested）
- 事件發佈（OrderPlaced、OrderConfirmed）

## Domain 層

### Aggregate Root — Order
狀態機：`Pending → Confirmed → Shipped` 或 `Cancelled`

- `place()` — 建立訂單
- `confirm()` — 確認訂單
- `ship()` — 發貨
- `cancel()` — 取消

### Entities
- `OrderLine` — 訂單行項目（快照式設計）

### ValueObjects
- `OrderId` — UUID 訂單識別碼
- `OrderStatus` — 訂單狀態
- `Money` — 金額 + 貨幣
- `OrderTotal` — 訂單總額

## Application 層 — 事件監聽

### CartCheckoutRequestedHandler
自動監聽 Cart 的 `CartCheckoutRequested` 事件，建立訂單並發佈 `OrderPlaced` 事件。

## REST API

```bash
# 建立訂單
POST /api/orders

# 確認訂單
POST /api/orders/:id/confirm

# 發貨
POST /api/orders/:id/ship

# 取消訂單
POST /api/orders/:id/cancel

# 查詢用戶訂單
GET /api/users/:userId/orders
```

## 業務規則

- 已發貨無法取消
- 已確認無法再次確認
- 只能從 Pending/Confirmed 狀態取消

## 設計特點

✅ 完整的狀態機設計
✅ 業務規則強制執行
✅ 跨模組事件監聽
✅ Event Sourcing 支援

## 測試

```bash
bun test tests/Unit/Modules/Order/
```

## 參考文檔

- [購物系統完整開發指南](../../docs/04-Module-Development/SHOPPING_MODULES_GUIDE.md)
