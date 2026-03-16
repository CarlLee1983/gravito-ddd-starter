# 核心架構設計（精簡版）

本文件提供 Gravito DDD Starter 的最小架構藍圖，聚焦在 **四層架構、依賴方向與模組自動裝配**。

---

## 🧱 四層架構

```
Presentation → Application → Domain ← Infrastructure
```

- **Presentation**：路由、Controller、輸入驗證、回應格式
- **Application**：Use Case / Service、DTO、交易協調
- **Domain**：聚合根、值物件、領域規則（不得依賴外部）
- **Infrastructure**：Repository 實作、ORM、外部服務

對應目錄：
- `app/Modules/<Module>/Presentation`
- `app/Modules/<Module>/Application`
- `app/Modules/<Module>/Domain`
- `app/Modules/<Module>/Infrastructure`

---

## 🔌 模組自動裝配（Auto-Wiring）

啟動流程：
1. `app/bootstrap.ts` 初始化核心與 DB
2. `ModuleAutoWirer` 掃描 `app/Modules/*/index.ts`
3. 依 `IModuleDefinition` 進行裝配

`IModuleDefinition` 位置：
- `app/Foundation/Infrastructure/Wiring/ModuleDefinition.ts`

模組入口範例：
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

## ✅ 依賴規則（必守）

- **Domain 不可依賴 ORM / Framework / 外部服務**
- **Repository 介面在 Domain，實作在 Infrastructure**
- **跨模組溝通使用事件或 Adapter，不直接耦合**

---

## 📌 核心入口

- `app/bootstrap.ts`：啟動流程
- `start/wiring/ModuleAutoWirer.ts`：模組掃描與裝配
- `app/Foundation/Infrastructure/Wiring/ModuleDefinition.ts`：模組契約

最後更新: 2026-03-16
