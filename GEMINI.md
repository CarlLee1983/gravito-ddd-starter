# Gravito DDD Project Guidelines

這是專案的核心架構規範，所有 AI 代理與開發者必須嚴格遵守。

## 🏗️ 核心架構：模組化單體 (Modular Monolith)

本專案採用 DDD 垂直切分與六角架構 (Hexagonal Architecture)。

### 1. 目錄規範
- **`app/Modules/`**: 領域模組存放點。每個子目錄代表一個 Bounded Context。
- **`app/Foundation/`**: 共享核心 (Shared Kernel)，包含基類與通用介面。
- **`app/Adapters/`**: 跨模組適配器與防腐層 (ACL)。
- **`start/wiring/`**: 系統裝配與自動佈線邏輯。
- **`storage/`**: 存放變動數據 (如 SQLite 檔案、臨時快取)。

### 2. 模組開發合約 (Module Contract)
每個模組必須包含 `index.ts` 入口，並導出符合 `IModuleDefinition` 的對象：
```typescript
export const MyModule: IModuleDefinition = {
  name: 'ModuleName',
  provider: MyServiceProvider,
  registerRepositories(db, eventDispatcher) { /* 持久化註冊 */ },
  registerRoutes({ createModuleRouter }) { /* 路由裝配 */ }
}
```
**禁止手動在 `app.ts` 或 `routes.ts` 中註冊模組**，系統會透過 `ModuleAutoWirer` 自動掃描。

---

## 🛠️ 技術棧規範

### 1. 依賴注入 (DI)
- 統一使用 `core.container.singleton()` 或 `bind()`。
- 在控制器中，優先透過 `context.container.make()` 解析服務。

### 2. 資料庫與持久化
- 介面：`IDatabaseAccess`。
- 實現：支援 Atlas 與 Drizzle。開發時優先考慮資料庫無關性。
- 倉庫：必須實作 `Domain/Repositories/` 下的介面。

### 3. 檔案存儲 (@gravito/nebula)
- 統一透過 IoC 容器獲取 `storage` 服務。
- **配置**: 修改 `config/app/storage.ts`。
- **驅動**: 優先使用 Nebula 原生的 `local` 與自定義的 `S3Store`。

### 4. 領域事件 (Domain Events)
- 聚合根內部透過 `recordEvent()` 記錄事件。
- 透過 `IEventDispatcher` (Memory/Redis) 進行非同步處理。

---

## 🧪 測試規範
- **單元測試**: 放在 `tests/Unit/`，針對 Domain Logic 進行 Mock 測試。
- **整合測試**: 放在 `tests/Integration/`，驗證 Repository 與基礎設施。
- **功能測試**: 放在 `tests/Functional/`，驗證完整的 HTTP 流程。

---

## 📚 文檔與目錄規範

### 1. 文檔組織
- **`docs/`**: 所有技術文檔、設計決策與架構規範。
- **`docs/01-Getting-Started/`**: 入門指南、環境配置。
- **`docs/02-Architecture/`**: 核心架構、DI、事件系統。
- **`docs/03-DDD-Design/`**: DDD 模式、設計規約。
- **`docs/04-Module-Development/`**: 模組開發、代碼生成。
- **`docs/05-Database-ORM/`**: 資料庫設計、ORM 切換。
- **`docs/05-Frontend-Integration/`**: 前端 SSR、路由與 Token 管理。
- **`docs/06-Adapters-Wiring/`**: 適配器模式、Auto-Wiring。
- **`docs/09-Internationalization/`**: 國際化 i18n、訊息服務。

### 2. 歷史歸檔
- **`docs/_Archive/`**: 存放過期的審計報告、修復總結與舊版規劃。

---

## 🤖 Gemini Added Memories
- **2026-03-14**: 根目錄文檔全面歸類至 `docs/`。
- **2026-03-14**: 建立 `05-Frontend-Integration` 章節，涵蓋 SSR 頁面路由與 Token 安全管理。
- **2026-03-14**: 建立 `docs/_Archive` 以存存放歷史路由審計報告 (`ROUTING_AUDIT_REPORT.md` 等)。
