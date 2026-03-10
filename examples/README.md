# Gravito DDD Starter - 程式碼範例

此目錄包含幾個完整的模組實作範例，展示如何在 Gravito 框架中應用 DDD 原則。

## 範例清單

### 1. [簡單 CRUD 模組](./01-simple-crud-module.md)

**目標模組**: 產品 (Product)

**包含內容**:
- ✅ 簡單的值物件 (ProductStatus, ProductPrice)
- ✅ 聚合根實體 (Product)
- ✅ 倉庫介面和實作
- ✅ 應用服務 (CreateProductService)
- ✅ HTTP 控制器
- ✅ 單元測試範例

**適用場景**:
- 你是第一次使用 Gravito 框架
- 你想快速了解 DDD 四層架構
- 你需要一個基本的 CRUD 模組

**複製指令**:
```bash
# 建立目錄結構
mkdir -p src/Modules/Product/{Domain/{Entities,ValueObjects,Repositories,Services},Application/{Services,DTOs},Presentation/{Controllers,Routes},Infrastructure/{Repositories}}

# 複製檔案內容到對應位置
# （詳見範例文檔中的檔案清單）
```

---

### 2. [帶驗證和事件的模組](./02-validated-module-with-events.md)

**目標模組**: 部落格文章 (BlogPost)

---

### 3. [可插拔模組設計](./03-pluggable-modules-design.md)

**目標模組**: 購物 (Shop)

**包含內容**:
- ✅ 自定義異常和錯誤處理
- ✅ 領域事件 (BlogPostCreatedEvent, BlogPostPublishedEvent)
- ✅ Zod DTO 驗證
- ✅ 複雜的業務邏輯 (狀態轉移、檢驗)
- ✅ 完整的錯誤處理流程
- ✅ 事件訂閱者範例
- ✅ 整合測試範例

**適用場景**:
- 你需要實作複雜的業務邏輯
- 你想學習如何進行完整的輸入驗證
- 你需要跨模組的事件通訊
- 你想了解狀態機制

**複製指令**:
```bash
# 建立目錄結構
mkdir -p src/Modules/BlogPost/{Domain/{Entities,ValueObjects,Repositories,Services,Events,Exceptions},Application/{Services,DTOs},Presentation/{Controllers,Routes},Infrastructure/{Repositories,Subscribers}}

# 複製檔案內容到對應位置
# （詳見範例文檔中的檔案清單）
```

---

### 3. [可插拔模組設計](./03-pluggable-modules-design.md)

**目標模組**: 購物 (Shop)

**包含內容**:
- ✅ 完全的模組隔離設計
- ✅ 清晰的公開 API (index.ts)
- ✅ 依賴注入配置 (ModuleConfig)
- ✅ 多個可互換的倉庫實作 (SQLite/MongoDB/PostgreSQL)
- ✅ 無痛切換資料庫實作
- ✅ 介面驅動的設計
- ✅ 隔離性測試與驗證

**適用場景**:
- 你想設計真正可插拔、可抽離的模組
- 你需要支援多個資料庫
- 你想確保模組可以無副作用地抽離
- 你想學習 Dependency Inversion Principle (DIP)
- 你的專案有高複雜度和多個團隊

**設計亮點**:
```
模組隔離：
  └─ 只暴露介面和 DTO
  └─ 實作細節完全隱藏
  └─ 透過 initModule(config) 初始化

可替換性：
  └─ SqliteRepository → MongoRepository → PostgresRepository
  └─ 上層代碼無需任何改動
  └─ 只需改 app.ts 中的 DI 配置

零依賴：
  └─ 服務只依賴介面
  └─ 介面通過建構函數注入
  └─ 無硬編碼的模組耦合

**複製指令**:
```bash
# 建立完整的模組結構
mkdir -p src/Modules/Shop/{Domain/{Entities,ValueObjects,Repositories},Application/{Services,DTOs,Contracts},Presentation/{Controllers,Routes},Infrastructure/{Repositories}}

# 複製所有檔案（約 15 個檔案）
# 參考範例中的完整實作
```

**專用文檔**: 參考 [MODULE_INTEGRATION.md](../docs/MODULE_INTEGRATION.md) 詳細設計指南

---

## 如何使用這些範例

### 步驟 1：選擇適合的範例

根據你的需求選擇上述範例之一：
- **開始簡單？** → 選擇範例 1
- **需要完整功能？** → 選擇範例 2

### 步驟 2：複製目錄結構

創建模組所需的目錄：
```bash
mkdir -p src/Modules/YourModuleName/{Domain/{Entities,ValueObjects,Repositories},Application/{Services,DTOs},Presentation/{Controllers,Routes},Infrastructure/{Repositories}}
```

### 步驟 3：複製檔案

根據範例文檔中的程式碼，複製相應的檔案到你建立的目錄中。建議使用文字編輯器逐個複製，以便理解每個部分的功能。

### 步驟 4：註冊模組

在 `src/app.ts` 中註冊你的模組：

```typescript
import { YourModuleRepository } from './Modules/YourModuleName/Infrastructure/Repositories/YourModuleRepository'

export function createApp() {
  // ... 其他設定

  // 註冊模組倉庫
  container.singleton('YourModuleRepository', () => new YourModuleRepository())

  return app
}
```

### 步驟 5：新增路由

在 `src/routes.ts` 中新增模組路由：

```typescript
import { YourModuleController } from './Modules/YourModuleName/Presentation/Controllers/YourModuleController'

export function setupRoutes(app: Application) {
  const controller = new YourModuleController(app.context)

  app.post('/api/your-resource', (req) => controller.create(req))
  app.get('/api/your-resource', () => controller.list())
  app.get('/api/your-resource/:id', (req) => controller.show(req.params.id))
}
```

### 步驟 6：寫測試

基於提供的測試範例，為你的模組編寫測試：

```bash
# 執行測試
bun test

# 查看覆蓋率
bun run test:coverage
```

---

## DDD 架構快速參考

```
🏗️  四層架構

┌─────────────────────────────────────────┐
│     Presentation Layer (控制器)         │ ← HTTP 請求/回應
├─────────────────────────────────────────┤
│   Application Layer (應用服務)          │ ← 業務流程協調
├─────────────────────────────────────────┤
│    Domain Layer (聚合根、值物件)         │ ← 業務規則和邏輯
├─────────────────────────────────────────┤
│  Infrastructure Layer (倉庫、外部服務)  │ ← 資料存取和持久化
└─────────────────────────────────────────┘

📦 模組隔離

src/Modules/
├── Product/
│   ├── Domain/          ← 業務邏輯（依賴無關）
│   ├── Application/     ← 服務（協調領域）
│   ├── Presentation/    ← 控制器（HTTP 處理）
│   └── Infrastructure/  ← 實作細節（資料庫等）
│
├── Order/
├── User/
└── ...
```

---

## 常見問題

### Q: 如何決定使用哪個範例？

**A**: 根據你的需求：
- 如果是簡單的資料管理 → 使用範例 1
- 如果有複雜的業務邏輯 → 使用範例 2
- 如果都不符合 → 將兩個結合並調整

### Q: 我可以修改這些範例嗎？

**A**: 絕對可以！這些範例是起點，你應該根據你的具體需求進行調整。

### Q: 如何在模組之間共享資料？

**A**:
1. **透過 DTO**: 在應用層使用 DTO 傳遞資料
2. **透過事件**: 在領域層發佈事件，其他模組訂閱
3. **透過倉庫**: 在應用服務中注入多個倉庫

### Q: 如何測試我的模組？

**A**: 遵循範例中提供的測試結構：
- **單元測試**: 測試領域層的業務邏輯
- **整合測試**: 測試應用服務和倉庫
- **E2E 測試**: 測試完整的 HTTP 流程

### Q: 哪些部分應該添加到 Git？

**A**:
```bash
✅ 添加:
  - src/Modules/YourModuleName/
  - tests/Unit/YourModuleName/
  - tests/Integration/YourModuleName/

❌ 不要添加:
  - node_modules/
  - dist/
  - .env（使用 .env.example）
  - *.log
```

---

## 學習路徑

### 初學者路線
```
1. 範例 1（簡單 CRUD）
   └─ 理解基本的 4 層架構
   └─ 5-10 分鐘

2. 範例 2（驗證和事件）
   └─ 學習複雜業務邏輯
   └─ 10-15 分鐘

3. 開始寫你的模組
   └─ 根據實際需求選擇設計
```

### 進階開發者路線
```
1. 範例 3（可插拔設計）
   └─ 理解模組隔離和 DIP
   └─ 15-20 分鐘

2. 閱讀 MODULE_INTEGRATION.md
   └─ 深入理解設計原則
   └─ 20-30 分鐘

3. 設計高複雜度、多模組系統
   └─ 應用可插拔架構
```

## 後續步驟

1. **深化學習**
   - 📖 [MODULE_GUIDE.md](../docs/MODULE_GUIDE.md) - 模組建立詳細指南
   - 📖 [MODULE_INTEGRATION.md](../docs/MODULE_INTEGRATION.md) - 模組隔離設計指南
   - 📖 [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - 整體架構說明

2. **實踐應用**
   - 基於範例 1 建立簡單模組
   - 基於範例 2 實作複雜業務邏輯
   - 基於範例 3 設計可插拔架構

3. **自動化生成**
   ```bash
   bun add -D @gravito/pulse
   bun gravito module generate YourModuleName
   ```

4. **驗證隔離性**
   ```bash
   # 確保你的模組設計良好
   1. 切換倉庫實作（SQLite → MongoDB）
   2. 執行 bun run typecheck
   3. 執行 bun test
   4. 如果都通過 → 模組隔離完美 ✅
   ```

---

## 相關資源

- 📖 [Gravito 官方文檔](https://github.com/gravito-framework/gravito)
- 🎓 [Domain-Driven Design 指南](https://domaindriven.org)
- 🔗 [Value Objects 模式](https://martinfowler.com/bliki/ValueObject.html)
- 🏛️ [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**提示**: 開始小而簡單，逐步增加複雜性。DDD 的強大之處在於能夠清晰地表達業務邏輯。
