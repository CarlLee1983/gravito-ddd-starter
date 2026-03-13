# ORM 透明設計 (Transparent ORM Design)

Gravito DDD 的核心優勢在於將 **「如何操作資料 (ORM)」** 與 **「資料存放在哪 (System)」** 完全解耦。

---

## 🏗️ 雙維度解耦矩陣

開發者可以自由組合工具與系統，而不影響業務代碼：

| ORM 工具 (Adapter) | 支援系統 (System) | 典型用途 |
| :--- | :--- | :--- |
| **Memory Adapter** | JS Map (In-Memory) | 純單元測試，無外部依賴。 |
| **Drizzle Adapter** | SQLite, PostgreSQL | 適合 SQLite 輕量專案或現代 SQL 開發。 |
| **Atlas Adapter** | PostgreSQL, MySQL, SQLite | 企業級應用，強大的動態模型支援。 |

---

## 🏗️ 核心架構：無分支注入

`DatabaseAccessBuilder` 在應用啟動時，會根據環境變數建立對應的「工具實例」。Repository 只需要知道它收到的是一個符合 `IDatabaseAccess` 介面的「物件」，至於這個物件背後是 Drizzle 操控著 PostgreSQL，還是 Atlas 操控著 SQLite，Repository 完全無需理會。

### 依賴路徑示意：
1.  **Repository** 依賴 **`IDatabaseAccess` (Port)**
2.  **`IDatabaseAccess`** 由 **`DrizzleDatabaseAccess` (Adapter)** 實現
3.  **`DrizzleDatabaseAccess`** 根據 **`DB_CONNECTION`** 配置連線至 **PostgreSQL**

---

## 🚀 組合範例：從開發到生產

### 開發階段 (極速)
- **工具 (ORM)**: `memory`
- **系統 (System)**: JS 記憶體
- **優點**: 毫秒級單元測試，無需 Docker/DB。

### 測試/預發階段 (一致性)
- **工具 (ORM)**: `drizzle`
- **系統 (System)**: `sqlite`
- **優點**: 使用真實 SQL 語法，但保持檔案系統的輕量。

### 生產階段 (高性能)
- **工具 (ORM)**: `atlas`
- **系統 (System)**: `postgres`
- **優點**: 支援連線池、高併發與複雜查詢優化。

最後更新: 2026-03-13
