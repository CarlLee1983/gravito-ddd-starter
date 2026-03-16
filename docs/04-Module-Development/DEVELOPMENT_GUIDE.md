# 模組開發指南（精簡版）

本文件說明如何在 gravito-ddd 中建立新的 DDD 模組，並讓系統自動裝配。

---

## ✅ 快速生成（推薦）

```bash
bun run generate:module Product
# 或
bun gravito module generate Product --ddd-type simple
```

生成後目錄位於：`app/Modules/Product/`。

---

## 📂 最小模組結構

```
app/Modules/Product/
├── Domain/
├── Application/
├── Infrastructure/
├── Presentation/
└── index.ts
```

---

## 🔌 模組入口（index.ts）

`index.ts` 必須匯出 `XxxModule`，且符合 `IModuleDefinition`：

```ts
import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { ProductServiceProvider } from './Infrastructure/Providers/ProductServiceProvider'
import { registerProductRepositories } from './Infrastructure/Providers/registerProductRepositories'

export const ProductModule: IModuleDefinition = {
  name: 'Product',
  provider: ProductServiceProvider,
  registerRepositories: registerProductRepositories,
  registerRoutes: (ctx) => {
    const controller = ctx.container.make('productController')
    const router = ctx.createModuleRouter()
    router.get('/products', (c) => controller.index(c))
  }
}
```

---

## ✅ 必要檢查

- Domain 層不可依賴 ORM / Framework
- Repository 介面在 Domain，實作在 Infrastructure
- `index.ts` 檔名與匯出名稱需正確（`XxxModule`）

---

## 🧪 最小驗證

```bash
ORM=memory bun run dev
bun run test
bun run typecheck
```

最後更新: 2026-03-16
