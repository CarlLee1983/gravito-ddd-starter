# 適配器與基礎設施指南

## 概述

`src/adapters/` 層實現了完整的框架無關設計，將 Gravito 框架的具體實現與領域層/應用層解耦。

### 適配器責任

1. **Port Adaptation** — 將 Gravito 框架服務適配為框架無關的 Port（介面）
2. **Dependency Composition** — 組裝所有依賴關係
3. **Service Injection** — 透過建構函式/方法將服務注入到應用層
4. **Framework Isolation** — 確保框架耦合只存在於此層

## 架構層次

```
┌─────────────────────────────────────┐
│  Presentation (Routes/Controllers)   │ ← IHttpContext, IModuleRouter
├─────────────────────────────────────┤
│  Application (Services/DTOs)         │ ← IRedisService, ICacheService, etc.
├─────────────────────────────────────┤
│  Domain (Entities/Services)          │ ← Pure Business Logic
├─────────────────────────────────────┤
│  Infrastructure (Repositories)       │ ← Repository Implementations
├─────────────────────────────────────┤
│  Adapters (Port Implementations)     │ ← GravitoDatabaseAdapter, etc.
│                                       │ ← ONLY layer that touches @gravito/*
├─────────────────────────────────────┤
│  Framework (Gravito Core)            │ ← PlanetCore, GravitoContext, etc.
└─────────────────────────────────────┘
```

## 框架無關的 Port 介面

所有適配器實現以下介面（在 `src/Shared/Infrastructure/` 中定義）：

### 1. IDatabaseAccess — 資料庫操作

**檔案**: `src/Shared/Infrastructure/IDatabaseAccess.ts`

```typescript
export interface IQueryBuilder {
  where(...args: unknown[]): IQueryBuilder
  first(): Promise<Record<string, unknown> | null>
  select(): Promise<Record<string, unknown>[]>
  insert(data: Record<string, unknown>): Promise<void>
  update(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  limit(n: number): IQueryBuilder
  offset(n: number): IQueryBuilder
  orderBy(column: string, direction: string): IQueryBuilder
  whereBetween(column: string, range: [Date, Date]): IQueryBuilder
  count(): Promise<number>
}

export interface IDatabaseAccess {
  table(name: string): IQueryBuilder
}
```

**應用**: Repository 層透過此介面訪問資料庫，完全不依賴 ORM

### 2. IDatabaseConnectivityCheck — 資料庫連線檢查

**檔案**: `src/Shared/Infrastructure/IDatabaseConnectivityCheck.ts`

```typescript
export interface IDatabaseConnectivityCheck {
  ping(): Promise<boolean>
}
```

**應用**: 健康檢查、整合測試等需要驗證資料庫連線狀態的場景

### 3. IRedisService — Redis 操作

**檔案**: `src/Shared/Infrastructure/IRedisService.ts`

```typescript
export interface IRedisService {
  ping(): Promise<string>
  get(key: string): Promise<string | null>
  set(key: string, value: string, expiresInSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

**應用**: 快取、session 管理、分散式鎖等功能

### 4. ICacheService — 快取操作

**檔案**: `src/Shared/Infrastructure/ICacheService.ts`

```typescript
export interface ICacheService {
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>
  forget(key: string): Promise<void>
  flush(): Promise<void>
}
```

**應用**: 應用層快取策略，支援多種 cache 驅動（memory/redis）

## 適配器實現

### 1. GravitoDatabaseAdapter — Atlas ORM 適配

**檔案**: `src/adapters/GravitoDatabaseAdapter.ts`

```typescript
export function createGravitoDatabaseAccess(): IDatabaseAccess {
  return DB as unknown as IDatabaseAccess
}

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

**設計特點**:
- Factory 函式（非類別），簡化依賴注入
- `ping()` 使用 `SELECT 1` 驗證連線，輕量且可靠
- 隱藏 Gravito Atlas 的具體 API

**日後替換 ORM 時**:
```typescript
// 若改用 Prisma
export function createGravitoDatabaseAccess(): IDatabaseAccess {
  return new PrismaDatabaseAdapter(prisma)
}
```

### 2. GravitoRedisAdapter — Plasma Redis 適配

**檔案**: `src/adapters/GravitoRedisAdapter.ts`

```typescript
export class GravitoRedisAdapter implements IRedisService {
  constructor(private readonly redis: RedisClientContract) {}

  async ping(): Promise<string> {
    return this.redis.ping()
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, expiresInSeconds?: number): Promise<void> {
    await this.redis.set(
      key,
      value,
      expiresInSeconds ? { ex: expiresInSeconds } : undefined,
    )
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) > 0
  }
}
```

**設計特點**:
- 類別包裝 `RedisClientContract`（Gravito Plasma 提供）
- 各方法映射到對應的 Plasma API
- `exists()` 將數字返回值轉換為布林值

### 3. GravitoCacheAdapter — Stasis 快取適配

**檔案**: `src/adapters/GravitoCacheAdapter.ts`

```typescript
export class GravitoCacheAdapter implements ICacheService {
  constructor(private readonly cache: CacheManager) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.cache.get<T>(key)
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds)
  }

  async forget(key: string): Promise<void> {
    await this.cache.forget(key)
  }

  async flush(): Promise<void> {
    await this.cache.flush()
  }
}
```

**設計特點**:
- 類別包裝 `CacheManager`（Gravito Stasis 提供）
- 支援泛型，適應任意資料型別
- 完全透傳 Stasis API

### 4. GravitoHealthAdapter — 完整模組組裝

**檔案**: `src/adapters/GravitoHealthAdapter.ts`

```typescript
export function registerHealthWithGravito(core: PlanetCore): void {
  // 1. 從容器提取原始服務（可能為 undefined）
  const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
  const rawCache = core.container.make<CacheManager | undefined>('cache')

  // 2. 適配為框架無關的介面
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
  const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null

  // 3. 組裝應用層
  const repository = new MemoryHealthCheckRepository()
  const databaseCheck = createGravitoDatabaseConnectivityCheck()
  const performHealthCheckService = new PerformHealthCheckService(repository)
  const controller = new HealthController(performHealthCheckService)

  // 4. 建立框架無關的路由介面
  const router = createGravitoModuleRouter(core)

  // 5. 透過 IModuleRouter 註冊路由
  router.get('/health', (ctx) => {
    // 為了相容目前的 API，將適配器服務注入到 context
    ctx.set('__redis', redis)
    ctx.set('__cache', cache)
    ctx.set('__databaseCheck', databaseCheck)
    return controller.check(ctx)
  })

  router.get('/health/history', (ctx) => controller.history(ctx))
}
```

**責任分解**:
1. **服務提取** — 從 PlanetCore 容器取得框架特定服務
2. **服務適配** — 包裝為框架無關的 Port 介面
3. **依賴組裝** — 建立完整的依賴注入樹
4. **路由註冊** — 透過 IModuleRouter 抽象註冊路由

## 使用範例

### 檢查資料庫連線（應用層）

**無需匯入 @gravito/atlas**:

```typescript
// src/Modules/Health/Application/Services/CheckHealthService.ts
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'

export class CheckHealthService {
  constructor(
    private databaseCheck: IDatabaseConnectivityCheck | null,
  ) {}

  async execute(): Promise<HealthCheckDTO> {
    const dbHealthy = await this.databaseCheck?.ping() ?? false
    // ... 構建檢查結果
  }
}
```

### 使用快取（應用層）

**無需匯入 @gravito/stasis**:

```typescript
// src/Modules/Auth/Application/Services/LoginService.ts
import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'

export class LoginService {
  constructor(
    private cache: ICacheService | null,
  ) {}

  async login(email: string, password: string): Promise<AuthDTO> {
    // 檢查缓存的用户信息
    const cachedUser = await this.cache?.get<User>(`user:${email}`)
    if (cachedUser) return AuthDTO.fromEntity(cachedUser)

    // ... 從資料庫查詢
  }
}
```

### 存取 Redis（應用層）

**無需匯入 @gravito/plasma**:

```typescript
// src/Modules/Session/Application/Services/SessionService.ts
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

export class SessionService {
  constructor(
    private redis: IRedisService | null,
  ) {}

  async createSession(userId: string): Promise<string> {
    const token = generateToken()

    await this.redis?.set(
      `session:${token}`,
      userId,
      3600  // 1 小時過期
    )

    return token
  }
}
```

## 接線層（Wiring Layer）

**檔案**: `src/wiring/index.ts`

接線層是唯一知道 Gravito 框架如何組織的地方：

```typescript
export const registerHealth = (core: PlanetCore): void => {
  // 委派給完整的適配器
  registerHealthWithGravito(core)
}

export const registerUser = (core: PlanetCore): void => {
  // 委派給完整的適配器
  registerUserWithGravito(core)
}
```

## 日後框架抽換場景

### 從 Gravito 換到 Express.js

只需修改 `src/adapters/` 中的實現，無需修改任何業務邏輯：

**第 1 步：替換 DatabaseAdapter**
```typescript
// src/adapters/ExpressDatabaseAdapter.ts
import { PrismaDatabaseAccess } from '@/adapters/prisma'

export function createExpressDatabaseAccess(): IDatabaseAccess {
  return new PrismaDatabaseAccess(prisma)
}
```

**第 2 步：替換 RedisAdapter**
```typescript
// src/adapters/ExpressRedisAdapter.ts
import { IORedisAdapter } from '@/adapters/ioredis'

export function createExpressRedisAdapter(redis: Redis): IRedisService {
  return new IORedisAdapter(redis)
}
```

**第 3 步：更新接線層**
```typescript
// src/wiring/index.ts
export const registerHealth = (app: Express): void => {
  const redis = app.locals.redis
  const cache = app.locals.cache

  const redisAdapter = redis ? new ExpressRedisAdapter(redis) : null
  const cacheAdapter = cache ? new ExpressCacheAdapter(cache) : null

  // ... 組裝並註冊路由
}
```

所有業務邏輯（Domain/Application）無需改動！

## 最佳實踐

### ✅ DO

1. **使用 Port（介面）** — 應用層依賴 `IRedisService`，不依賴 `RedisClientContract`
2. **工廠函式** — 無狀態的服務使用工廠函式（如 `createGravitoDatabaseAccess()`）
3. **類別包裝** — 有狀態的服務使用類別（如 `GravitoRedisAdapter`）
4. **Optional Services** — 快取/Redis 應可選，檢查 `null` 再使用
5. **隱藏具體實現** — 應用層不匯入 Gravito 模組

### ❌ DON'T

1. **直接依賴框架** — 應用層不應匯入 `@gravito/*`
2. **框架決策在業務層** — Domain 層不應知道資料庫是 SQLite 或 PostgreSQL
3. **適配器洩露抽象** — 適配器應完全隱藏 Gravito API
4. **跳過接線層** — Controllers 應透過接線層組裝，不應直接存取框架服務
5. **硬編碼框架**配置 — 所有框架配置應來自 `src/adapters/` 或環境變數

## 測試支援

### 單元測試 — 使用 Mock Port

```typescript
// tests/Unit/Auth/LoginService.test.ts
import { LoginService } from '@/Modules/Auth/Application/Services/LoginService'

describe('LoginService', () => {
  it('should use cached user if available', async () => {
    // Mock ICacheService
    const mockCache = {
      get: async () => ({ id: '1', email: 'test@example.com' }),
      set: async () => {},
      forget: async () => {},
      flush: async () => {},
    }

    const service = new LoginService(mockCache as any)
    const result = await service.login('test@example.com', 'password')

    expect(result.id).toBe('1')
  })
})
```

### 整合測試 — 使用真實適配器

```typescript
// tests/Integration/Auth/LoginService.test.ts
import { createGravitoRedisAdapter } from '@/adapters/GravitoRedisAdapter'
import { LoginService } from '@/Modules/Auth/Application/Services/LoginService'

describe('LoginService Integration', () => {
  it('should cache user in Redis', async () => {
    const redis = getTestRedisInstance() // 測試用 Redis
    const cacheAdapter = new GravitoRedisAdapter(redis)

    const service = new LoginService(cacheAdapter)
    await service.login('test@example.com', 'password')

    const cached = await redis.get('user:test@example.com')
    expect(cached).toBeDefined()
  })
})
```

## 常見問題

### Q：為什麼適配器層很重要？

**A**：適配器層隔離了框架耦合，讓你能夠：
- 輕易抽換框架（Gravito → Express → Fastify）
- 獨立測試業務邏輯（無需啟動整個框架）
- 在不同框架間重複使用領域層和應用層代碼
- 明確劃分關注點

### Q：什麼時候應用層應該接收 null 服務？

**A**：當服務是可選時（如 Redis、Cache）：
- Redis 不可用時，應用應仍能運作（降級模式）
- Cache 失敗時，直接查詢資料庫
- 但資料庫連線檢查不應為 `null`

### Q：我應該為每個 Gravito 模組建立一個適配器嗎？

**A**：視情況而定：
- 簡單模組（如 User CRUD）—— 在接線層直接組裝
- 複雜模組（如 Health 檢查多個服務）—— 建立 `GravitoXxxAdapter.ts`

## 參考

- [Port & Adapter Pattern](https://alistair.cockburn.us/hexagonal-architecture/)
- [Gravito 文件](https://github.com/gravito-framework/gravito)
- [DDD 依賴規則](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
# 適配器與擴充設計指南 (Adapters & Extensions)

此文檔說明如何使用適配器模式來實現跨模組擴充和集成，保持模組的獨立性。

## 核心概念

### 適配器的三大用途

```
1️⃣  轉換介面
   └─ 將一個模組的介面轉換為另一個模組期望的介面
   └─ 例：Product 模組的 Repository → Shop 模組期望的 Service

2️⃣  跨模組集成
   └─ 安全地連接多個模組
   └─ 例：User 模組 + Product 模組 = 訂單模組

3️⃣  外部服務適配
   └─ 將外部 API/SDK 適配為模組介面
   └─ 例：支付 API → 支付介面適配器
```

### 何時使用適配器

```
✅ 使用適配器：
  - 需要連接不同模組
  - 需要適配外部服務
  - 需要提供多個實作選擇
  - 希望保持模組獨立

❌ 不需要適配器：
  - 模組內部的簡單轉換
  - 一次性的轉換邏輯
  - 簡單的映射操作
```

---

## 目錄結構

```
src/
├── Modules/
│   ├── Product/
│   ├── Shop/
│   ├── User/
│   └── ...
│
├── Shared/
│   └── ...
│
└── Adapters/
    ├── Product/                    # 產品相關適配器
    │   ├── ProductToShopAdapter.ts
    │   └── index.ts
    │
    ├── User/                       # 使用者相關適配器
    │   ├── UserToOrderAdapter.ts
    │   └── index.ts
    │
    ├── External/                   # 外部服務適配器
    │   ├── PaymentServiceAdapter.ts
    │   ├── EmailServiceAdapter.ts
    │   └── index.ts
    │
    └── index.ts                    # 所有適配器入口
```

---

## 模式 1：模組介面轉換適配器

### 場景

Product 模組提供 `IProductRepository`，但 Shop 模組期望 `IProductService`。

### 實作

**`src/Modules/Product/index.ts`** - Product 模組公開 API

```typescript
// Product 模組只提供倉庫
export { IProductRepository } from './Domain/Repositories/IProductRepository'
export type { ProductDTO } from './Application/DTOs/ProductDTO'

export interface ProductModuleConfig {
  repository: IProductRepository
}

export function initProductModule(config: ProductModuleConfig) {
  return {
    createProductService: new CreateProductService(config.repository)
  }
}
```

**`src/Adapters/Product/ProductToShopAdapter.ts`** - 適配器轉換

```typescript
import {
  CreateProductService,
  ProductDTO,
  ProductModuleConfig
} from '@/Modules/Product'

/**
 * Product → Shop 適配器
 *
 * Shop 模組期望一個 ProductService，但 Product 模組提供的是 Repository。
 * 此適配器轉換 Product 的應用服務為 Shop 期望的介面。
 *
 * 優點：
 * - Product 模組不知道 Shop 模組的存在
 * - Shop 模組只依賴適配器，不依賴 Product 實現細節
 * - 適配器集中在 src/adapters 目錄，易於管理
 */

/**
 * Shop 模組期望的 ProductService 介面
 */
export interface IProductServiceForShop {
  /**
   * 取得產品詳細資訊（包括庫存、定價等）
   */
  getProductDetails(productId: string): Promise<ProductDetailsDTO>

  /**
   * 批量驗證產品是否存在和有效
   */
  validateProducts(items: { productId: string; quantity: number }[]): Promise<ValidationResult>

  /**
   * 計算訂單總價
   */
  calculateOrderTotal(items: any[]): Promise<number>
}

export interface ProductDetailsDTO {
  id: string
  name: string
  price: number
  available: boolean
  stock?: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  products: ProductDetailsDTO[]
}

/**
 * 實現適配器
 */
export class ProductToShopAdapter implements IProductServiceForShop {
  constructor(
    private productModule: ReturnType<typeof initProductModule>
  ) {}

  /**
   * 適配：Product 模組的 ProductDTO → Shop 期望的 ProductDetailsDTO
   */
  async getProductDetails(productId: string): Promise<ProductDetailsDTO> {
    const repository = this.productModule.repository
    const product = await repository.findById(productId)

    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    // 轉換 ProductDTO 為 ProductDetailsDTO
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      available: product.status === 'published',
      stock: product.stock // 假設 Product 模組提供 stock 欄位
    }
  }

  /**
   * 適配：批量驗證產品
   */
  async validateProducts(
    items: { productId: string; quantity: number }[]
  ): Promise<ValidationResult> {
    const repository = this.productModule.repository
    const errors: string[] = []
    const products: ProductDetailsDTO[] = []

    for (const item of items) {
      const product = await repository.findById(item.productId)

      if (!product) {
        errors.push(`Product not found: ${item.productId}`)
        continue
      }

      if (product.status !== 'published') {
        errors.push(`Product not available: ${item.productId}`)
        continue
      }

      if (product.stock && product.stock < item.quantity) {
        errors.push(
          `Insufficient stock for product ${item.productId}: requested ${item.quantity}, available ${product.stock}`
        )
        continue
      }

      products.push(await this.getProductDetails(item.productId))
    }

    return {
      valid: errors.length === 0,
      errors,
      products
    }
  }

  /**
   * 適配：計算訂單總價
   */
  async calculateOrderTotal(items: any[]): Promise<number> {
    let total = 0

    for (const item of items) {
      const details = await this.getProductDetails(item.productId)
      total += details.price * item.quantity
    }

    return total
  }
}
```

**`src/Adapters/Product/index.ts`** - 適配器公開 API

```typescript
export { ProductToShopAdapter } from './ProductToShopAdapter'
export type {
  IProductServiceForShop,
  ProductDetailsDTO,
  ValidationResult
} from './ProductToShopAdapter'
```

---

## 模式 2：外部服務適配器

### 場景

整合第三方支付服務（Stripe、PayPal）。

**`src/Adapters/External/PaymentServiceAdapter.ts`**

```typescript
/**
 * 支付服務適配器
 *
 * 將不同的第三方支付 API 適配為統一的介面。
 * Order 模組只知道 IPaymentService，不需要知道具體的支付提供商。
 */

/**
 * 統一的支付服務介面
 * Order 模組依賴此介面
 */
export interface IPaymentService {
  createPayment(request: CreatePaymentRequest): Promise<PaymentResponse>
  refund(transactionId: string, amount: number): Promise<RefundResponse>
  getStatus(transactionId: string): Promise<PaymentStatus>
}

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  currency: string
  description: string
  metadata?: Record<string, any>
}

export interface PaymentResponse {
  transactionId: string
  status: 'pending' | 'completed' | 'failed'
  amount: number
  currency: string
  redirectUrl?: string // 用於重定向支付
}

export interface RefundResponse {
  transactionId: string
  refundId: string
  status: 'success' | 'failed'
  amount: number
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

/**
 * Stripe 支付適配器
 */
export class StripePaymentAdapter implements IPaymentService {
  constructor(private stripeClient: any) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const intent = await this.stripeClient.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Stripe 使用分為單位
      currency: request.currency.toLowerCase(),
      description: request.description,
      metadata: {
        orderId: request.orderId,
        ...request.metadata
      }
    })

    return {
      transactionId: intent.id,
      status: intent.status === 'succeeded' ? 'completed' : 'pending',
      amount: request.amount,
      currency: request.currency,
      redirectUrl: intent.client_secret ? `/checkout/${intent.id}` : undefined
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    const refund = await this.stripeClient.refunds.create({
      payment_intent: transactionId,
      amount: Math.round(amount * 100)
    })

    return {
      transactionId,
      refundId: refund.id,
      status: refund.status === 'succeeded' ? 'success' : 'failed',
      amount
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const intent = await this.stripeClient.paymentIntents.retrieve(transactionId)

    switch (intent.status) {
      case 'succeeded':
        return 'completed'
      case 'processing':
        return 'pending'
      case 'requires_payment_method':
        return 'pending'
      default:
        return 'failed'
    }
  }
}

/**
 * PayPal 支付適配器
 */
export class PayPalPaymentAdapter implements IPaymentService {
  constructor(private paypalClient: any) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const order = await this.paypalClient.createOrder({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toString()
          },
          description: request.description
        }
      ],
      application_context: {
        return_url: 'https://example.com/return',
        cancel_url: 'https://example.com/cancel'
      }
    })

    const approveLink = order.links.find((link: any) => link.rel === 'approve')

    return {
      transactionId: order.id,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      redirectUrl: approveLink?.href
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    // PayPal 退款邏輯
    const refund = await this.paypalClient.capturesRefund(transactionId, {
      amount: {
        value: amount.toString(),
        currency_code: 'USD'
      }
    })

    return {
      transactionId,
      refundId: refund.id,
      status: 'success',
      amount
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const order = await this.paypalClient.getOrder(transactionId)
    const status = order.status

    switch (status) {
      case 'COMPLETED':
        return 'completed'
      case 'APPROVED':
        return 'pending'
      default:
        return 'failed'
    }
  }
}
```

**`src/Adapters/External/index.ts`**

```typescript
export { StripePaymentAdapter, PayPalPaymentAdapter } from './PaymentServiceAdapter'
export type {
  IPaymentService,
  CreatePaymentRequest,
  PaymentResponse,
  RefundResponse,
  PaymentStatus
} from './PaymentServiceAdapter'

// 工廠函數：根據環境選擇支付提供商
export function createPaymentService(): IPaymentService {
  const provider = process.env.PAYMENT_PROVIDER || 'stripe'

  switch (provider) {
    case 'paypal':
      return new PayPalPaymentAdapter(getPayPalClient())
    case 'stripe':
    default:
      return new StripePaymentAdapter(getStripeClient())
  }
}

function getStripeClient() {
  // 初始化 Stripe 客戶端
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

function getPayPalClient() {
  // 初始化 PayPal 客戶端
  return require('paypal-rest-sdk')
}
```

---

## 模式 3：複合適配器（多模組集成）

### 場景

整合 User + Product + Shop 模組來建立完整的訂單流程。

**`src/Adapters/Order/OrderIntegrationAdapter.ts`**

```typescript
import { IProductServiceForShop } from '../Product/ProductToShopAdapter'
import { IUserService } from '@/Modules/User'
import { IPaymentService } from '../External/PaymentServiceAdapter'

/**
 * 訂單整合適配器
 *
 * 協調三個模組（Product、User、Payment）來建立訂單。
 * 此適配器是模組間複雜交互的協調器。
 */

export interface OrderCreationRequest {
  userId: string
  items: Array<{
    productId: string
    quantity: number
  }>
  shippingAddress: string
  paymentMethod: 'stripe' | 'paypal'
}

export interface OrderCreationResponse {
  orderId: string
  paymentUrl?: string // 用於重定向支付
  status: 'created' | 'payment_pending' | 'completed'
}

export class OrderIntegrationAdapter {
  constructor(
    private productService: IProductServiceForShop,
    private userService: IUserService,
    private paymentService: IPaymentService,
    private orderRepository: IOrderRepository // Order 模組的倉庫
  ) {}

  /**
   * 建立訂單的完整流程
   *
   * 1. 驗證使用者
   * 2. 驗證產品
   * 3. 計算價格
   * 4. 建立支付
   * 5. 保存訂單
   */
  async createOrder(request: OrderCreationRequest): Promise<OrderCreationResponse> {
    try {
      // 步驟 1: 驗證使用者
      const user = await this.userService.getUserById(request.userId)
      if (!user) {
        throw new Error('User not found')
      }

      // 步驟 2: 驗證產品和庫存
      const validation = await this.productService.validateProducts(request.items)
      if (!validation.valid) {
        throw new Error(`Product validation failed: ${validation.errors.join(', ')}`)
      }

      // 步驟 3: 計算訂單總價
      const totalPrice = await this.productService.calculateOrderTotal(request.items)

      // 步驟 4: 建立支付
      const payment = await this.paymentService.createPayment({
        orderId: crypto.randomUUID(),
        amount: totalPrice,
        currency: 'USD',
        description: `Order for user ${request.userId}`
      })

      // 步驟 5: 保存訂單到資料庫
      const order = await this.orderRepository.create({
        id: payment.transactionId,
        userId: request.userId,
        items: validation.products,
        totalPrice,
        shippingAddress: request.shippingAddress,
        paymentId: payment.transactionId,
        status: 'payment_pending'
      })

      return {
        orderId: order.id,
        paymentUrl: payment.redirectUrl,
        status: 'payment_pending'
      }
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`)
    }
  }
}
```

---

## 在 DI 容器中配置適配器

**`src/app.ts`**

```typescript
import {
  initProductModule,
  ProductModuleConfig
} from './Modules/Product'

import { ProductToShopAdapter } from './Adapters/Product'
import { createPaymentService } from './Adapters/External'

export async function createApp() {
  const core = await new Application().bootstrap()
  const container = core.container

  // ========== 模組初始化 ==========

  // Product 模組
  const productRepository = new SqliteProductRepository()
  const productModule = initProductModule({
    repository: productRepository
  })

  container.singleton('ProductRepository', () => productRepository)
  container.singleton('CreateProductService', () => productModule.createProductService)

  // ========== 適配器初始化 ==========

  // 適配器 1: Product → Shop 適配器
  const productToShopAdapter = new ProductToShopAdapter(productModule)
  container.singleton('ProductServiceForShop', () => productToShopAdapter)

  // 適配器 2: 支付服務適配器
  const paymentService = createPaymentService()
  container.singleton('PaymentService', () => paymentService)

  // ========== 複合適配器 ==========

  // 整合多個模組的適配器
  const orderIntegrationAdapter = new OrderIntegrationAdapter(
    productToShopAdapter,
    container.get('UserService'),
    paymentService,
    container.get('OrderRepository')
  )

  container.singleton('OrderIntegrationAdapter', () => orderIntegrationAdapter)

  return core
}
```

---

## 適配器最佳實踐

### ✅ 做這些

```typescript
// 1. 明確的職責
export interface IAdapter {
  // 清晰的方法簽名
  transformA(input: TypeA): TypeB
}

// 2. 單一責任
// 每個適配器只做一件事（轉換或整合）

// 3. 依賴注入
export class Adapter {
  constructor(
    private source: ISource,      // 來源
    private target: ITarget       // 目標
  ) {}
}

// 4. 錯誤處理
async transform(input: any) {
  try {
    // 轉換邏輯
  } catch (error) {
    throw new AdapterError(`Transform failed: ${error.message}`)
  }
}

// 5. 集中管理
// 所有適配器放在 src/adapters 目錄
```

### ❌ 避免這些

```typescript
// 1. 模糊的責任
// ❌ 一個適配器做太多事

// 2. 雙向適配
// ❌ Adapter 既轉換 A→B，也轉換 B→A
// ✅ 為不同方向建立不同的適配器

// 3. 隱藏的依賴
// ❌ constructor 中硬編碼依賴
// ✅ 所有依賴都通過參數注入

// 4. 模組污染
// ❌ 在模組內放適配器邏輯
// ✅ 適配器放在 src/adapters 目錄

// 5. 過度設計
// ❌ 簡單映射也建立適配器
// ✅ 只在實際需要時才使用
```

---

## 目錄結構最佳實踐

```
src/Adapters/
├── Product/
│   ├── ProductToShopAdapter.ts      # 介面轉換適配器
│   ├── ProductToCatalogAdapter.ts   # 另一個轉換
│   └── index.ts                     # 公開 API
│
├── User/
│   ├── UserToOrderAdapter.ts        # User → Order
│   └── index.ts
│
├── External/
│   ├── PaymentServiceAdapter.ts     # 支付適配器
│   ├── EmailServiceAdapter.ts       # 郵件適配器
│   ├── StorageAdapter.ts            # 儲存適配器
│   └── index.ts
│
├── Integration/
│   ├── OrderIntegrationAdapter.ts   # 複合適配器
│   ├── CheckoutAdapter.ts           # 結帳流程
│   └── index.ts
│
└── index.ts                         # 所有適配器的統一入口
```

**`src/Adapters/index.ts`** - 統一入口

```typescript
// Product 適配器
export * from './Product'

// User 適配器
export * from './User'

// 外部服務適配器
export * from './External'

// 複合適配器
export * from './Integration'
```

---

## 測試適配器

**`tests/Unit/Adapters/ProductToShopAdapter.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { ProductToShopAdapter } from '@/Adapters/Product'

describe('ProductToShopAdapter', () => {
  it('should adapt product details correctly', async () => {
    // Mock Product 模組
    const mockProductModule = {
      repository: {
        findById: async (id: string) => ({
          id,
          name: 'Test Product',
          price: 99.99,
          status: 'published',
          stock: 10
        })
      }
    }

    const adapter = new ProductToShopAdapter(mockProductModule)

    const details = await adapter.getProductDetails('123')

    expect(details).toEqual({
      id: '123',
      name: 'Test Product',
      price: 99.99,
      available: true,
      stock: 10
    })
  })

  it('should validate multiple products correctly', async () => {
    const mockProductModule = {
      repository: {
        findById: async (id: string) => ({
          id,
          name: `Product ${id}`,
          price: 100,
          status: 'published',
          stock: 5
        })
      }
    }

    const adapter = new ProductToShopAdapter(mockProductModule)

    const result = await adapter.validateProducts([
      { productId: '1', quantity: 3 },
      { productId: '2', quantity: 10 } // 超過庫存
    ])

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
```

---

## 命名規範

```
適配器命名：
  [Source]To[Target]Adapter
  例：
    ProductToShopAdapter
    StripePaymentAdapter
    UserToOrderAdapter

介面命名：
  I[Module]ServiceFor[Target]
  例：
    IProductServiceForShop
    IPaymentService

檔案位置：
  src/Adapters/[Category]/[AdapterName].ts
  例：
    src/Adapters/Product/ProductToShopAdapter.ts
    src/Adapters/External/StripePaymentAdapter.ts
```

---

## 何時添加新適配器

新增適配器的檢查清單：

- [ ] 兩個或多個模組需要交互
- [ ] 需要轉換或整合資料
- [ ] 無法通過簡單的事件解決
- [ ] 需要同步的結果
- [ ] 邏輯足夠複雜，值得提取

如果這些都不符合，直接在模組內解決即可。

---

## 相關資源

- 📖 [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- 🏛️ [Facade Pattern](https://refactoring.guru/design-patterns/facade)
- 🔗 [Dependency Injection](https://martinfowler.com/articles/injection.html)
- 📚 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
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
