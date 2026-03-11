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
