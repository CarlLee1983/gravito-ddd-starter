# 新增模組對應設定檢查清單

加入新模組時，需在下列位置做對應設定。本文件與目前程式庫一致，作為單一依據。

---

## 一、生成模組（二擇一）

### 方式 A：使用專案內生成器（推薦）

```bash
# 簡單 CRUD（無 Redis/Cache/DB）
bun run generate:module <ModuleName>

# 需基礎設施時
bun run generate:module <ModuleName> [--redis] [--cache] [--db]
```

- 範例：`bun run generate:module Product`、`bun run generate:module Order --redis --cache --db`
- 產出：`src/Modules/<ModuleName>/` 完整結構 + 若有旗標則 `src/adapters/Gravito<ModuleName>Adapter.ts`

### 方式 B：使用 Gravito CLI

```bash
bun add -D @gravito/pulse
bun gravito module generate <ModuleName> [--ddd-type simple|advanced]
```

---

## 二、必做設定（每個新模組都要）

依序完成以下 **3 個檔案** 的修改。

### 1. 註冊 ServiceProvider — `src/bootstrap.ts`

在 **Step 3**（Register module service providers）區塊，依**依賴順序**加入新模組：

```ts
// 無依賴或僅核心 → 先註冊
core.register(createGravitoServiceProvider(new HealthServiceProvider()))
core.register(createGravitoServiceProvider(new UserServiceProvider()))
core.register(createGravitoServiceProvider(new ProductServiceProvider()))  // 新增
```

- **順序規則**：無依賴 → 單一模組依賴 → 多模組依賴（見 [BOOTSTRAP_REFERENCE.md](./BOOTSTRAP_REFERENCE.md)）。
- 需補上對應的 `import`，例如：
  `import { ProductServiceProvider } from './Modules/Product/Infrastructure/Providers/ProductServiceProvider'`

### 2. 接線層註冊 — `src/wiring/index.ts`

**兩種情況擇一：**

#### 情況 A：簡單模組（僅用 Container，不用 Redis/Cache/DB）

仿照 User 模組：建立 `register<ModuleName>`，從 `core.container.make(...)` 取得服務，組裝 Controller，再呼叫模組的 `registerXxxRoutes(router, controller)`。

```ts
import { registerProductRoutes } from '@/Modules/Product/Presentation/Routes/api'  // 或 product.routes
import { ProductController } from '@/Modules/Product/Presentation/Controllers/ProductController'

export const registerProduct = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const repository = core.container.make('productRepository') as IProductRepository
  const controller = new ProductController(repository)  // 依實際建構參數
  registerProductRoutes(router, controller)
}
```

#### 情況 B：需框架資源（Redis/Cache/DB）— 使用適配器

1. 若有使用 `--redis` / `--cache` / `--db`，生成器會產生 `src/adapters/Gravito<ModuleName>Adapter.ts`。
2. 在 wiring 中 import 該適配器的 `registerXxxWithGravito`，並匯出一個包裝函式：

```ts
import { registerOrderWithGravito } from '@/adapters/GravitoOrderAdapter'

export const registerOrder = (core: PlanetCore): void => {
  registerOrderWithGravito(core)
}
```

### 3. 根路由註冊 — `src/routes.ts`

- 在檔案頂部 import wiring 的註冊函式：
  `import { registerHealth, registerUser, registerProduct } from './wiring'`
- 在 `registerRoutes(core)` 內呼叫：
  `registerProduct(core)`
- 若新模組有 API 端點，可一併在 `/api` 的 `endpoints` 物件中列出（選用）。

---

## 三、選做設定（依需求）

| 需求 | 檔案／位置 | 說明 |
|------|------------|------|
| 新模組使用 Gravito Orbits（如 Atlas、Plasma） | `config/orbits.ts` | 在 `getOrbits()` 中 import 並加入對應 Orbit 實例；若需條件載入，使用 `OrbitRegistrationOptions`。 |
| 應用／資料庫開關等 | `config/index.ts` | 若新模組影響 `buildConfig()` 或 `useDatabase`，在此擴充。 |
| 環境變數 | `.env` / `.env.example` | 若模組需新變數（如 `XXX_*`），在 `.env.example` 加註解說明。 |
| 型別宣告 fallback | `types/*.d.ts` | 若新引入的套件無型別，可在 `types/` 新增 `declare module '...'`（參照 `gravito-atlas.d.ts`、`gravito-plasma.d.ts`）。 |

---

## 四、快速對照表

| 步驟 | 檔案 | 動作 |
|------|------|------|
| 1 | `src/bootstrap.ts` | `core.register(createGravitoServiceProvider(new XxxServiceProvider()))` + import |
| 2 | `src/wiring/index.ts` | 新增 `registerXxx(core)`（內部呼叫適配器或手動組裝 router + controller + registerXxxRoutes） |
| 3 | `src/routes.ts` | import `registerXxx`，在 `registerRoutes()` 內呼叫 `registerXxx(core)` |
| 選 | `config/orbits.ts` | 僅當模組需註冊 Orbit 時 |
| 選 | `types/*.d.ts` | 僅當套件無型別時 |

---

## 五、參考文件

- [MODULE_GUIDE.md](./MODULE_GUIDE.md) — 模組結構與手動建立步驟  
- [MODULE_GENERATION.md](./MODULE_GENERATION.md) — 生成器使用與整合說明  
- [MODULE_GENERATION_WITH_ADAPTERS.md](./MODULE_GENERATION_WITH_ADAPTERS.md) — 帶 Redis/Cache/DB 的模組與適配器  
- [BOOTSTRAP_REFERENCE.md](./BOOTSTRAP_REFERENCE.md) — 啟動流程與註冊順序  
- [config/README.md](../config/README.md) — 設定檔用途與 Orbits
