# DDD 架構生成器 CLI (`bun make`)

統一的 DDD 模組和元件生成器，用於快速創建符合 gravito-ddd 架構規範的模組結構。

## 快速開始

```bash
# 生成新模組
bun make module Product

# 添加領域事件
bun make event Product ProductCreated

# 添加值物件
bun make vo Product ProductId

# 添加應用服務
bun make service Product CreateProductService

# 添加 DTO
bun make dto Product ProductDTO

# 列出所有模組
bun make list

# 檢查架構邊界規則
bun make check

# 刪除模組
bun make remove Product
```

## 完整命令參考

### `bun make module <Name>`

生成完整的 DDD 模組，包含 18 個預定義檔案。

**生成的結構:**
```
app/Modules/<Name>/
├── Domain/
│   ├── Aggregates/<Name>.ts
│   ├── Events/<Name>Created.ts
│   ├── Repositories/I<Name>Repository.ts
│   └── ValueObjects/<Name>Id.ts
├── Application/
│   ├── Services/Create<Name>Service.ts
│   ├── Services/Get<Name>Service.ts
│   └── DTOs/<Name>DTO.ts
├── Infrastructure/
│   ├── Persistence/<Name>Repository.ts
│   ├── Providers/<Name>ServiceProvider.ts
│   ├── Providers/register<Name>Repositories.ts
│   ├── Services/<Name>MessageService.ts
│   └── Wiring/wire<Name>Routes.ts
├── Presentation/
│   ├── Controllers/<Name>Controller.ts
│   └── Routes/api.ts
├── index.ts
└── README.md
```

**範例:**
```bash
bun make module Blog
bun make module ProductCatalog
bun make module OrderProcessing
```

### `bun make event <Module> <EventName>`

在現有模組中添加新的領域事件。

**範例:**
```bash
bun make event Product ProductPublished
bun make event Order OrderConfirmed
```

### `bun make vo <Module> <VOName>`

在現有模組中添加新的值物件。

**範例:**
```bash
bun make vo Product ProductSlug
bun make vo User UserEmail
```

### `bun make service <Module> <ServiceName>`

在現有模組中添加新的應用服務。

**範例:**
```bash
bun make service Product UpdateProductService
bun make service Cart CheckoutCartService
```

### `bun make dto <Module> <DTOName>`

在現有模組中添加新的 DTO。

**範例:**
```bash
bun make dto Product ProductListDTO
bun make dto Order OrderDetailDTO
```

### `bun make list`

列出所有現有模組及其狀態。

**輸出範例:**
```
📦 已有模組（10）

✅    Auth                 app/Modules/Auth
✅ 🧪 Cart                 app/Modules/Cart
✅    Health               app/Modules/Health
...
```

### `bun make check`

檢查所有模組是否遵循架構邊界規則。

**驗證項目:**
- Domain 層禁止導入 ORM 相關模組
- Application 層禁止使用 ORM 特定型別
- 所有模組必須有有效的 index.ts

**範例輸出:**
```
🔍 檢查所有模組的架構邊界規則...

✅ 架構邊界檢查通過（11 個模組）
```

### `bun make remove <Module>`

安全刪除現有模組（需要確認）。

**刪除項目:**
- `app/Modules/<Module>` 整個目錄
- 翻譯檔案 (`locales/en/<module>.json`, `locales/zh-TW/<module>.json`)
- Port 介面 (`app/Foundation/Infrastructure/Ports/Messages/I<Module>Messages.ts`)

**範例:**
```bash
bun make remove Blog
```

## 代理命令

以下命令代理到 Gravito 框架工具，僅進行序號預處理或自動化。

### `bun make migration <Name>`

創建帶自動序號的 database migration（代理 `bun orbit make:migration`）。

**範例:**
```bash
bun make migration add_slug_to_products
# 生成: database/migrations/005_add_slug_to_products.ts
```

### `bun make controller <Name>`

生成 HTTP 控制器（代理 `bun gravito make:controller`）。

### `bun make middleware <Name>`

生成 HTTP 中間件（代理 `bun gravito make:middleware`）。

## 名稱轉換規則

CLI 自動處理名稱轉換：

```javascript
"user-profile" → PascalCase: "UserProfile"
"user_profile" → PascalCase: "UserProfile"
"UserProfile"  → PascalCase: "UserProfile"   // 保持不變

"UserProfile"  → camelCase: "userProfile"
"UserProfile"  → snake_case: "user_profile"
"UserProfile"  → table_name: "user_profiles" // 複數形
```

## 開發工作流程

### 1. 創建新模組

```bash
bun make module Product
```

### 2. 定義領域模型

編輯以下檔案：
- `Domain/Aggregates/Product.ts` - 添加業務邏輯
- `Domain/ValueObjects/ProductId.ts` - 添加值物件驗證
- `Domain/Events/ProductCreated.ts` - 定義領域事件

### 3. 實現應用層

編輯以下檔案：
- `Application/Services/CreateProductService.ts` - 實現使用案例
- `Application/DTOs/ProductDTO.ts` - 定義資料轉換

### 4. 配置基礎設施

編輯以下檔案：
- `Infrastructure/Providers/ProductServiceProvider.ts` - 註冊依賴
- `Infrastructure/Persistence/ProductRepository.ts` - 實現資料存取

### 5. 實現表現層

編輯以下檔案：
- `Presentation/Controllers/ProductController.ts` - 實現 HTTP 端點
- `Presentation/Routes/api.ts` - 定義路由

## 架構檢查

運行以下命令驗證架構遵循性：

```bash
# 檢查邊界規則
bun make check

# 完整驗證（含型別檢查）
bun run check
```

## 故障排除

### 模組無法生成

**錯誤**: `❌ 模組已存在`

**解決**: 使用不同的模組名稱或先刪除現有模組：
```bash
bun make remove ExistingModule
bun make module NewModule
```

### 型別檢查失敗

**可能原因**: 使用了不相容的名稱格式

**解決**: 確保使用有效的 PascalCase 名稱：
```bash
# ❌ 避免
bun make module blog-post
bun make event Blog blog_created

# ✅ 推薦
bun make module BlogPost
bun make event Blog BlogCreated
```

### 自動裝配不工作

**錯誤**: 模組沒有自動註冊

**檢查**:
1. 確認 `app/Modules/<Module>/index.ts` 存在
2. 確認導出了 `IModuleDefinition` 物件
3. 重啟開發伺服器：`bun dev`

## 最佳實踐

1. **遵循 DDD 分層** - 不要在 Domain 層放入基礎設施邏輯
2. **使用值物件** - 用 `bun make vo` 為關鍵概念創建值物件
3. **事件驅動** - 用 `bun make event` 記錄所有重要的業務變更
4. **定期檢查** - 運行 `bun make check` 確保架構完整性
5. **保持簡潔** - 使用明確的英文名稱，避免過於複雜的命名

## 相關命令

```bash
# Database
bun make migration <Name>      # 創建帶序號的 migration
bun orbit migrate              # 執行 migration
bun orbit migrate:fresh        # 重置並重新運行所有 migration

# Routing
bun route:list                 # 列出所有路由

# Testing
bun run test                   # 運行最小測試
bun run test:unit              # 運行單元測試

# Quality Checks
bun run check                  # 完整檢查（型別 + lint + 邊界 + 測試）
bun run verify                 # 驗證並生成覆蓋率報告
```

## 配置文件

所有生成器配置位於：

- `scripts/cli/utils.ts` - 工具函式
- `scripts/cli/types.ts` - 型別定義
- `scripts/cli/commands/*.ts` - 各個命令實現

## 更新日誌

### v1.0.0 (2026-03-13)

✅ **初始發佈**
- `bun make module` - 完整 DDD 模組生成
- `bun make event` - 領域事件生成
- `bun make vo` - 值物件生成
- `bun make service` - 應用服務生成
- `bun make dto` - DTO 生成
- `bun make migration` - 自動序號 migration
- `bun make controller` - HTTP 控制器（代理）
- `bun make middleware` - HTTP 中間件（代理）
- `bun make list` - 列出所有模組
- `bun make check` - 架構邊界檢查
- `bun make remove` - 安全刪除模組

## 許可證

此工具是 gravito-ddd 的一部分，遵循項目許可證。
