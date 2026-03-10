# 新增模組檢查清單 - RepositoryRegistry 模式

## 快速參考

當你要新增 Order 模組時，按照這個流程：

### 步驟 1：建立目錄結構

```bash
mkdir -p src/Modules/Order/Domain/Repositories
mkdir -p src/Modules/Order/Domain/Aggregates
mkdir -p src/Modules/Order/Infrastructure/Repositories
mkdir -p src/Modules/Order/Infrastructure/Providers
mkdir -p src/Modules/Order/Application/Commands
mkdir -p src/Modules/Order/Presentation/Controllers
mkdir -p src/Modules/Order/Presentation/Routes
```

### 步驟 2：複製範本檔案

```bash
# 複製 User 模組的結構作為基礎
cp -r src/Modules/User/* src/Modules/Order/
# 然後手動修改模組名稱
```

### 步驟 3：建立 Repository（核心部分）

#### 3.1 Domain - 定義介面

```typescript
// src/Modules/Order/Domain/Repositories/IOrderRepository.ts
export interface IOrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
  findAll(): Promise<Order[]>
  count(): Promise<number>
  delete(id: string): Promise<void>
}
```

#### 3.2 Infrastructure - In-Memory 實現

```typescript
// src/Modules/Order/Infrastructure/Repositories/OrderRepository.ts
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { Order } from '../../Domain/Aggregates/Order'

export class OrderRepository implements IOrderRepository {
  private orders = new Map<string, Order>()

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order)
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values())
  }

  async count(): Promise<number> {
    return this.orders.size
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id)
  }
}
```

#### 3.3 Adapters - Drizzle 實現

```typescript
// src/adapters/Drizzle/Repositories/DrizzleOrderRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrderRepository } from '@/Modules/Order/Domain/Repositories/IOrderRepository'
import { Order } from '@/Modules/Order/Domain/Aggregates/Order'

export class DrizzleOrderRepository implements IOrderRepository {
  constructor(private db: IDatabaseAccess) {}

  async save(order: Order): Promise<void> {
    const row = this.toRow(order)
    const existing = await this.db
      .table('orders')
      .where('id', '=', order.id)
      .first()

    if (existing) {
      await this.db.table('orders').where('id', '=', order.id).update(row)
    } else {
      await this.db.table('orders').insert(row)
    }
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.db.table('orders').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }

  async findAll(): Promise<Order[]> {
    const rows = await this.db.table('orders').select()
    return rows.map((row) => this.toDomain(row))
  }

  async count(): Promise<number> {
    return this.db.table('orders').count()
  }

  async delete(id: string): Promise<void> {
    await this.db.table('orders').where('id', '=', id).delete()
  }

  private toDomain(row: any): Order {
    return Order.fromDatabase({
      id: row.id,
      // ... 其他欄位
    })
  }

  private toRow(order: Order): Record<string, unknown> {
    return {
      id: order.id,
      // ... 其他欄位
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
```

### 步驟 4：建立 Repository 工廠註冊檔案（關鍵）

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { OrderRepository } from '../Repositories/OrderRepository'
import { DrizzleOrderRepository } from '@/adapters/Drizzle/Repositories/DrizzleOrderRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * Order Repository 工廠函數
 *
 * 根據 ORM 類型返回對應的 Repository 實現
 */
function createOrderRepository(
  orm: string,
  databaseAccess: IDatabaseAccess | undefined
): any {
  switch (orm) {
    case 'memory':
      return new OrderRepository()

    case 'drizzle':
      if (!databaseAccess) {
        throw new Error('❌ ORM=drizzle 需要 DatabaseAccess')
      }
      return new DrizzleOrderRepository(databaseAccess)

    case 'atlas':
      throw new Error('❌ Atlas ORM 尚未實現')

    case 'prisma':
      throw new Error('❌ Prisma ORM 尚未實現')

    default:
      throw new Error(`❌ 不支援的 ORM: "${orm}"`)
  }
}

/**
 * 註冊 Order Repository 工廠到全局 Registry
 *
 * 應在 bootstrap 時被呼叫
 */
export function registerOrderRepositories(): void {
  const registry = getRegistry()
  registry.register('order', createOrderRepository)
  console.log('✅ [Order] Repository 工廠已註冊')
}
```

### 步驟 5：建立 ServiceProvider

```typescript
// src/Modules/Order/Infrastructure/Providers/OrderServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'

export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 從 Registry 取得 Repository
    container.singleton('orderRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('order', orm, db)
    })

    // TODO: 如需 Application Service，在此註冊
    // container.bind('createOrderHandler', (c: IContainer) => {
    //   const repository = c.make('orderRepository')
    //   return new CreateOrderHandler(repository)
    // })
  }

  override boot(_context: any): void {
    const orm = getCurrentORM()
    console.log(`📦 [Order] Module loaded (ORM: ${orm})`)
  }
}
```

### 步驟 6：在 bootstrap 中註冊

```typescript
// src/bootstrap.ts
import { registerOrderRepositories } from './Modules/Order/Infrastructure/Providers/registerOrderRepositories'
import { OrderServiceProvider } from './Modules/Order/Infrastructure/Providers/OrderServiceProvider'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  // ...

  // Step 3: Register all Repository factories
  registerUserRepositories()
  registerPostRepositories()
  registerOrderRepositories()  // ← 新增這行

  // ...

  // Step 5: Register module service providers
  core.register(createGravitoServiceProvider(new HealthServiceProvider()))
  core.register(createGravitoServiceProvider(new UserServiceProvider()))
  core.register(createGravitoServiceProvider(new PostServiceProvider()))
  core.register(createGravitoServiceProvider(new OrderServiceProvider()))  // ← 新增這行

  // ...
}
```

### 步驟 7：建立 Controller 和路由（可選）

```typescript
// src/Modules/Order/Presentation/Controllers/OrderController.ts
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'

export class OrderController {
  constructor(private repository: IOrderRepository) {}

  async getOrders() {
    return this.repository.findAll()
  }

  async getOrder(id: string) {
    return this.repository.findById(id)
  }

  // ...
}

// src/Modules/Order/Presentation/Routes/api.ts
export function registerOrderRoutes(router: IModuleRouter, controller: OrderController): void {
  router.get('/orders', () => controller.getOrders())
  router.get('/orders/:id', (ctx) => controller.getOrder(ctx.params.id))
  // ...
}
```

---

## 檢查清單

### 建立模組時

- [ ] 建立目錄結構
- [ ] 定義 Domain（Aggregate、Repository 介面）
- [ ] 實現 In-Memory Repository
- [ ] 實現 Drizzle Repository（或其他 ORM）
- [ ] 建立 `registerXRepositories.ts`（工廠）
- [ ] 建立 `XServiceProvider.ts`（依賴注入）
- [ ] 在 bootstrap.ts 中呼叫 `registerXRepositories()`
- [ ] 在 bootstrap.ts 中註冊 `XServiceProvider`
- [ ] 建立 Controller（表現層，可選）
- [ ] 建立 Routes（表現層，可選）

### 新增 ORM 支援時

假設要加入 Atlas ORM 支援：

#### 1. 為每個模組實現 Repository

```typescript
// src/adapters/Atlas/Repositories/DrizzleOrderRepository.ts
export class AtlasOrderRepository implements IOrderRepository { }
```

#### 2. 更新註冊檔案

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
function createOrderRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new OrderRepository()
    case 'drizzle':
      return new DrizzleOrderRepository(db!)
    case 'atlas':  // ← 新增
      return new AtlasOrderRepository(db!)
    // ...
  }
}
```

#### 3. 在 RepositoryFactory 中新增 DatabaseAccess 適配器

```typescript
// src/wiring/RepositoryFactory.ts
export function getDatabaseAccess(): IDatabaseAccess | undefined {
  const orm = getCurrentORM()

  // ...

  if (orm === 'atlas') {  // ← 新增
    const { createAtlasDatabaseAccess } = require('@/adapters/Atlas')
    return createAtlasDatabaseAccess()
  }

  // ...
}
```

#### 4. 完成！

```bash
# 所有模組自動支援 Atlas
ORM=atlas bun run start
```

---

## 常見錯誤

### ❌ 錯誤 1：忘記在 bootstrap 中呼叫 registerXRepositories()

```typescript
// ❌ 錯誤
export async function bootstrap() {
  initializeRegistry()

  // 忘記呼叫 registerOrderRepositories()

  core.register(createGravitoServiceProvider(new OrderServiceProvider()))
}
```

**結果：** 執行時拋出 "Repository 'order' not registered"

**修復：**
```typescript
// ✅ 正確
export async function bootstrap() {
  initializeRegistry()

  registerOrderRepositories()  // ← 加上這行

  core.register(createGravitoServiceProvider(new OrderServiceProvider()))
}
```

### ❌ 錯誤 2：在工廠函數中忘記処理所有 ORM

```typescript
// ❌ 錯誤
function createOrderRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new OrderRepository()
    case 'drizzle':
      return new DrizzleOrderRepository(db!)
    // 忘記 atlas 和 prisma 的 case
  }
}
```

**結果：** 當使用未支援的 ORM 時拋出 undefined

**修復：**
```typescript
// ✅ 正確
function createOrderRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new OrderRepository()
    case 'drizzle':
      return new DrizzleOrderRepository(db!)
    case 'atlas':
      throw new Error('❌ Atlas ORM 尚未實現')  // ← 明確的錯誤信息
    case 'prisma':
      throw new Error('❌ Prisma ORM 尚未實現')
    default:
      throw new Error(`❌ 不支援的 ORM: "${orm}"`)
  }
}
```

### ❌ 錯誤 3：ServiceProvider 中直接 new Repository

```typescript
// ❌ 錯誤
export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('orderRepository', () => {
      return new OrderRepository()  // ← 只支援 memory，忽略了 Registry
    })
  }
}
```

**結果：** 環境變數 ORM=drizzle 被忽略

**修復：**
```typescript
// ✅ 正確
export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('orderRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('order', orm, db)  // ← 使用 Registry
    })
  }
}
```

---

## 檔案大小預期

完成一個模組的 Repository 工廠註冊應該在：

- `registerXRepositories.ts`: 30-50 行
- `XServiceProvider.ts`: 30-50 行
- Total: ~100 行（包括註解）

如果檔案變得太大（> 80 行），檢查是否有邏輯可以移到別處。

---

## 下次新增模組時

1. 複製 `src/Modules/Order` 為參考
2. 複製 `registerOrderRepositories.ts` 為範本
3. 修改模組名稱
4. 在 bootstrap 中加入兩行：
   - `registerXRepositories()`
   - `core.register(createGravitoServiceProvider(new XServiceProvider()))`

**完成！** 無需修改任何 ORM 邏輯。

---

## 最終驗證

```bash
# 測試 memory ORM
ORM=memory bun test

# 測試 drizzle ORM
ORM=drizzle bun test

# 開發環境
ORM=memory bun run dev

# 生產環境
ORM=drizzle bun run start
```

都應該正常運作，無需改代碼。✅
