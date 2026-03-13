# 📖 Gravito DDD 文檔中心

歡迎使用 Gravito DDD 專案文檔。本手冊旨在幫助開發者快速理解架構並進行高品質的領域驅動開發。

## 🚀 快速導航

### 1. [環境安裝與入門](./01-Getting-Started/HANDBOOK.md)
包含環境設置、Docker 配置與專案啟動步驟。

### 2. [核心架構設計](./02-Architecture/CORE_DESIGN.md)
深入理解 PlanetCore 容器、依賴注入 (DI) 與系統抽象化原則。

### 2B. [事件驅動系統](./02-Architecture/EVENT_SYSTEM.md) ✅ **完成**
領域事件、事件分發、重試機制和死信隊列的完整實現。支援三種分發策略（Memory、Redis、RabbitMQ）。

### 3. [領域驅動設計 (DDD) 實踐](./03-DDD-Design/DDD_PATTERNS.md)
聚合根、值物件、領域事件與防腐層 (ACL) 的實作規範。

### 4. [模組開發指南](./04-Module-Development/DEVELOPMENT_GUIDE.md)
如何新增模組、使用自動佈線 (Auto-Wiring) 並實現垂直切分。

### 5. [資料庫與 ORM 適配](./05-Database-ORM/ORM_GUIDE.md)
Atlas 與 Drizzle 的雙 ORM 支持架構，以及資料庫切換策略。

### 6. [接線系統與適配器](./06-Adapters-Wiring/WIRING_SYSTEM.md)
系統如何將業務模組與基礎設施（如 Redis, S3）進行「零耦合」連接。

### 7. [部署與運維](./07-Production-Deployment/DEPLOYMENT.md)
生產環境部署指南、健康檢查與故障排除手冊。

### 8. [測試與 API 規範](./08-Testing-API/TESTING_API_GUIDE.md)
單元測試、功能測試標準與 OpenAPI 文檔維護。

---

## 🛠️ 開發原則 (The Gravito Way)

1. **依賴向內**: 核心業務邏輯 (Domain) 絕對不依賴於外部框架。
2. **檔案即註冊**: 利用 `ModuleAutoWirer` 實現零配置模組註冊。
3. **介面驅動**: 所有的基礎設施（資料庫、存儲、郵件）必須透過 Interface 訪問。
4. **顯式通訊**: 跨模組通訊必須透過領域事件或適配器 (Adapters)。

---
*最後更新: 2026-03-12 (精簡版)*
