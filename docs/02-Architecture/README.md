# 🏗️ 架構設計指南

深入理解 Gravito DDD Starter 的整體設計思想和架構決策。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[CORE_DESIGN.md](./CORE_DESIGN.md)** | ⭐ **必讀**：四層架構、依賴方向、數據流、模組結構 |
| **[EVENT_SYSTEM.md](./EVENT_SYSTEM.md)** | 事件驅動架構：領域事件、整合事件、重試機制與 DLQ |
| **[../03-DDD-Design/DDD_PATTERNS.md](../03-DDD-Design/DDD_PATTERNS.md)** | DDD 模式：實體、聚合、值物件、進階模式 (CQRS/ES/Saga) |
| **[../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md](../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)** | ORM 透明設計：IDatabaseAccess 與多 ORM 適配 |
| **[../06-Adapters-Wiring/ADAPTER_GUIDE.md](../06-Adapters-Wiring/ADAPTER_GUIDE.md)** | 適配器與接線：Port & Adapter 模式實踐 |
| **[../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md)** | 自動裝配系統：DI 容器與模組初始化流程 |

---

## 🎓 推薦閱讀順序

### 初次接觸 (30 min)

1. **[CORE_DESIGN.md](./CORE_DESIGN.md)** (20 min)
   - 四層架構圖
   - 層級責任與模組結構
   - 依賴方向與數據流

2. **[../03-DDD-Design/DDD_PATTERNS.md](../03-DDD-Design/DDD_PATTERNS.md)** (10 min)
   - 核心 DDD 概念
   - 實體與值物件定義

### 深入理解 (40 min)

3. **[EVENT_SYSTEM.md](./EVENT_SYSTEM.md)** (20 min)
   - 事件驅動架構全景
   - 失敗重試策略與死信隊列 (DLQ)
   - 三種分發器 (Memory/Redis/RabbitMQ) 詳解

4. **[../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md)** (20 min)
   - 模組如何自動組裝
   - DI 容器工作原理
   - 依賴注入架構

### 進階主題 (可選)

5. **[../03-DDD-Design/DDD_PATTERNS.md](../03-DDD-Design/DDD_PATTERNS.md)** (進階章節)
   - 何時使用 CQRS
   - Event Sourcing 基礎
   - Saga 協調模式

6. **[../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md](../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)**
   - ORM 切換機制與實現
   - 資料庫訪問層抽象化

---

## 🎯 按需求查詢

### "我想理解整體架構與分層規則"
→ [CORE_DESIGN.md](./CORE_DESIGN.md)

### "我想知道事件系統如何運作"
→ [EVENT_SYSTEM.md](./EVENT_SYSTEM.md)

### "我想理解模組如何自動裝配"
→ [../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md)

### "我想知道何時需要 CQRS 或 Event Sourcing"
→ [../03-DDD-Design/DDD_PATTERNS.md](../03-DDD-Design/DDD_PATTERNS.md)

### "我想建立新模組"
→ [../04-Module-Development/DEVELOPMENT_GUIDE.md](../04-Module-Development/DEVELOPMENT_GUIDE.md)

---

## 📊 架構概覽圖

```
┌─────────────────────────────────────────────────┐
│    Presentation Layer (HTTP Routes, Controllers) │
│         ↓ DTO (Data Transfer Objects)            │
├─────────────────────────────────────────────────┤
│ Application Layer (Use Cases, Services)          │
│   ↓ Domain Model + DCI Contexts                  │
├─────────────────────────────────────────────────┤
│ Domain Layer (Aggregates, Entities, Services)    │
│  - Business logic (核心商業邏輯)                 │
│  - No external dependencies (無外部依賴)         │
│     ↓ Interfaces                                 │
├─────────────────────────────────────────────────┤
│ Infrastructure Layer (Repositories, ORM)         │
│   - Database, Cache, External Services           │
└─────────────────────────────────────────────────┘
```

---

## 💡 核心設計原則

### 1. 依賴反轉 (Dependency Inversion)
- Domain 層定義介面 (Port)
- Infrastructure 層實現介面 (Adapter)
- Application 層依賴抽象，實現框架無關

### 2. ORM 透明度
- 業務邏輯與 Repository 只依賴 `IDatabaseAccess`
- 支援多 ORM（Memory、Drizzle、Atlas）熱抽換
- 透過環境變數一鍵切換持久化技術

### 3. 跨模組解耦 (ACL 防腐層)
- 模組間透過領域事件或 ACL 進行通訊
- 防止一個模組的變更污染另一個模組
- 每個模組都是獨立的 Bounded Context

### 4. 基礎設施層最佳實踐 (2026-03-13 更新)
- **Port 介面分類** - 嚴格按功能分離到 `Ports/` 目錄
- **統一日誌** - 禁止使用 `console.log`，必須使用 `ILogger`
- **異常透明化** - 確保底層錯誤能正確傳播至應用層
- **DRY Repository** - 透過 `BaseEventSourcedRepository` 消除重複代碼

---

## 🔗 相關資源

**深入 DDD**:
- [DDD 模式與進階設計](../03-DDD-Design/DDD_PATTERNS.md)

**ORM & 數據庫**:
- [ORM 透明設計](../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)
- [ORM 使用指南](../05-Database-ORM/ORM_GUIDE.md)

**模組開發**:
- [模組開發與開發指南](../04-Module-Development/DEVELOPMENT_GUIDE.md)

---

**快速導航**:
← [快速上手](../01-Getting-Started/)
→ [DDD 設計](../03-DDD-Design/)

最後更新: 2026-03-13
