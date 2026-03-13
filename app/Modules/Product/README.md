# Product 模組 — 商品管理

## 概述

Product 模組是購物系統的基礎，負責商品資訊的建立、查詢、價格變更和庫存管理。

## 核心職責

- 商品資訊管理
- CQRS 讀側模型
- 商品事件發佈（ProductCreated、ProductPriceChanged、StockAdjusted）

## Domain 層

### Aggregate Root — Product
- `create()` — 建立新商品
- `changePrice()` — 變更價格
- `adjustStock()` — 調整庫存

### ValueObjects
- `ProductId` — UUID 商品識別碼
- `ProductName` — 商品名稱（1-200 字符）
- `Price` — 價格 + 貨幣（TWD/USD/EUR/JPY/CNY）
- `SKU` — 商品代碼（3-50 字符，唯一性）
- `StockQuantity` — 庫存數量（非負整數）

## REST API

```bash
# 建立商品
POST /api/products
{ "name": "...", "price": 100, "currency": "TWD", "sku": "...", "quantity": 50 }

# 獲取商品
GET /api/products/:id

# 列表
GET /api/products
```

## 設計特點

✅ Domain 層零 ORM 依賴
✅ Event Sourcing 完整支援
✅ CQRS 讀側設計
✅ 完整的業務規則驗證

## 測試

```bash
bun test tests/Unit/Modules/Product/
```

## 參考文檔

- [購物系統完整開發指南](../../docs/04-Module-Development/SHOPPING_MODULES_GUIDE.md)
- [架構設計](../../docs/02-Architecture/ARCHITECTURE.md)
