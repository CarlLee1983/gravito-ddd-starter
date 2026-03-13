# 💎 DDD 領域驅動設計

如何正確實施 Domain-Driven Design，讓代碼更易維護、更易測試。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[DDD_CHECKLIST.md](./DDD_CHECKLIST.md)** | ⭐ **必讀**：開發新功能時的實施檢查清單與決策準則 |
| **[DOMAIN_DESIGN_GUIDE.md](./DOMAIN_DESIGN_GUIDE.md)** | 領域設計：聚合根、實體、值物件與領域事件的設計規範 |
| **[NAMING_CONVENTION.md](./NAMING_CONVENTION.md)** | 語言與命名：Ubiquitous Language 實踐與各層命名契約 |
| **[LAYERED_ARCHITECTURE_RULES.md](./LAYERED_ARCHITECTURE_RULES.md)** | 架構規則：四層職責邊界、依賴方向與禁止事項 |
| **[COMMON_PITFALLS.md](./COMMON_PITFALLS.md)** | 避坑指南：常見錯誤修正方案與 CLI 自檢工具 |
| **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** | 測試策略：各層級測試目標、覆蓋率要求與編寫範例 |
| **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md)** | 框架實踐：四層架構實作與跨模組 ACL 防腐層設計 |

---

## 🎓 推薦閱讀順序

### 1. 核心流程與語言 (15 分鐘)
- **[DDD_CHECKLIST.md](./DDD_CHECKLIST.md)**: 了解什麼時候需要 DDD，以及開發時的檢查清單。
- **[NAMING_CONVENTION.md](./NAMING_CONVENTION.md)**: 建立 Ubiquitous Language 意識，統一命名契約。

### 2. 設計規範 (20 分鐘)
- **[DOMAIN_DESIGN_GUIDE.md](./DOMAIN_DESIGN_GUIDE.md)**: 學習如何編寫正確的 Domain Model。
- **[LAYERED_ARCHITECTURE_RULES.md](./LAYERED_ARCHITECTURE_RULES.md)**: 理解各層級的嚴格限制，避免架構腐化。

### 3. 實踐、驗證與避坑 (20 分鐘)
- **[COMMON_PITFALLS.md](./COMMON_PITFALLS.md)**: 學習前人的血淚教訓，並使用 CLI 工具檢查代碼。
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)**: 了解如何驗證你的業務邏輯。

---

## 🎯 按需求查詢

### "我要開發一個新功能，不知道如何開始分析"
→ 參考 [DDD_CHECKLIST.md](./DDD_CHECKLIST.md) 的功能規劃階段。

### "我想知道值物件 (Value Object) 的編寫規範"
→ 參考 [DOMAIN_DESIGN_GUIDE.md](./DOMAIN_DESIGN_GUIDE.md) 的值物件章節。

### "我不確定這段代碼應該放在 Application 還是 Domain 層"
→ 參考 [LAYERED_ARCHITECTURE_RULES.md](./LAYERED_ARCHITECTURE_RULES.md) 的職責對比。

### "我想檢查我的代碼是否違反了分層規則"
→ 參考 [COMMON_PITFALLS.md](./COMMON_PITFALLS.md) 的 CLI 自檢工具。

---

## 💡 核心設計原則

### 依賴反轉
Domain 層定義介面 (Port)，Infrastructure 層實現介面 (Adapter)。

### 語言統一
代碼中的命名必須與業務術語 (Ubiquitous Language) 保持高度一致。

### 邊界清晰
每個模組 (Bounded Context) 應具備獨立的領域模型，跨模組通訊必須透過 ACL 或事件。

---

## 📚 外部資源
- [Domain-Driven Design (Evans)](https://www.domainlanguage.com/ddd/)
- [Martin Fowler - DDD](https://martinfowler.com/tags/domain%20driven%20design.html)

最後更新: 2026-03-13
