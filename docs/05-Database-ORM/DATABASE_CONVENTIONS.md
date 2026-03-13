# 📏 資料庫開發規範 (Database Conventions)

為了確保不同 ORM 工具（Memory, Drizzle, Atlas）與底層系統（SQLite, PostgreSQL）之間的一致性，本專案制定了以下命名與設計規範。

---

## 1. 命名準則 (Naming)

### 資料表 (Tables)
- **複數形式**: 使用小寫複數名詞。
  - ✅ `users`, `posts`, `order_items`
  - ❌ `user`, `Post`, `Orders`
- **蛇形命名**: 多個單字間使用底線 `_` 分隔。

### 欄位 (Columns)
- **蛇形命名**: 資料庫欄位一律使用 `snake_case`.
  - ✅ `first_name`, `email_verified_at`
  - ❌ `firstName`, `EmailVerifiedAt`
- **對應關係**: Infrastructure 層的 Repository 負責將 `snake_case` 轉換為 Domain 層實體的 `camelCase`.

### 主鍵與外鍵 (Keys)
- **主鍵**: 欄位名稱一律為 `id`，型別優先使用 `TEXT` (UUID/ULID) 以利於分散式系統與事件追蹤。
- **外鍵**: 使用 `[單數表名]_id`.
  - 例: `user_id` 指向 `users.id`.

---

## 2. 標準欄位 (Standard Columns)

所有資料表應盡可能包含以下稽核欄位：

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | `TEXT` | 唯一識別碼 (Primary Key) |
| `version` | `INTEGER` | 樂觀鎖版本號 (預設為 0) |
| `created_at` | `DATETIME` | 建立時間 (自動生成) |
| `updated_at` | `DATETIME` | 最後更新時間 (自動生成) |
| `deleted_at` | `DATETIME` | 軟刪除時間 (僅在需要軟刪除時使用) |

---

## 3. 資料型別映射建議

| 業務概念 | 資料庫型別 (通用) | 備註 |
| :--- | :--- | :--- |
| 金額 (Money) | `DECIMAL(16, 4)` | 避免使用 Float 以防精準度遺失。 |
| 狀態 (Status) | `TEXT` 或 `INTEGER` | 推薦使用 `TEXT` 以增強資料可讀性。 |
| 布林 (Boolean) | `INTEGER` (0/1) | SQLite 不支援原生 Boolean. |
| JSON 數據 | `TEXT` (JSON String) | 由 Repository 處理序列化。 |

---

## 4. 事務處理建議 (Transaction Guidance)

目前 `IDatabaseAccess` 專注於單表原子操作。若需處理跨表事務，建議做法：

1.  **單一聚合原則**: 盡可能確保一個業務操作只修改一個聚合。
2.  **Infrastructure 擴充**: 若必須使用事務，應在具體的 Adapter 中擴充 `transaction()` 方法，而不應在 Domain 層直接處理。

最後更新: 2026-03-13
