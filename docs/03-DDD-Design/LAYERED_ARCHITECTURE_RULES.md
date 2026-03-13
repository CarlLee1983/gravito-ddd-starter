# 🏗️ 分層架構規則與禁止事項

本文件定義各層級的職責邊界與嚴格禁止的行為，以確保系統具備高度的可維護性。

---

## 1. 領域層 (Domain Layer)
**職責**: 封裝業務邏輯與規則。

### 🚫 禁止事項
- **禁止** 導入任何技術框架 (如 `@gravito/core`).
- **禁止** 導入具體 ORM 庫 (如 `drizzle-orm`, `@gravito/atlas`).
- **禁止** 導入 Infrastructure 或 Application 層的代碼。
- **禁止** 直接執行 I/O 操作 (如 SQL 查詢、HTTP 請求)。

---

## 2. 應用層 (Application Layer)
**職責**: 協調使用案例 (Use Cases)，處理數據流轉與事務。

### 🚫 禁止事項
- **禁止** 導入 ORM 特定型別 (如 Drizzle Table Schema)。
- **禁止** 包含複雜業務邏輯 (應下沉至 Domain 層)。
- **禁止** 直接處理 HTTP 狀態碼 (應由 Presentation 層處理)。
- **禁止** 直接訪問底層數據庫 API。

---

## 3. 基礎設施層 (Infrastructure Layer)
**職責**: 實現領域層定義的介面 (Ports)，處理技術細節。

### 🚫 禁止事項
- **禁止** 包含任何業務邏輯 (只應做技術轉換與數據對齊)。
- **禁止** 向上層洩漏底層技術異常 (應封裝為業務異常或通用異常)。
- **禁止** 在 Repository 中進行跨聚合的業務決策。

---

## 4. 表現層 (Presentation Layer)
**職責**: 處理 HTTP 請求、輸入驗證與響應格式化。

### 🚫 禁止事項
- **禁止** 包含業務邏輯。
- **禁止** 直接調用 Repository (應調用 Application Service)。
- **禁止** 直接訪問數據庫。

---

## 數據流轉規則 (Data Flow)

### 依賴方向
```
Presentation → Application → Domain ← Infrastructure
```

### 對象轉換規則
- **DTO (Data Transfer Object)**: 用於 Presentation 與 Application 之間。
- **Domain Model**: 用於 Application 與 Domain 之間。
- **Row/Entity Object**: 用於 Infrastructure 與數據庫之間。

最後更新: 2026-03-13
