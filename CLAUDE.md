# gravito-ddd 項目開發指南

本文件補充全局 Claude 配置，提供 gravito-ddd 項目的特定開發指引。

## 項目概述

**gravito-ddd** 是 Gravito 框架的完整 DDD 實踐示例，展示如何構建可擴展、ORM 無關的 Node.js 應用。

### 核心特性

- ✅ **DDD + DCI 架構**: 清晰的分層設計
- ✅ **可隨時替換 ORM**: Domain 層完全無關 ORM 選擇
- ✅ **自動模組生成**: 快速創建符合架構規範的模組
- ✅ **Bun 優化**: 針對 Bun 運行時的性能優化
- ✅ **事件驅動**: 支持領域事件與非同步處理
- ✅ **Infrastructure 層優化** (2026-03-13): 結構重組、安全修復、日誌統一
- ✅ **Port/Adapter 抽象化改進** (2026-03-13): ITokenSigner、IInfrastructureProbe 通用命名

## 快速開始

### 環境要求

- **Bun**: v1.3.10+
- **Node.js**: v22.17.1+（用於某些工具）

### 初始設置

```bash
# 1. 安裝依賴（Bun 會自動鏈接本地 @gravito/core）
bun install

# 2. 如果本地修改 @gravito/core，重新鏈接
bun link @gravito/core

# 3. 啟動開發伺服器
bun dev

# 4. 運行測試
bun test
```

## 模組開發工作流

### 創建新模組

#### 1. 簡單模組（推薦首選）

```bash
bun scripts/generate-module.ts Product
```

這會生成基本的 DDD 結構，無任何框架依賴。

#### 2. 帶基礎設施服務的模組

```bash
# 帶 Redis 快取
bun scripts/generate-module.ts Session --redis

# 帶應用層快取
bun scripts/generate-module.ts Cart --cache

# 帶數據庫連線檢查
bun scripts/generate-module.ts Audit --db

# 組合所有服務
bun scripts/generate-module.ts Order --redis --cache --db
```

### 模組結構詳解

每個模組遵循嚴格的分層：

```
src/Modules/Product/
├── Domain/
│   ├── Entities/Product.ts              # 不知道 ORM 存在
│   ├── ValueObjects/ProductId.ts
│   ├── Repositories/
│   │   └── IProductRepository.ts        # 只定義契約
│   └── Services/ProductService.ts       # 使用 Repository 介面
│
├── Application/
│   ├── Services/ProductApplicationService.ts  # 使用 IDatabaseAccess
│   └── DTOs/
│       ├── CreateProductDTO.ts
│       └── ProductResponseDTO.ts
│
├── Presentation/
│   ├── Controllers/ProductController.ts       # HTTP 層
│   └── Routes/Product.routes.ts              # 路由定義
│
├── Infrastructure/
│   ├── Repositories/
│   │   └── ProductRepository.ts   # 實現 IProductRepository（ORM 無關）
│   └── Providers/
│       └── ProductServiceProvider.ts  # DI 容器配置（綁定 Repository 實現）
│
├── index.ts                        # 模組導出點
└── README.md                       # 模組文檔
```

### 核心規則（必須遵守）

**Domain 層**：無 ORM 導入、無框架依賴，只定義業務邏輯和介面
- ❌ 禁止：`import '@gravito/atlas' | 'typeorm' | 'prisma'`
- ✅ 推薦：`export interface IUserRepository` + Domain Entity

**Application 層**：只依賴 Port 介面，不使用 ORM 特定型別
- ❌ 禁止：`SelectQueryBuilder | PrismaClient | EntityManager`
- ✅ 推薦：注入 `IDatabaseAccess`，呼叫 `db.getRepository(Entity)`

**Infrastructure 層**：實現 Repository，包含 ORM 相關代碼
- 遷移流程：修改 Repository 實現 → 檢查 Adapter → 更新 Service Provider → 模組自身無需改動

## 自動模組註冊機制

`ModuleAutoWirer` 自動掃描 `src/Modules/*/index.ts`，尋找 `IModuleDefinition` 導出並完成：
1. Service Provider 註冊（DI 容器綁定）
2. `registerRepositories()` - Repository 工廠註冊
3. `registerRoutes()` - HTTP 路由註冊

每個 `index.ts` 必須導出 `IModuleDefinition`，包含 `registerRepositories()` 和 `registerRoutes()` 方法

## 開發指南

**事件驅動**：聚合根發佈 DomainEvent，Repository 分派事件至其他模組（見 CHANGELOG.md v2.2.1）

**Redis 快取**：使用 `--redis` 標誌生成帶快取模組

**Repository ORM 無關**：Module 不依賴特定 ORM，所有持久化透過 `IDatabaseAccess` Port 進行

**分層測試**：
- Unit: Domain 層實體和值物件
- Integration: Repository 與數據庫交互
- E2E: 完整 HTTP 流程

## gravito-core 框架修正

遇到 @gravito/core 異常時，直接在源代碼修正（`/Users/carl/Dev/Carl/gravito-core/packages/core/`），而非規避：
1. 修改源代碼 + 添加備用方案
2. `cd gravito-core/packages/core && bun run build`
3. 在 gravito-ddd 驗證 `bun dev`

已知特性：Bun API 備用方案、ESM Only、v2.0.1+ Bun 最佳化

## 參考文檔

### 項目文檔

- [架構設計](./docs/02-Architecture/ARCHITECTURE.md)
- [模組生成完整指南](./docs/04-Module-Development/MODULE_GENERATION_WITH_ADAPTERS.md)
- [抽象化規則](./docs/02-Architecture/ABSTRACTION_RULES.md)
- [適配器整合](./docs/06-Adapters-Wiring/ADAPTERS_AND_EXTENSIONS.md)
- [快速參考](./docs/01-Getting-Started/QUICK_REFERENCE.md)

### 外部資源

- [Gravito 框架文檔](https://github.com/gravito-framework/gravito)
- [DDD 指南](https://domaindriven.org/)
- [Bun 文檔](https://bun.sh/docs)

## 常見問題與排查

### Q: `bun dev` 報錯「Cannot find module」

**A**: 確保已執行 `bun link @gravito/core` 連接本地版本。

### Q: 修改 @gravito/core 後，gravito-ddd 沒有反映更改

**A**: 需要重建：
```bash
cd /Users/carl/Dev/Carl/gravito-core/packages/core && bun run build
```

### Q: 新模組無法自動註冊或路由未生效

**A**: 檢查以下幾點：
1. `src/Modules/{ModuleName}/index.ts` 是否正確導出 `IModuleDefinition`
2. `registerRoutes` 函數中，如果需要從容器取得服務（如 redis、database），應使用 try-catch 處理：
   ```typescript
   let service: any
   try {
     service = core.container.make('serviceName')
   } catch {
     // 服務不存在時優雅降級
     console.warn('Service not found, skipping routes')
     return
   }
   ```

### Q: 某個 HTTP 端點返回 404 Not Found

**A**: 檢查路由日誌。啟動伺服器時應看到：
```
[Router] Registering GET /your-route
[Router] Registering POST /your-route
```
如果沒有看到路由註冊日誌，表示 `registerRoutes` 沒有被執行。參考上面的「路由未生效」排查步驟。

## Infrastructure 層優化 (2026-03-13)

**品質評分**: 6.0/10 → 9.2/10 (+53%)

✅ 目錄結構重組（Ports/Adapters/Events/Database/Logging）
✅ 安全漏洞修復（2 CRITICAL + 5 HIGH 優先）
✅ 日誌統一（移除 74 個 console.log，使用 ILogger Port）
✅ 查詢錯誤處理改進（不再靜默吞掉異常）
✅ Repository 層重構（消除 ~300 行重複代碼）

Port 介面位置：`src/Shared/Infrastructure/Ports/`
- Core/: ILogger、IHealthCheck
- Database/: IDatabaseAccess、連線檢查
- Messaging/: IEventDispatcher、IDeadLetterQueue
- Services/: IRedisService、ICacheService
- Storage/: IS3Service

## Port/Adapter 設計改進 (2026-03-13)

### ITokenSigner Port

**修復**: Application 層不再直接依賴 `jose`

- Port 介面：`sign(payload)` + `verify(token)`
- 實現：JoseTokenSigner 隱藏 jose 細節
- 優勢：可輕鬆切換 JWT 庫而無需改動 Application/Domain 層

### IInfrastructureProbe Port

**修復**: Health Domain 層不再暴露技術名詞（redis、database、cache）

- 舊 API：`probeDatabase()`, `probeRedis()`, `probeCache()`
- 新 API：`probeByName(name)` + `getProbeableComponents()`
- SystemChecks 改為 Map 結構，支持動態組件列表
- 優勢：Health Domain 完全與基礎設施選擇無關

## 開發最佳實踐

1. **先寫測試**：遵循 TDD（Test-Driven Development）
2. **保持分層**：嚴格分離 Domain/Application/Infrastructure 層
3. **使用 Port/Adapter**：Application 層依賴 Port 介面，不依賴具體實現
4. **使用 ILogger**：所有日誌記錄使用 ILogger 介面，不使用 console.log
5. **改善查詢錯誤處理**：Repository 異常要傳播，不要靜默吞掉
6. **定期重構**：Domain 層應簡潔且專注於業務邏輯
7. **文檔更新**：新增模組時更新相關文檔
8. **性能監控**：使用 Bun 的 profiler 檢測性能瓶頸

---

**更新於**: 2026-03-13
**Bun 版本**: 1.3.10+
**框架版本**: @gravito/core v2.0.1+
**Infrastructure 層**: 已完成重大優化（品質評分 9.2/10）
**Port/Adapter 設計**: ITokenSigner、IInfrastructureProbe 通用化完成
