# 🚫 常見錯誤與自檢工具 (Common Pitfalls & Tools)

本文件收錄在實施 DDD 過程中常見的誤區，並提供自動化檢查指令。

---

## 1. 常見錯誤與修正方案

### ❌ 錯誤：領域對象洩漏技術細節
**案例**: 在 `User` 實體中導入 `drizzle-orm`。
**修復**: 實體應保持純淨。所有 I/O（SQL/HTTP）應由 Infrastructure 實現並透過 Port 注入。

### ❌ 錯誤：Repository 包含業務邏輯
**案例**: `UserRepository.findActiveUsers()` 內部包含 `age > 18` 的邏輯。
**修復**: Repository 只負責過濾數據。業務規則（如「活躍用戶」的定義）應在 Domain Service 或 Entity 中定義。

### ❌ 錯誤：貧血模型 (Anemic Domain Model)
**案例**: 實體只有 Getter/Setter，所有邏輯都在 Application Service。
**修復**: 將行為下沉。例如將「更新電子郵件並發送驗證碼」的邏輯移入聚合根。

---

## 2. 自動化自檢工具 (CLI)

你可以透過以下指令快速檢查代碼是否違反架構原則：

### 檢查 Domain 層非法導入
確保 Domain 層沒有依賴技術設施：
```bash
grep -r "from.*Infrastructure\|from.*Presentation\|from.*@gravito" app/Modules/*/Domain/
```
*預期結果：無輸出。*

### 檢查 Application 層 ORM 洩漏
確保應用層沒有出現具體 ORM 類型：
```bash
grep -r "drizzle\|prisma\|atlas" app/Modules/*/Application/
```
*預期結果：無輸出。*

### 檢查 Repository 介面位置
確保 Domain 層只包含介面 (Port)：
```bash
find app/Modules/*/Domain/Repositories -name "*.ts" ! -name "I*.ts"
```
*預期結果：無輸出（文件名應皆以 I 開頭）。*

---

## 3. 架構健康指標 (KPI)

| 指標 | 目標 | 意義 |
| :--- | :--- | :--- |
| **Domain 層依賴數** | 0 | 業務邏輯的純粹度與可測試性 |
| **Aggregate 大小** | < 5 個實體 | 確保聚合的一致性邊界不會過大 |
| **測試執行時間** | < 10 秒 | 快速反饋是 DDD 迭代的關鍵 |

最後更新: 2026-03-13
