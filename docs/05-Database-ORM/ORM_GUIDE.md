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

## 🔄 Migration 工作流程

*(以下內容保持不變，主要說明如何建立與執行遷移檔案)*
...
