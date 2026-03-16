
# Foundation 層架構總覽 (Overview)

Foundation 是 Gravito DDD 專案的核心底層（Shared Kernel），提供所有領域模組（Modules）共用的基類、介面與基礎設施。本層級嚴格遵循 **領域驅動設計 (DDD)** 與 **六角架構 (Hexagonal Architecture)**。

## 🏗️ 分層結構

- **[Application Layer](./APPLICATION_LAYER.md)**: 應用層。定義 DTO、Query 介面、背景 Job 與 Worker 邏輯。
- **[Domain Layer](./DOMAIN_LAYER.md)**: 領域層。定義聚合根、實體、值對象、領域事件與倉儲介面。
- **[Infrastructure Layer](./INFRASTRUCTURE_LAYER.md)**: 基礎設施層。提供資料庫、快取、訊息隊列、郵件、儲存等技術適配器。
- **[Presentation Layer](./PRESENTATION_LAYER.md)**: 展示層。定義 HTTP 上下文、路由適配、中間件與統一的回應格式。

## 🛡️ 核心設計原則

1. **依賴反轉 (Dependency Inversion)**: 核心業務邏輯僅依賴於抽象介面（Ports），技術實現在運行時注入。
2. **框架無關性 (Framework Agnostic)**: 透過 Port 隔離特定框架依賴，確保核心邏輯的純粹性。
3. **模組化單體 (Modular Monolith)**: 模組間通訊標準化，禁止跨模組直接存取私有數據。
4. **顯式合約 (Explicit Contracts)**: 每一層級皆有明確的介面定義，降低技術抽換的風險。
