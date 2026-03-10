# 適配器整合範例

## 概述

本文件提供實際的代碼範例，展示如何在不同模組中使用新的基礎設施適配器。

## 現有模組參考

### Health 模組（已整合）

**檔案**: `src/adapters/GravitoHealthAdapter.ts`

```typescript
// 完整組裝示例
export function registerHealthWithGravito(core: PlanetCore): void {
  // 1️⃣ 從容器提取原始 Gravito 服務
  const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
  const rawCache = core.container.make<CacheManager | undefined>('cache')

  // 2️⃣ 適配為框架無關的介面（可能為 null）
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
  const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null

  // 3️⃣ 組裝應用層服務
  const repository = new MemoryHealthCheckRepository()
  const databaseCheck = createGravitoDatabaseConnectivityCheck()
  const service = new PerformHealthCheckService(repository)
  const controller = new HealthController(service)

  // 4️⃣ 建立框架無關的路由
  const router = createGravitoModuleRouter(core)

  // 5️⃣ 註冊路由
  router.get('/health', (ctx) => {
    ctx.set('__redis', redis)
    ctx.set('__cache', cache)
    ctx.set('__databaseCheck', databaseCheck)
    return controller.check(ctx)
  })
}
```

## 添加新模組的步驟

### 場景 1：簡單 CRUD 模組（無特殊資源需求）

**例子**: User 模組（單純的 Repository + Controller）

#### Step 1：在接線層直接組裝（無需新適配器）

**檔案**: `src/wiring/index.ts`

```typescript
export const registerUser = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)

  // 從容器取得服務
  const repository = core.container.make('userRepository') as any
  const createUserHandler = core.container.make('createUserHandler') as any

  // 組裝控制器
  const controller = new UserController(repository, createUserHandler)

  // 註冊路由
  registerUserRoutes(router, controller)
}
```

**特點**:
- ✅ 簡潔，適合無框架資源依賴的模組
- ✅ 應用層完全框架無關
- ❌ 複雜邏輯時接線層會變臃腫

---

### 場景 2：複雜模組（使用多個 Gravito 服務）

**例子**: Order 模組（需要 Redis 快取、Cache、Database、Email）

#### Step 1：建立模組專用適配器

**檔案**: `src/adapters/GravitoOrderAdapter.ts`

```typescript
import type { PlanetCore } from '@gravito/core'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import { createGravitoModuleRouter } from './GravitoModuleRouter'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { createGravitoDatabaseConnectivityCheck } from './GravitoDatabaseAdapter'

/**
 * Order 模組完整適配器
 *
 * 組裝所有 Order 相關服務，包括：
 * - 訂單快取（Redis）
 * - 庫存快取（Cache）
 * - 資料庫持久化
 * - 郵件通知（外部服務）
 */
export function registerOrderWithGravito(core: PlanetCore): void {
  // 提取 Gravito 服務
  const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
  const rawCache = core.container.make<CacheManager | undefined>('cache')

  // 適配為框架無關介面
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
  const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null
  const databaseCheck = createGravitoDatabaseConnectivityCheck()

  // 組裝應用層服務
  const orderRepository = new OrderRepository()
  const inventoryService = new InventoryService(cache)
  const notificationService = new NotificationService() // 郵件等
  const createOrderService = new CreateOrderService(
    orderRepository,
    inventoryService,
    notificationService,
    redis, // 快取訂單狀態
  )
  const controller = new OrderController(createOrderService, orderRepository)

  // 建立框架無關的路由
  const router = createGravitoModuleRouter(core)

  // 註冊路由
  router.post('/orders', (ctx) => {
    ctx.set('__redis', redis)
    ctx.set('__cache', cache)
    return controller.create(ctx)
  })

  router.get('/orders/:id', (ctx) => controller.getById(ctx))
  router.put('/orders/:id', (ctx) => controller.update(ctx))
}
```

#### Step 2：在接線層中使用適配器

**檔案**: `src/wiring/index.ts`

```typescript
import { registerOrderWithGravito } from '@/adapters/GravitoOrderAdapter'

export const registerOrder = (core: PlanetCore): void => {
  registerOrderWithGravito(core)
}
```

#### Step 3：應用層完全無框架耦合

**檔案**: `src/Modules/Order/Application/Services/CreateOrderService.ts`

```typescript
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { Order } from '../../Domain/Entities/Order'

export class CreateOrderService {
  constructor(
    private repository: IOrderRepository,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private redis: IRedisService | null, // ← 介面，不是 RedisClientContract
  ) {}

  async execute(dto: CreateOrderDTO): Promise<OrderDTO> {
    // 檢查快取中的訂單狀態
    const cachedStatus = await this.redis?.get(`order:${dto.id}:status`)
    if (cachedStatus === 'pending') {
      throw new Error('Order already pending')
    }

    // 檢查庫存
    const available = await this.inventoryService.checkAvailability(dto.items)
    if (!available) {
      throw new Error('Items not in stock')
    }

    // 創建訂單聚合根
    const order = Order.create(dto)

    // 保存到資料庫
    await this.repository.save(order)

    // 緩存訂單狀態
    await this.redis?.set(`order:${order.id}:status`, 'pending', 3600)

    // 發送通知
    await this.notificationService.notifyOrderCreated(order)

    return OrderDTO.fromEntity(order)
  }
}
```

**特點**:
- ✅ 應用層只依賴 `IRedisService`，不知道 Gravito Plasma
- ✅ 所有框架耦合集中在 `GravitoOrderAdapter.ts`
- ✅ 易於測試（mock `IRedisService` 即可）
- ✅ 日後抽換框架只需修改適配器

---

## 測試示例

### 單元測試（Mock 介面）

**檔案**: `tests/Unit/Order/CreateOrderService.test.ts`

```typescript
import { CreateOrderService } from '@/Modules/Order/Application/Services/CreateOrderService'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

describe('CreateOrderService', () => {
  it('should not create order if pending in cache', async () => {
    // Mock IRedisService
    const mockRedis: IRedisService = {
      ping: async () => 'PONG',
      get: async (key) => key === 'order:123:status' ? 'pending' : null,
      set: async () => {},
      del: async () => {},
      exists: async () => false,
    }

    const service = new CreateOrderService(
      mockRepository,
      mockInventoryService,
      mockNotificationService,
      mockRedis,
    )

    await expect(
      service.execute({ id: '123', items: [] })
    ).rejects.toThrow('Order already pending')
  })

  it('should work without Redis (null case)', async () => {
    // 測試 Redis 不可用的情況
    const service = new CreateOrderService(
      mockRepository,
      mockInventoryService,
      mockNotificationService,
      null, // Redis 未啟用
    )

    const result = await service.execute({ id: '123', items: [{ sku: 'SKU1', qty: 1 }] })

    expect(result.id).toBe('123')
    // 不會快取，但應該仍能運作
  })
})
```

### 整合測試（使用真實適配器）

**檔案**: `tests/Integration/Order/CreateOrderService.test.ts`

```typescript
import { createGravitoRedisAdapter } from '@/adapters/GravitoRedisAdapter'
import { RedisContainer } from 'testcontainers'

describe('CreateOrderService Integration', () => {
  let redisContainer: RedisContainer

  beforeEach(async () => {
    redisContainer = await new RedisContainer().start()
  })

  afterEach(async () => {
    await redisContainer.stop()
  })

  it('should cache order status in Redis', async () => {
    const redis = redisContainer.getClient()
    const redisAdapter = new GravitoRedisAdapter(redis)

    const service = new CreateOrderService(
      realRepository,
      realInventoryService,
      realNotificationService,
      redisAdapter,
    )

    const order = await service.execute({ id: '123', items: [...] })

    // 驗證 Redis 中有快取
    const cached = await redis.get('order:123:status')
    expect(cached).toBe('pending')
  })
})
```

---

## 遷移現有模組（從 Gravito 直接依賴到適配器）

### Before（直接依賴 Gravito）

**檔案**: `src/Modules/Payment/Application/Services/ProcessPaymentService.ts`

```typescript
import type { RedisClientContract } from '@gravito/plasma' // ❌ 框架耦合
import type { CacheManager } from '@gravito/stasis'      // ❌ 框架耦合

export class ProcessPaymentService {
  constructor(
    private redis: RedisClientContract | null,    // ❌ 具體框架型別
    private cache: CacheManager | null,            // ❌ 具體框架型別
  ) {}

  async execute(dto: PaymentDTO): Promise<PaymentResultDTO> {
    // Gravito Plasma 特定 API
    const status = await this.redis?.get(`payment:${dto.id}`) // ❌ 框架 API

    // Gravito Stasis 特定 API
    await this.cache?.set(`result:${dto.id}`, result) // ❌ 框架 API
  }
}
```

### After（使用適配器介面）

**檔案**: `src/Modules/Payment/Application/Services/ProcessPaymentService.ts`

```typescript
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'   // ✅ 框架無關
import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'   // ✅ 框架無關

export class ProcessPaymentService {
  constructor(
    private redis: IRedisService | null,    // ✅ 介面型別
    private cache: ICacheService | null,    // ✅ 介面型別
  ) {}

  async execute(dto: PaymentDTO): Promise<PaymentResultDTO> {
    // 框架無關 API
    const status = await this.redis?.get(`payment:${dto.id}`) // ✅ 通用方法

    // 框架無關 API
    await this.cache?.set(`result:${dto.id}`, result) // ✅ 通用方法
  }
}
```

**遷移 Checklist**:

- [ ] 應用層：替換具體框架型別為介面型別（`RedisClientContract` → `IRedisService`）
- [ ] 移除：所有 `@gravito/*` 的匯入（除了在適配器中）
- [ ] 更新簽名：建構函式參數改用介面型別
- [ ] 適配器層：新增 `GravitoXxxAdapter.ts` 以支援舊型別
- [ ] 接線層：使用新適配器組裝依賴
- [ ] 測試：確保單元測試僅依賴介面

---

## 常見適配器實現模式

### 模式 1：工廠函式（無狀態服務）

使用於簡單服務，如資料庫連線檢查：

```typescript
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
  return {
    async ping(): Promise<boolean> {
      try {
        await DB.raw('SELECT 1')
        return true
      } catch {
        return false
      }
    },
  }
}
```

**何時使用**:
- ✅ 無狀態服務（純函數）
- ✅ 依賴項已在 Gravito 核心初始化
- ✅ 不需要生命週期管理

### 模式 2：類別包裝（有狀態服務）

使用於包裝現有實例，如 Redis 客戶端：

```typescript
export class GravitoRedisAdapter implements IRedisService {
  constructor(private readonly redis: RedisClientContract) {}

  async ping(): Promise<string> {
    return this.redis.ping()
  }
}
```

**何時使用**:
- ✅ 需要維持內部狀態
- ✅ 包裝外部實例
- ✅ 多個方法共享同一實例

### 模式 3：組合工廠（複雜模組）

使用於多個服務協作的模組，如 Health 檢查：

```typescript
export function registerHealthWithGravito(core: PlanetCore): void {
  // 1. 提取
  const rawRedis = core.container.make('redis')

  // 2. 適配
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null

  // 3. 組裝
  const service = new HealthCheckService(redis, ...)

  // 4. 註冊
  const router = createGravitoModuleRouter(core)
  router.get('/health', (ctx) => controller.check(ctx))
}
```

**何時使用**:
- ✅ 多個適配器協作
- ✅ 複雜的依賴注入
- ✅ 條件性組裝（Redis 可選等）

---

## 參考文件

- [ADAPTER_INFRASTRUCTURE_GUIDE.md](./ADAPTER_INFRASTRUCTURE_GUIDE.md) — 完整適配器設計指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 4 層 DDD 架構
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) — 模組創建教程
