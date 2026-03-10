# Wiring Layer - 統一的依賴組裝指南

## 概述

Wiring Layer 是應用程式的「組裝廠」，負責：

1. **ORM 選擇** - 讀取環境變數決定 Repository 實現
2. **依賴注入** - 從容器獲取已配置的服務
3. **控制器組裝** - 連接 Repository、Handler、Controller
4. **路由註冊** - 將路由掛載到框架

## 架構層級

```
┌─────────────────────────────────────────────────────┐
│          Application Bootstrap (main.ts)             │
│            初始化 PlanetCore、加載配置                │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│        ServiceProvider Layer (register phase)        │
│  UserServiceProvider.register() → 使用 Factory 註冊  │
│  PostServiceProvider.register() → 使用 Factory 註冊  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│         Wiring Layer (組裝層) ← 你在這裡               │
│  registerUser() → 組裝 UserController + Routes      │
│  registerPost() → 組裝 PostController + Routes      │
│  printORMConfiguration() → 診斷信息                  │
└──────────────────────────────────────────────────────┘
```

---

## 檔案結構

```
src/wiring/
├── index.ts                    # 主要 Wiring 層入口
│   ├── registerHealth()        # Health 模組
│   ├── registerUser()          # User 模組
│   ├── registerPost()          # Post 模組（示例）
│   └── printORMConfiguration() # 診斷
│
└── RepositoryFactory.ts        # ORM 選擇工廠
    ├── getCurrentORM()         # 讀取環境變數
    ├── createRepository()      # 建立 Repository
    ├── getDatabaseAccess()     # 初始化 Database
    └── 類型定義
```

---

## registerUser() 詳解

### 流程圖

```
registerUser(core) 被呼叫
    │
    ├─► core.container.make('userRepository')
    │   └─► UserServiceProvider 已在 boot 時註冊
    │       └─► createRepository('user', db)
    │           └─► 根據 ORM 環境變數選擇實現
    │
    ├─► core.container.make('createUserHandler')
    │   └─► 依賴於上面的 userRepository
    │
    ├─► new UserController(repository, handler)
    │   └─► 組裝控制器實例
    │
    └─► registerUserRoutes(router, controller)
        └─► 掛載路由到框架
```

### 程式碼

```typescript
export const registerUser = (core: PlanetCore): void => {
  // 1. 建立框架無關的路由器
  const router = createGravitoModuleRouter(core)

  // 2. 從容器取出已配置的服務
  //    重點：不直接建立 Repository！
  //    而是取出由 ServiceProvider 透過 Factory 建立的實例
  const repository = core.container.make('userRepository') as any
  const createUserHandler = core.container.make('createUserHandler') as any

  // 3. 組裝控制器
  const controller = new UserController(repository, createUserHandler)

  // 4. 使用框架無關的 API 註冊路由
  registerUserRoutes(router, controller)
}
```

### 關鍵特點

```typescript
// ✅ 好的做法：從容器取出服務
const repository = core.container.make('userRepository')

// ❌ 錯誤做法：在 Wiring 層直接建立
const repository = new UserRepository() // 不知道該用哪個實現

// ❌ 錯誤做法：在 Wiring 層選擇 ORM
if (orm === 'drizzle') {
  return new DrizzleUserRepository(db)
}
// 這應該由 ServiceProvider + RepositoryFactory 負責
```

---

## RepositoryFactory 工廠詳解

### 職責分工

```
環境啟動
    │
    ├─► bootstrap() 初始化應用
    │   ├─► 註冊所有 ServiceProvider
    │   └─► UserServiceProvider.register()
    │
    ├─► UserServiceProvider 中：
    │   └─► createRepository('user', db)  ← 工廠決定實現
    │
    └─► Wiring Layer：
        └─► core.container.make('userRepository')  ← 只取出，不決定
```

### getCurrentORM() 實現

```typescript
export function getCurrentORM(): ORMType {
  const orm = process.env.ORM || 'memory'
  const validORMs: ORMType[] = ['memory', 'drizzle', 'atlas', 'prisma']

  if (!validORMs.includes(orm as ORMType)) {
    console.warn(`❌ 不支援的 ORM: "${orm}"，使用預設 "memory"`)
    return 'memory'
  }

  console.log(`📦 已選擇 ORM: ${orm}`)
  return orm as ORMType
}
```

**設計要點：**
- ✅ 檢查環境變數有效性
- ✅ 提供有意義的預設值 ('memory')
- ✅ 輸出診斷信息
- ✅ 錯誤時優雅降級

### createRepository() 實現

```typescript
export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  // 驗證：需要 Database 但沒有提供
  if (['drizzle', 'atlas', 'prisma'].includes(orm) && !databaseAccess) {
    throw new Error(
      `❌ ORM 設為 "${orm}" 但未提供 DatabaseAccess。\n` +
      `請傳遞 databaseAccess 參數或改用 ORM=memory`
    )
  }

  // User Repository 分發
  if (type === 'user') {
    switch (orm) {
      case 'memory':
        return new UserRepository()

      case 'drizzle':
        return new DrizzleUserRepository(databaseAccess!)

      case 'atlas':
      case 'prisma':
        throw new Error(`❌ ORM "${orm}" 尚未實現`)

      default:
        return new UserRepository()
    }
  }

  // Post Repository 分發
  if (type === 'post') {
    switch (orm) {
      case 'memory':
        return new PostRepository()

      case 'drizzle':
        return new DrizzlePostRepository(databaseAccess!)

      case 'atlas':
      case 'prisma':
        throw new Error(`❌ ORM "${orm}" 尚未實現`)

      default:
        return new PostRepository()
    }
  }

  throw new Error(`❌ 不支援的 Repository 類型: "${type}"`)
}
```

**設計要點：**
- ✅ 使用 switch/case 清楚地列出支援的 ORM
- ✅ 驗證必要參數（如 databaseAccess）
- ✅ 對每個類型提供分發邏輯
- ✅ 錯誤消息明確指出解決方案

### getDatabaseAccess() 實現

```typescript
export function getDatabaseAccess(): IDatabaseAccess | undefined {
  const orm = getCurrentORM()

  if (orm === 'memory') {
    return undefined  // In-memory 不需要 Database
  }

  if (orm === 'drizzle') {
    const { createDrizzleDatabaseAccess } = require('@/adapters/Drizzle')
    return createDrizzleDatabaseAccess()  // Singleton
  }

  if (orm === 'atlas') {
    throw new Error('❌ Atlas 適配器尚未實現')
  }

  if (orm === 'prisma') {
    throw new Error('❌ Prisma 適配器尚未實現')
  }

  throw new Error(`❌ 不支援的 ORM: "${orm}"`)
}
```

**設計要點：**
- ✅ Memory ORM 返回 undefined（無需資料庫）
- ✅ 初始化對應的 DatabaseAccess（每個 ORM 一個）
- ✅ 清晰的錯誤信息
- ✅ 支援動態加載（require）

---

## ServiceProvider 使用 RepositoryFactory

### UserServiceProvider

```typescript
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 使用 RepositoryFactory 選擇 Repository
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('user', db)
    })

    // Handler 依賴於 Repository
    container.bind('createUserHandler', (c: IContainer) => {
      const repository = c.make('userRepository')
      return new CreateUserHandler(repository)
    })
  }

  override boot(_context: any): void {
    const orm = getCurrentORM()
    console.log(`👤 [User] Module loaded (ORM: ${orm})`)
  }
}
```

### PostServiceProvider

```typescript
export class PostServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 完全相同的模式，只改變 Repository 類型
    container.singleton('postRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('post', db)
    })
  }

  override boot(_context: any): void {
    const orm = getCurrentORM()
    console.log(`✨ [Post] Module loaded (ORM: ${orm})`)
  }
}
```

**模式的重用性：**

```typescript
// 每個 ServiceProvider 只需這 5 行
container.singleton('xRepository', () => {
  const orm = getCurrentORM()
  const db = orm !== 'memory' ? getDatabaseAccess() : undefined
  return createRepository('x', db)  // ← 只改這裡的類型
})
```

---

## 實際執行流程

### 場景 1：開發（ORM=memory）

```bash
$ ORM=memory bun run dev
```

**執行序列：**

```
1. 讀取環境：ORM=memory
2. bootstrap() 初始化 PlanetCore
3. UserServiceProvider.register()
   └─ getCurrentORM() → 'memory'
   └─ getDatabaseAccess() → undefined
   └─ createRepository('user', undefined) → new UserRepository()
4. PostServiceProvider.register()
   └─ createRepository('post', undefined) → new PostRepository()
5. registerUser(core)
   └─ core.container.make('userRepository') → UserRepository 實例
   └─ 組裝 UserController
   └─ 註冊路由
6. 應用啟動，所有資料存在記憶體
```

### 場景 2：生產（ORM=drizzle）

```bash
$ ORM=drizzle DATABASE_URL=file:./data.db bun run start
```

**執行序列：**

```
1. 讀取環境：ORM=drizzle, DATABASE_URL=file:./data.db
2. bootstrap() 初始化 PlanetCore
3. UserServiceProvider.register()
   └─ getCurrentORM() → 'drizzle'
   └─ getDatabaseAccess() → createDrizzleDatabaseAccess()
      └─ 初始化 Drizzle 連接
   └─ createRepository('user', drizzleDb) → new DrizzleUserRepository(drizzleDb)
4. PostServiceProvider.register()
   └─ createRepository('post', drizzleDb) → new DrizzlePostRepository(drizzleDb)
5. registerUser(core)
   └─ core.container.make('userRepository') → DrizzleUserRepository 實例
   └─ 組裝 UserController
   └─ 註冊路由
6. 應用啟動，所有資料持久化到 SQLite 資料庫
```

---

## 新增模組的步驟

假設要新增 Order 模組：

### 1. 定義 Domain

```typescript
// src/Modules/Order/Domain/Aggregates/Order.ts
export class Order {
  static create(id: string, userId: string, amount: number): Order {
    return new Order({...})
  }

  static fromDatabase(data: {...}): Order {
    return new Order({...})
  }
}

// src/Modules/Order/Domain/Repositories/IOrderRepository.ts
export interface IOrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
  // ...
}
```

### 2. In-Memory 實現

```typescript
// src/Modules/Order/Infrastructure/Repositories/OrderRepository.ts
export class OrderRepository implements IOrderRepository {
  private orders = new Map<string, Order>()

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order)
  }

  // ...
}
```

### 3. Drizzle 實現

```typescript
// src/adapters/Drizzle/Repositories/DrizzleOrderRepository.ts
export class DrizzleOrderRepository implements IOrderRepository {
  constructor(private db: IDatabaseAccess) {}

  async save(order: Order): Promise<void> {
    const row = this.toRow(order)
    // insert or update
  }

  // ...
}
```

### 4. ServiceProvider（使用 RepositoryFactory）

```typescript
// src/Modules/Order/Infrastructure/Providers/OrderServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createRepository, getDatabaseAccess, getCurrentORM } from '@/wiring/RepositoryFactory'

export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 完全相同的模式！只改 'order'
    container.singleton('orderRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('order', db)
    })
  }

  override boot(_context: any): void {
    const orm = getCurrentORM()
    console.log(`📦 [Order] Module loaded (ORM: ${orm})`)
  }
}
```

### 5. 更新 RepositoryFactory

```typescript
// src/wiring/RepositoryFactory.ts

export type RepositoryType = 'user' | 'post' | 'order'  // ← 加入 'order'

export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  if (type === 'order') {  // ← 加入分發邏輯
    switch (orm) {
      case 'memory':
        return new OrderRepository()
      case 'drizzle':
        return new DrizzleOrderRepository(databaseAccess!)
      // ...
    }
  }

  // 其他類型...
}
```

### 6. Wiring 層（可選）

```typescript
// src/wiring/index.ts

export const registerOrder = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const repository = core.container.make('orderRepository') as any
  const controller = new OrderController(repository)
  registerOrderRoutes(router, controller)
}
```

### 7. bootstrap 註冊

```typescript
// src/bootstrap.ts

core.register(createGravitoServiceProvider(new OrderServiceProvider()))
```

**完成！** 無需修改任何 ORM 配置。新增模組自動支持所有 ORM。

---

## 常見問題

### Q: 為什麼不在 Wiring 層創建 Repository？

**A:** 因為：
1. ServiceProvider 是框架無關的，Wiring 層綁定到 Gravito
2. ServiceProvider 在 bootstrap 時運行，更早掌握配置信息
3. 容器（IContainer）提供了依賴注入的標準方式
4. 分離關注點：ServiceProvider 負責業務層，Wiring 負責框架層

### Q: DatabaseAccess 是何時初始化的？

**A:** 在 ServiceProvider.register() 時：

```typescript
container.singleton('userRepository', () => {
  // 這個 lambda 在 bootstrap 時執行
  const db = orm !== 'memory' ? getDatabaseAccess() : undefined
  return createRepository('user', db)
})
```

只調用一次，結果被容器緩存（singleton）。

### Q: 能否為不同環境使用不同的 ORM？

**A:** 可以，使用 .env 檔案：

```bash
# .env.development
ORM=memory

# .env.production
ORM=drizzle
```

啟動時指定環境：

```bash
NODE_ENV=development bun run dev
NODE_ENV=production ORM=drizzle bun run start
```

---

## 驗證清單

- [ ] RepositoryFactory.ts 實現了 getCurrentORM()、createRepository()、getDatabaseAccess()
- [ ] UserServiceProvider 使用 RepositoryFactory
- [ ] PostServiceProvider 使用 RepositoryFactory
- [ ] wiring/index.ts 的 registerUser() 從容器取出 Repository
- [ ] wiring/index.ts 的 registerPost() 從容器取出 Repository（可選）
- [ ] 環境變數 ORM 可以控制 Repository 選擇
- [ ] ORM=memory 使用 in-memory 實現
- [ ] ORM=drizzle 使用 Drizzle 實現
- [ ] 新增模組時無需修改 ORM 配置

---

## 下一步

1. **完善 PostController 和路由** - 目前 Post 模組還沒有 Presentation 層
2. **新增 Atlas 適配器** - 在 RepositoryFactory 中實現 Atlas 支援
3. **新增 Prisma 適配器** - 完整的 3 ORM 支援
4. **性能優化** - 考慮連接池、查詢緩存等
5. **測試** - 為每個 ORM 添加集成測試
