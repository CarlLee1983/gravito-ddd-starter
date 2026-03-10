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

## 後續步驟

1. **深化學習**
   - 閱讀 [MODULE_GUIDE.md](../docs/MODULE_GUIDE.md)
   - 閱讀 [ARCHITECTURE.md](../docs/ARCHITECTURE.md)

2. **貢獻你自己的範例**
   - 建立 `03-advanced-module.md`
   - 分享你的模組設計模式

3. **自動化生成模組**
   ```bash
   bun add -D @gravito/pulse
   bun gravito module generate YourModuleName
   ```

---

## 相關資源

- 📖 [Gravito 官方文檔](https://github.com/gravito-framework/gravito)
- 🎓 [Domain-Driven Design 指南](https://domaindriven.org)
- 🔗 [Value Objects 模式](https://martinfowler.com/bliki/ValueObject.html)
- 🏛️ [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**提示**: 開始小而簡單，逐步增加複雜性。DDD 的強大之處在於能夠清晰地表達業務邏輯。
