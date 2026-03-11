# 模組生成與適配器集成

## 概述

改進的 `scripts/generate-module.ts` 現在可以自動生成符合框架無關架構的完整模組，包括可選的基礎設施適配器（Redis、Cache、Database）。

## 快速開始

### 生成簡單模組（無基礎設施服務）

```bash
bun scripts/generate-module.ts Product
```

生成結構：
```
src/Modules/Product/
├── Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Repositories/
│   │   └── IProductRepository.ts
│   └── Services/
├── Application/
│   ├── Services/
│   └── DTOs/
├── Presentation/
│   ├── Controllers/
│   │   └── ProductController.ts
│   └── Routes/
│       └── Product.routes.ts
├── Infrastructure/
│   ├── Repositories/
│   │   └── ProductRepository.ts
│   └── Providers/
│       └── ProductServiceProvider.ts
├── tests/
├── index.ts
└── README.md
```

### 生成複雜模組（帶基礎設施服務）

```bash
# 使用 Redis 快取
bun scripts/generate-module.ts Session --redis

# 使用 Cache（應用層快取）
bun scripts/generate-module.ts Cart --cache

# 使用數據庫連線檢查
bun scripts/generate-module.ts Audit --db

# 組合多個服務
bun scripts/generate-module.ts Order --redis --cache --db
```

## 自動生成的適配器

當指定基礎設施服務標誌時，生成器會自動建立對應的適配器。

### 示例：Order 模組（--redis --cache --db）

```bash
bun scripts/generate-module.ts Order --redis --cache --db
```

**自動生成的文件**：

1. **Module Files** (src/Modules/Order/):
   - Domain/Repositories/IOrderRepository.ts
   - Application/Services/
   - Presentation/Controllers/OrderController.ts
   - Presentation/Routes/Order.routes.ts
   - Infrastructure/Repositories/OrderRepository.ts
   - Infrastructure/Providers/OrderServiceProvider.ts

2. **Adapter** (src/adapters/):
   - GravitoOrderAdapter.ts ✨ **新增**

**生成的 GravitoOrderAdapter.ts**:

```typescript
/**
 * GravitoOrderAdapter - Order 模組完整適配器
 *
 * 責任：
 * 1. 從 PlanetCore 取得框架服務（Redis/Cache 可能為 undefined）
 * 2. 適配為框架無關的介面
 * 3. 組裝 OrderService + OrderController
 * 4. 透過 IModuleRouter 註冊路由
 */

import type { PlanetCore } from '@gravito/core'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { createGravitoModuleRouter } from './GravitoModuleRouter'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { createGravitoDatabaseConnectivityCheck } from './GravitoDatabaseAdapter'

import { OrderRepository } from '@/Modules/Order/Infrastructure/Repositories/OrderRepository'
import { OrderController } from '@/Modules/Order/Presentation/Controllers/OrderController'
import { registerOrderRoutes } from '@/Modules/Order/Presentation/Routes/Order.routes'

/**
 * 註冊 Order 模組與 Gravito 框架
 */
export function registerOrderWithGravito(core: PlanetCore): void {
  // 從 PlanetCore 容器提取原始服務
  const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
  const rawCache = core.container.make<CacheManager | undefined>('cache')

  // 適配為框架無關的介面（null 表示未設定）
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
  const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null
  const databaseCheck = createGravitoDatabaseConnectivityCheck()

  // 組裝應用層
  const repository = new OrderRepository()
  const controller = new OrderController(repository)

  // 建立框架無關的路由介面
  const router = createGravitoModuleRouter(core)

  // 透過 IModuleRouter 註冊路由
  registerOrderRoutes(router, controller)
}
```

## 集成到應用

### Step 1：在 src/bootstrap.ts 中註冊 ServiceProvider

在 Step 3（Register module service providers）中，依依賴順序加入：

```typescript
import { createGravitoServiceProvider } from './adapters/GravitoServiceProviderAdapter'
import { OrderServiceProvider } from './Modules/Order/Infrastructure/Providers/OrderServiceProvider'

// ...
core.register(createGravitoServiceProvider(new OrderServiceProvider()))
```

### Step 2：在 src/wiring/index.ts 中添加註冊函式

```typescript
import { registerOrderWithGravito } from '@/adapters/GravitoOrderAdapter'

export const registerOrder = (core: PlanetCore): void => {
  registerOrderWithGravito(core)
}
```

### Step 3：在 src/routes.ts 中調用

```typescript
import { registerOrder } from './wiring'

export async function registerRoutes(core: PlanetCore) {
  // ... 其他路由
  registerOrder(core)
}
```

## 生成的代碼符合抽象格式

### ✅ Controllers — 使用 IHttpContext

**自動生成**:
```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'

export class OrderController {
  constructor(private repository: IOrderRepository) {}

  async index(ctx: IHttpContext): Promise<Response> {
    // ... 無 GravitoContext 耦合
  }
}
```

**優點**:
- ✅ 不依賴 `@gravito/core`
- ✅ 易於測試（mock IHttpContext）
- ✅ 框架無關

### ✅ Routes — 接收 IModuleRouter + Controller

**自動生成**:
```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { OrderController } from '../Controllers/OrderController'

export function registerOrderRoutes(
  router: IModuleRouter,
  controller: OrderController,
): void {
  router.get('/api/orders', (ctx) => controller.index(ctx))
  router.get('/api/orders/:id', (ctx) => controller.show(ctx))
  router.post('/api/orders', (ctx) => controller.store(ctx))
}
```

**優點**:
- ✅ 接收依賴而非從容器取得
- ✅ 不知道 Gravito router 如何工作
- ✅ 完全框架無關

### ✅ ServiceProvider — 繼承 ModuleServiceProvider

**自動生成**:
```typescript
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('orderRepository', () => {
      return new OrderRepository()
    })
  }

  override boot(_context: any): void {
    console.log('✨ [Order] Module loaded')
  }
}
```

**優點**:
- ✅ 不導入 `@gravito/core`
- ✅ 使用框架無關的 `IContainer` 介面
- ✅ 與框架無關

### ✅ Adapter — 自動組裝所有依賴

**自動生成**（帶基礎設施服務）:
```typescript
export function registerOrderWithGravito(core: PlanetCore): void {
  // 提取 Gravito 服務
  const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
  const rawCache = core.container.make<CacheManager | undefined>('cache')

  // 適配為框架無關介面
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
  const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null

  // 組裝依賴
  const repository = new OrderRepository()
  const controller = new OrderController(repository)
  const router = createGravitoModuleRouter(core)

  // 註冊路由
  registerOrderRoutes(router, controller)
}
```

**優點**:
- ✅ 框架耦合集中在適配器
- ✅ 組裝邏輯清晰可見
- ✅ 易於擴展

## 生成選項參考

### --redis

添加 Redis 適配支援：
- 生成 `GravitoXxxAdapter.ts` 中的 `rawRedis` 提取
- 自動適配為 `IRedisService`
- 支援 null 檢查（可選服務）

### --cache

添加 Cache 適配支援：
- 生成 `GravitoXxxAdapter.ts` 中的 `rawCache` 提取
- 自動適配為 `ICacheService`
- 支援 null 檢查（可選服務）

### --db

添加 Database 連線檢查支援：
- 生成 `GravitoXxxAdapter.ts` 中的 `databaseCheck` 工廠
- 自動適配為 `IDatabaseConnectivityCheck`
- 支援 SELECT 1 連線測試

## 常見場景

### 場景 1：簡單 CRUD（無特殊服務）

```bash
bun scripts/generate-module.ts User
```

**集成方式**:
```typescript
// src/wiring/index.ts
export const registerUser = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const repository = core.container.make('userRepository')
  const controller = new UserController(repository)
  registerUserRoutes(router, controller)
}
```

### 場景 2：帶快取的服務

```bash
bun scripts/generate-module.ts Product --cache
```

**集成方式**:
```typescript
// src/wiring/index.ts
export const registerProduct = (core: PlanetCore): void => {
  registerProductWithGravito(core) // 使用自動生成的適配器
}
```

### 場景 3：複雜的分散式系統

```bash
bun scripts/generate-module.ts Payment --redis --cache --db
```

**集成方式**:
```typescript
// src/wiring/index.ts
export const registerPayment = (core: PlanetCore): void => {
  registerPaymentWithGravito(core) // 使用自動生成的適配器
}
```

## 測試生成的模組

### 單元測試（無框架依賴）

```typescript
// tests/Unit/Order/OrderController.test.ts
import { OrderController } from '@/Modules/Order/Presentation/Controllers/OrderController'

describe('OrderController', () => {
  it('should list all orders', async () => {
    // Mock IOrderRepository
    const mockRepository = {
      findAll: async () => [{ id: '1', total: 100 }],
      findById: async (id) => null,
      save: async () => {},
      delete: async () => {},
    }

    const controller = new OrderController(mockRepository as any)

    // Mock IHttpContext
    const mockCtx = {
      json: (data: any) => new Response(JSON.stringify(data)),
    }

    const response = await controller.index(mockCtx as any)
    expect(response).toBeDefined()
  })
})
```

### 整合測試（使用真實適配器）

```typescript
// tests/Integration/Order/OrderAPI.test.ts
import { registerOrderWithGravito } from '@/adapters/GravitoOrderAdapter'
import { GravitoRedisAdapter } from '@/adapters/GravitoRedisAdapter'

describe('Order Module Integration', () => {
  it('should cache order in Redis', async () => {
    const redis = new GravitoRedisAdapter(testRedisClient)
    // ... 測試快取功能
  })
})
```

## 最佳實踐

### DO ✅

1. **使用生成器建立新模組**
   ```bash
   bun scripts/generate-module.ts MyModule --redis
   ```

2. **在適配器中進行所有 Gravito API 調用**
   - 只有 `GravitoXxxAdapter.ts` 應導入 `@gravito/*`

3. **應用層依賴抽象介面**
   - Controllers 使用 `IHttpContext`
   - Services 使用 `IRedisService`、`ICacheService`
   - Routes 使用 `IModuleRouter`

4. **為基礎設施服務添加 null 檢查**
   ```typescript
   const value = await this.redis?.get('key') // Redis 可選
   ```

### DON'T ❌

1. **不要在業務層導入 Gravito**
   ```typescript
   // ❌ 錯誤
   import { RedisClientContract } from '@gravito/plasma'

   // ✅ 正確
   import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
   ```

2. **不要在 Routes 中訪問容器**
   ```typescript
   // ❌ 錯誤
   router.get('/api/users', (ctx) => {
     const repo = ctx.container.make('userRepository')
   })

   // ✅ 正確
   export function registerUserRoutes(router, controller) {
     router.get('/api/users', (ctx) => controller.index(ctx))
   }
   ```

3. **不要跳過適配器層**
   - 所有框架耦合應在 `src/adapters/` 中處理

## 日後擴展

生成器可輕易擴展支援更多選項：

```bash
# 未來可能的用法
bun scripts/generate-module.ts Document --redis --cache --db --queue --search
```

編輯 `scripts/generate-module.ts` 添加新的標誌和適配器生成邏輯即可。

## 參考

- [ADAPTER_INFRASTRUCTURE_GUIDE.md](./ADAPTER_INFRASTRUCTURE_GUIDE.md) — 完整適配器設計指南
- [ADAPTER_INTEGRATION_EXAMPLES.md](./ADAPTER_INTEGRATION_EXAMPLES.md) — 實際使用範例
- [ARCHITECTURE.md](./ARCHITECTURE.md) — DDD 4 層架構
