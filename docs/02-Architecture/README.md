# 🏗️ 架構設計指南

深入理解 Gravito DDD Starter 的整體設計思想和架構決策。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | ⭐ **必讀**：四層架構、依賴方向、數據流 |
| **[ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)** | 為什麼這樣設計、核心決策 |
| **[ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md)** | DO/DON'T：層級分離規則 |
| **[DEPENDENCY_INJECTION_ARCHITECTURE.md](./DEPENDENCY_INJECTION_ARCHITECTURE.md)** | DI 容器設計和模組組裝 |
| **[ARCHITECTURE_PATTERNS.md](./ARCHITECTURE_PATTERNS.md)** | 進階模式：CQRS、Event Sourcing、Saga |
| **[SCALABLE_ORM_ARCHITECTURE.md](./SCALABLE_ORM_ARCHITECTURE.md)** | ORM 無感知設計的可擴展性 |

---

## 🎓 推薦閱讀順序

### 初次接觸 (30 min)

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** (20 min)
   - 四層架構圖
   - 層級責任
   - 依賴方向
   - 數據流

2. **[ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md)** (10 min)
   - DO/DON'T 清單
   - 常見違反規則

### 深入理解 (40 min)

3. **[ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)** (20 min)
   - 為什麼是四層？
   - 為什麼 DDD？
   - 為什麼完全抽象 ORM？

4. **[DEPENDENCY_INJECTION_ARCHITECTURE.md](./DEPENDENCY_INJECTION_ARCHITECTURE.md)** (20 min)
   - 模組如何組裝
   - 容器如何工作
   - 依賴如何注入

### 進階主題 (可選)

5. **[ARCHITECTURE_PATTERNS.md](./ARCHITECTURE_PATTERNS.md)**
   - CQRS 何時使用
   - Event Sourcing 設計
   - Saga 協調模式

6. **[SCALABLE_ORM_ARCHITECTURE.md](./SCALABLE_ORM_ARCHITECTURE.md)**
   - ORM 切換機制
   - 擴展性考慮

---

## 🎯 按需求查詢

### "我想理解為什麼選擇這個架構"
→ [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)

### "我想知道分層規則是什麼"
→ [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md)

### "我想理解模組如何組裝"
→ [DEPENDENCY_INJECTION_ARCHITECTURE.md](./DEPENDENCY_INJECTION_ARCHITECTURE.md)

### "我想知道何時需要 CQRS 或 Event Sourcing"
→ [ARCHITECTURE_PATTERNS.md](./ARCHITECTURE_PATTERNS.md)

### "我想建立新模組"
→ [../04-Module-Development/MODULE_GUIDE.md](../04-Module-Development/MODULE_GUIDE.md)

---

## 📊 架構概覽圖

```
┌─────────────────────────────────────────────────┐
│    Presentation Layer (HTTP Routes, Controllers) │
│         ↓ DTO (Data Transfer Objects)            │
├─────────────────────────────────────────────────┤
│ Application Layer (Use Cases, Services)          │
│   ↓ Domain Model                                 │
├─────────────────────────────────────────────────┤
│ Domain Layer (Aggregates, Entities, Services)    │
│  - Business logic (核心商業邏輯)                 │
│  - No external dependencies                      │
│     ↓ Interfaces                                 │
├─────────────────────────────────────────────────┤
│ Infrastructure Layer (Repositories, ORM)         │
│   - Database, Cache, External Services           │
└─────────────────────────────────────────────────┘
```

---

## 💡 核心設計原則

### 1. 依賴反轉 (Dependency Inversion)
- Domain 層定義介面
- Infrastructure 層實現介面
- Application 層依賴抽象，不知道實現

### 2. ORM 透明度
- Repository 只依賴 `IDatabaseAccess`
- 無感知使用 ORM（Memory、Drizzle、Atlas）
- 一個 env 變數切換所有 ORM

### 3. 跨模組解耦
- Port & Adapter 模式（ACL 防腐層）
- 一個模組改動不影響其他模組
- 每個模組都可以獨立測試

### 4. 簡潔性
- 簡單 CRUD → 直接 Repository（無 CQRS）
- 複雜業務 → 完整 DDD + Domain Service
- 避免過度設計

### 5. Infrastructure 層最佳實踐（新增 2026-03-13）
- **Port 介面分類** - 按功能分離到 `Ports/` 目錄
  - `Ports/Core/` - 日誌、健康檢查等核心介面
  - `Ports/Database/` - ORM 無關數據庫訪問
  - `Ports/Messaging/` - 事件分發和消息隊列
  - `Ports/Services/` - Redis、快取等應用服務
  - `Ports/Storage/` - 文件存儲（S3 等）
- **完全不使用 console.log** - 統一使用 ILogger 介面
- **改進查詢錯誤處理** - 異常不再被靜默吞掉
- **Repository 層消除重複** - 統一基類和工廠實現

---

## 🔗 相關資源

**深入 DDD**:
- [DDD 實施檢查清單](../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)
- [ACL 防腐層](../03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md)

**ORM & 數據庫**:
- [ORM 透明設計](../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)
- [數據庫指南](../05-Database-ORM/DATABASE.md)

**模組開發**:
- [模組開發指南](../04-Module-Development/MODULE_GUIDE.md)
- [新模組檢查清單](../04-Module-Development/NEW_MODULE_CHECKLIST.md)

---

**快速導航**:
← [快速上手](../01-Getting-Started/)
→ [DDD 設計](../03-DDD-Design/)

最後更新: 2026-03-13
