# ✅ DDD 實施檢查清單

本文件提供實施領域驅動設計 (DDD) 的核心流程與決策準則，幫助團隊在開發新功能時保持架構一致性。

---

## 1. 功能規劃階段

### 核心分析
- [ ] **識別 Bounded Context (業務邊界)**: 確定功能的業務範圍，避免模型過於龐大。
- [ ] **識別 Aggregates (聚合)**: 找出一致性邊界，確定誰是聚合根。
- [ ] **識別 Entities 與 Value Objects**: 區分具有身份識別的對象與純粹描述屬性的對象。
- [ ] **識別 Domain Events (領域事件)**: 捕捉業務狀態的關鍵變更（如 `UserCreated`）。

### 決策樹：是否需要完整 DDD？
並非所有功能都需要完整 DDD。過度設計會增加維護成本。

| 檢查項 | 是 → 建議 | 否 → 建議 |
| :--- | :--- | :--- |
| **是否有複雜業務規則？** | 完整 DDD | 簡化版 (直接 Repository) |
| **是否涉及多個聚合協作？** | 需要 Domain Service/Saga | 簡單 Repository 模式 |
| **是否有複雜狀態機遷移？** | 考慮 Value Object/Domain Service | 簡單屬性更新 |

**範例決策參考**：
- ✅ **User 認證/權限**: 完整 DDD (複雜規則、安全性、領域事件)
- ✅ **訂單/支付流程**: 完整 DDD (狀態機、一致性、跨模組協作)
- ⚠️ **系統配置**: 簡化 DDD (主要是 CRUD)
- ⚠️ **日誌/監控**: 簡化 DDD (主要是技術細節)

---

## 2. 實施與開發清單

### 編碼規範
- [ ] **不可變性**: 領域對象屬性應優先使用 `readonly`，更新時使用對象擴展或拷貝。
- [ ] **自驗證**: Value Objects 應在構造函數中進行驗證，不允許無效狀態存在。
- [ ] **顯式意圖**: 聚合根的方法命名應體現業務意圖 (如 `deactivate()`)，而非單純的 `setStatus()`.
- [ ] **Repository 契約**: 介面定義在 Domain 層，使用業務術語命名 (如 `findByEmail`)。

### 依賴方向驗證
確保沒有逆向依賴：
```
✅ Presentation → Application → Domain ← Infrastructure
```
- [ ] Domain 層是否完全不依賴 Application 或 Infrastructure？
- [ ] Infrastructure 層是否僅透過 Port (介面) 與其他層互動？

---

## 3. 審視清單 (Code Review)

### DDD 合規性
- [ ] Domain 層是否包含任何技術細節 (如 SQL, HTTP, Gravito 框架)？
- [ ] 業務邏輯是否完全封裝在 Domain 層？
- [ ] 跨模組調用是否使用了 ACL (防腐層) 或領域事件？

### 代碼質量
- [ ] 函數長度是否控制在 50 行以內？
- [ ] 類別是否遵循單一職責原則 (SRP)？
- [ ] 命名是否清晰且符合業務語境 (Ubiquitous Language)？

---

## 相關指南
- [核心架構設計](../02-Architecture/CORE_DESIGN.md)
- [模組開發指南](../04-Module-Development/DEVELOPMENT_GUIDE.md)

最後更新: 2026-03-16
