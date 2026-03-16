# 🗄️ 資料庫操作指南 (ORM Guide)

本指南介紹如何使用 Gravito DDD Starter 中的資料庫工具。系統設計將 **ORM 工具** 與 **底層資料庫系統** 解耦，讓開發者能根據環境需求靈活組合。

---

## 📋 核心概念

| 維度 | 選項 | 說明 |
| :--- | :--- | :--- |
| **ORM (工具)** | `memory`, `drizzle`, `atlas` | 決定操作資料的適配器與語法。 |
| **System (系統)** | `sqlite`, `postgres`, `mysql` | 決定資料實際存放的引擎。 |

---

## ⚙️ 環境配置 (Environment)

在 `.env` 中透過 `ORM` 選取工具，透過 `DB_CONNECTION` 選取系統：

### 1. 本地開發與單元測試 (最快)
使用 JS Map 模擬資料庫行為，無需安裝任何資料庫軟體。
```bash
ORM=memory
```

### 2. 輕量級持久化 (SQLite)
使用 Drizzle 或 Atlas 作為工具，操作 SQLite 檔案或記憶體資料庫。
```bash
ORM=drizzle
# 或 ORM=atlas
DB_CONNECTION=sqlite
DB_DATABASE=./database.sqlite
```

### 3. 生產級資料庫 (PostgreSQL / MySQL)
使用 Atlas 或 Drizzle 連接大型資料庫系統。
```bash
ORM=atlas
DB_CONNECTION=postgres # 或 mysql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gravito_ddd
DB_USER=postgres
DB_PASSWORD=secret
```

---

## 🔍 查詢投影與效能優化 (Projection & Optimization)

為了提升 CQRS 讀取側的效能，`IDatabaseAccess` 支援 **查詢投影 (Projection)**。透過明確指定所需欄位，可避免 `SELECT *` 造成的資料過載。

### 1. 取得多筆記錄 (select)

```typescript
// ❌ 不推薦：選取所有欄位（隱含 SELECT *）
const all = await db.table('products').select()

// ✅ 推薦：僅選取必要欄位（投影優化）
const products = await db.table('products').select(['id', 'name', 'price'])
```

### 2. 取得單筆記錄 (first)

```typescript
// ❌ 不推薦：選取所有欄位
const user = await db.table('users').where('id', '=', '1').first()

// ✅ 推薦：僅選取必要欄位
const user = await db.table('users')
  .where('id', '=', '1')
  .first(['id', 'email', 'display_name'])
```

### 🚀 效能效益
- **減少網路負擔**：僅傳輸必要資料列。
- **節省記憶體**：無需在應用層實例化不必要的屬性。
- **資料安全性**：在資料庫層級即過濾掉敏感欄位（如 `password`）。

---

## 🔄 Migration 工作流程

*(以下內容保持不變，主要說明如何建立與執行遷移檔案)*
...
