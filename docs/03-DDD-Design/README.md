# 💎 DDD 領域驅動設計

如何正確實施 Domain-Driven Design，讓代碼更易維護、更易測試。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[DDD_IMPLEMENTATION_CHECKLIST.md](./DDD_IMPLEMENTATION_CHECKLIST.md)** | ⭐ **必讀**：規劃到 Code Review 的完整檢查清單 |
| **[ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md)** | 跨模組解耦：Port & Adapter 防腐層 |
| **[REPOSITORY_ABSTRACTION_TEMPLATE.md](./REPOSITORY_ABSTRACTION_TEMPLATE.md)** | Repository 模式最佳實踐 |

---

## 🎓 推薦閱讀順序

### 第 1 次實施新功能 (1 小時)

1. **[DDD_IMPLEMENTATION_CHECKLIST.md](./DDD_IMPLEMENTATION_CHECKLIST.md)** (40 min)
   - 功能規劃階段（BC 識別、Aggregate 設計）
   - 架構設計階段（四層分層、禁止事項）
   - 實施階段（編碼規範、依賴方向）
   - Code Review 清單

2. **[REPOSITORY_ABSTRACTION_TEMPLATE.md](./REPOSITORY_ABSTRACTION_TEMPLATE.md)** (20 min)
   - Repository 介面設計
   - 數據訪問模式

### 跨模組協作 (30 min)

3. **[ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md)**
   - 為什麼需要 ACL？
   - Port & Adapter 模式
   - 完整範例

---

## 🎯 常見場景

### "我要開發一個新功能，不知道從哪開始"
→ 用 [DDD_IMPLEMENTATION_CHECKLIST.md](./DDD_IMPLEMENTATION_CHECKLIST.md) 的 A-G 階段

### "我的模組需要使用另一個模組的功能"
→ [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md) 的 Port & Adapter 設計

### "我想知道 Repository 該怎麼設計"
→ [REPOSITORY_ABSTRACTION_TEMPLATE.md](./REPOSITORY_ABSTRACTION_TEMPLATE.md)

### "Code Review 時發現問題"
→ [DDD_IMPLEMENTATION_CHECKLIST.md](./DDD_IMPLEMENTATION_CHECKLIST.md) 的 G. 審視清單

---

## 💡 核心概念

### DDD 四層
```
Presentation → Application → Domain ← Infrastructure
```

### Domain 層責任
✅ 業務邏輯、聚合根、值物件、Domain Service
❌ 數據庫、HTTP、外部服務

### Port & Adapter
- **Port**：使用方定義的介面（業務概念）
- **Adapter**：實現 Port，轉換供應方的實現

---

## 📚 學習資源

**官方 DDD 資源**:
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)
- [Martin Fowler - DDD](https://martinfowler.com/tags/domain%20driven%20design.html)

**本文檔庫**:
- [四層架構](../02-Architecture/ARCHITECTURE.md)
- [架構決策](../02-Architecture/ARCHITECTURE_DECISIONS.md)
- [新模組檢查清單](../04-Module-Development/NEW_MODULE_CHECKLIST.md)

---

**快速導航**:
← [架構](../02-Architecture/)
→ [模組開發](../04-Module-Development/)

最後更新: 2026-03-11
