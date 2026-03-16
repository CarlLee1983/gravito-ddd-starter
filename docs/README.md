# 📖 Gravito DDD 文檔中心

歡迎使用 Gravito DDD 專案文檔。本手冊旨在幫助開發者快速理解架構並進行高品質的領域驅動開發。

## 🚀 快速導航（精簡版）

### 1. [快速開始](./01-Getting-Started/README.md)
最短路徑上手與常用指令。

### 2. [⏱️ 15 分鐘建立第一個模組](./01-Getting-Started/QUICK_START.md)
從 Domain 到 API 的完整實戰流程。

### 3. [核心架構設計](./02-Architecture/CORE_DESIGN.md)
四層架構與依賴方向、PlanetCore 容器與 DI 概念。

### 4. [事件驅動系統](./02-Architecture/EVENT_SYSTEM.md)
領域事件、事件分發、重試機制和死信隊列。

### 5. [DDD 實施檢查清單](./03-DDD-Design/DDD_CHECKLIST.md)
確認是否需要完整 DDD 的決策樹與落地要點。

### 6. [模組開發指南](./04-Module-Development/DEVELOPMENT_GUIDE.md)
如何新增模組、使用自動佈線 (Auto-Wiring) 並實現垂直切分。

### 7. [資料庫與 ORM 指南](./05-Database-ORM/ORM_GUIDE.md)
ORM 選擇與切換策略。

### 8. [接線系統與適配器](./06-Adapters-Wiring/WIRING_SYSTEM.md)
系統如何將業務模組與基礎設施進行「零耦合」連接。

### 9. [專案再利用指南](./10-Project-Reuse/REUSE_GUIDE.md)
將本專案作為 DDD starter 複用到其他新專案（深度架構分析 + 可操作步驟）。

---

## 🛠️ 開發原則 (The Gravito Way)

1. **依賴向內**: 核心業務邏輯 (Domain) 絕對不依賴於外部框架。
2. **檔案即註冊**: 利用 `ModuleAutoWirer` 實現零配置模組註冊。
3. **介面驅動**: 所有的基礎設施（資料庫、存儲、郵件）必須透過 Interface 訪問。
4. **顯式通訊**: 跨模組通訊必須透過領域事件或適配器 (Adapters)。

---
*最後更新: 2026-03-16 (精簡版)*
