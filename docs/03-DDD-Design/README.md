# 💎 DDD 領域驅動設計

如何正確實施 Domain-Driven Design，讓代碼更易維護、更易測試。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[DDD_PATTERNS.md](./DDD_PATTERNS.md)** | ⭐ **必讀**：核心概念、實體、值物件、聚合設計 |
| **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md)** | 四層架構實踐與跨模組 ACL 防腐層設計 |
| **[../02-Architecture/EVENT_SYSTEM.md](../02-Architecture/EVENT_SYSTEM.md)** | 事件驅動：領域事件與整合事件的實施 |

---

## 🎓 推薦閱讀順序

### 核心概念學習 (40 分鐘)

1. **[DDD_PATTERNS.md](./DDD_PATTERNS.md)** (30 min)
   - 聚合根 (Aggregate Root) 與實體 (Entity)
   - 值物件 (Value Objects)
   - 領域服務 (Domain Services)

2. **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md)** (10 min)
   - 分層規則與依賴反轉
   - Repository 介面設計原則

### 進階設計 (30 分鐘)

3. **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md) (ACL 節點)**
   - 為什麼需要 ACL 防腐層？
   - 如何實現跨模組解耦

4. **[../02-Architecture/EVENT_SYSTEM.md](../02-Architecture/EVENT_SYSTEM.md)**
   - 事件溯源 (Event Sourcing) 的基礎實踐
   - 領域事件的持久化與分發

---

## 🎯 按需求查詢

### "我要開發一個新功能，不知道如何設計聚合"
→ 參考 [DDD_PATTERNS.md](./DDD_PATTERNS.md) 的聚合設計原則

### "我的模組需要使用另一個模組的功能"
→ 參考 [../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md) 中的跨模組整合 (ACL) 章節

### "我想知道如何設計 Repository 介面"
→ 參考 [../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md) 的領域層 Repository 介面範例

---

## 💡 核心設計原則

### DDD 四層
```
Presentation → Application → Domain ← Infrastructure
```

### Domain 層責任
✅ 核心業務邏輯、聚合根、值物件、領域事件
❌ 禁止導入任何技術框架、資料庫或 HTTP 相關實作

### Port & Adapter
- **Port**：使用方定義的商業需求介面
- **Adapter**：基礎設施層對 Port 的具體技術實現

---

## 📚 學習資源

**官方 DDD 資源**:
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)
- [Martin Fowler - DDD](https://martinfowler.com/tags/domain%20driven%20design.html)

**本文檔庫**:
- [四層架構詳解](../02-Architecture/CORE_DESIGN.md)
- [事件驅動架構](../02-Architecture/EVENT_SYSTEM.md)
- [自動裝配系統](../06-Adapters-Wiring/WIRING_SYSTEM.md)

---

**快速導航**:
← [架構](../02-Architecture/)
→ [模組開發](../04-Module-Development/)

最後更新: 2026-03-13
