# Cart 模組 — 購物車管理

## 概述

Cart 模組管理購物車生命週期，並透過防腐層隔離 Product Context。

## 核心職責

- 購物車生命週期管理（建立、添加商品、移除商品、結帳）
- 防腐層隔離（ProductCatalogAdapter）
- 購物流程事件發佈（CartCheckoutRequested）

## Domain 層

### Aggregate Root — Cart
- 每個用戶一個購物車 (userId-based)
- `addItem()` — 添加商品
- `removeItem()` — 移除商品
- `checkout()` — 結帳

### Entities
- `CartItem` — 購物車行項目（數量 1-99）

### 防腐層設計
`ProductCatalogAdapter` 隱藏 Product Context 細節，Cart Domain 層只知道 `IProductQueryPort` Port 介面。

## REST API

```bash
# 獲取購物車
GET /api/carts/:userId

# 添加商品
POST /api/carts/:userId/items
{ "productId": "uuid", "quantity": 2 }

# 移除商品
DELETE /api/carts/:userId/items/:itemId

# 結帳
POST /api/carts/:userId/checkout
```

## 業務規則

- 購物車最多 50 種商品
- 數量限制 1-99
- 同商品重複加入自動合併數量
- 空購物車不能結帳

## 設計特點

✅ 防腐層完全隔離 Product
✅ Domain 層零 Product 依賴
✅ Event Sourcing 支援
✅ 購物流程事件驅動

## 測試

```bash
bun test tests/Unit/Modules/Cart/
```

## 參考文檔

- [購物系統完整開發指南](../../docs/04-Module-Development/SHOPPING_MODULES_GUIDE.md)
