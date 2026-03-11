# 可擴展的 ORM 架構 - RepositoryRegistry 模式

## 問題：單一工廠的擴展性瓶頸

當模組數量增加時，原始的 `RepositoryFactory.ts` 會變成：

```typescript
// ❌ 單一工廠變成巨型文件
export function createRepository(type: string, databaseAccess?: IDatabaseAccess): any {
  const orm = getCurrentORM()

  // User
  if (type === 'user') {
    switch (orm) {
      case 'memory': return new UserRepository()
      case 'drizzle': return new DrizzleUserRepository(databaseAccess!)
      // ...
    }
  }

  // Post
  if (type === 'post') {
    switch (orm) {
      case 'memory': return new PostRepository()
      case 'drizzle': return new DrizzlePostRepository(databaseAccess!)
      // ...
    }
  }

  // Order
  if (type === 'order') {
    switch (orm) {
      case 'memory': return new OrderRepository()
      case 'drizzle': return new DrizzleOrderRepository(databaseAccess!)
      // ...
    }
  }

  // Product
  if (type === 'product') {
    switch (orm) {
      case 'memory': return new ProductRepository()
      case 'drizzle': return new DrizzleProductRepository(databaseAccess!)
      // ...
    }
  }

  // ... 更多模組...
}

// 問題：
// - 💥 每個模組都要在這裡添加邏輯
// - 💥 新增模組時必須修改這個檔案
// - 💥 檔案會無限增長（不遵循開放封閉原則）
// - 💥 多個模組團隊會修改同一個檔案（衝突）
```

---

## 解決方案：分布式註冊模式

使用 **RepositoryRegistry** 讓每個模組自己註冊其工廠：

```
┌─────────────────────────────────────────────┐
│         bootstrap()                         │
│                                             │
│  Step 1: initializeRegistry()               │
│          └─ 建立全局 Registry               │
│                                             │
│  Step 2: registerUserRepositories()         │
│          └─ registry.register('user', f1)   │
│                                             │
│  Step 2b: registerPostRepositories()        │
│          └─ registry.register('post', f2)   │
│                                             │
│  Step 2c: registerOrderRepositories()       │
│          └─ registry.register('order', f3)  │
│                                             │
│  Step 3: Register ServiceProviders          │
│          ├─ UserServiceProvider             │
│          ├─ PostServiceProvider             │
│          └─ OrderServiceProvider            │
│                                             │
│  Registry.create('user', orm, db) ─→        │
│  factory('user', orm, db) ─→ Repository    │
└─────────────────────────────────────────────┘
```

---

## 架構層級

### 舊設計（單一工廠）

```
RepositoryFactory.ts (單點）
├─ if type === 'user'
├─ if type === 'post'
├─ if type === 'order'
├─ if type === 'product'
└─ ... 無限增長
```

### 新設計（分布式註冊）

```
bootstrap.ts（協調點）
├─ initializeRegistry()
├─ registerUserRepositories()      ← User 模組
├─ registerPostRepositories()       ← Post 模組
├─ registerOrderRepositories()      ← Order 模組
├─ registerProductRepositories()    ← Product 模組
└─ ... 線性增長

每個模組：
src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
├─ function createUserRepository(orm, db)
│  ├─ case 'memory': new UserRepository()
│  ├─ case 'drizzle': new DrizzleUserRepository(db)
│  └─ ...
└─ function registerUserRepositories()
   └─ registry.register('user', createUserRepository)
```

---

## 核心模式

### RepositoryRegistry（全局註冊表）

```typescript
// src/wiring/RepositoryRegistry.ts
export class RepositoryRegistry {
  private factories = new Map<string, RepositoryFactory>()

  register(type: string, factory: RepositoryFactory): void {
    this.factories.set(type, factory)
  }

  create(type: string, orm: string, db?: IDatabaseAccess): any {
    const factory = this.factories.get(type)
    if (!factory) throw new Error(`Repository "${type}" not registered`)
    return factory(orm, db)
  }
}
```

**特點：**
- ✅ 簡單的 Map 結構
- ✅ 支持動態註冊
- ✅ 清晰的錯誤信息

---

### 模組工廠（分布式）

每個模組在自己的檔案中定義其工廠：

```typescript
// src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
function createUserRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new UserRepository()
    case 'drizzle':
      return new DrizzleUserRepository(db!)
    // ...
  }
}

export function registerUserRepositories(): void {
  const registry = getRegistry()
  registry.register('user', createUserRepository)
}
```

**優勢：**
- ✅ 與模組在同一目錄
- ✅ 模組自決其實現
- ✅ 複製檔案即可新增模組

---

## ServiceProvider 簡化

### 舊方式（複雜）

```typescript
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('user', db)  // ← 需要知道 ORM 邏輯
    })
  }
}
```

### 新方式（簡潔）

```typescript
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('user', orm, db)  // ← 只是委托
    })
  }
}
```

**改進：**
- ✅ ServiceProvider 無需知道所有 ORM
- ✅ 所有模組的 ServiceProvider 代碼相同
- ✅ 易於理解和維護

---

## 新增模組的流程

### 步驟 1：定義 Domain 和實現

```typescript
// Domain
export interface IOrderRepository {
  save(order: Order): Promise<void>
  // ...
}

// Infrastructure
export class OrderRepository implements IOrderRepository { }
export class DrizzleOrderRepository implements IOrderRepository { }
```

### 步驟 2：建立註冊檔案（複製 User 的模式）

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
import { getRegistry } from '@/wiring/RepositoryRegistry'

function createOrderRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new OrderRepository()
    case 'drizzle':
      return new DrizzleOrderRepository(db!)
    // ...
  }
}

export function registerOrderRepositories(): void {
  const registry = getRegistry()
  registry.register('order', createOrderRepository)
  console.log('✅ [Order] Repository 工廠已註冊')
}
```

### 步驟 3：建立 ServiceProvider（複製 User 的模式）

```typescript
// src/Modules/Order/Infrastructure/Providers/OrderServiceProvider.ts
export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('orderRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('order', orm, db)
    })
  }
}
```

### 步驟 4：在 bootstrap 中註冊

```typescript
// src/bootstrap.ts
import { registerOrderRepositories } from './Modules/Order/Infrastructure/Providers/registerOrderRepositories'
import { OrderServiceProvider } from './Modules/Order/Infrastructure/Providers/OrderServiceProvider'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  initializeRegistry()

  registerUserRepositories()
  registerPostRepositories()
  registerOrderRepositories()  // ← 新增這行

  // ... 其他代碼

  core.register(createGravitoServiceProvider(new OrderServiceProvider()))  // ← 新增這行

  // ...
}
```

**完成！** 只需 4 個簡單的步驟，無需修改任何其他檔案。

---

## 對比：舊 vs 新

| 方面 | 舊設計 | 新設計 |
|------|--------|--------|
| **RepositoryFactory 大小** | 隨模組增加而增長 | 固定大小 |
| **新增模組時** | 修改 Factory 檔案 | 新增模組檔案 |
| **新增 ORM 時** | 修改 Factory 中所有模組 | 修改每個模組檔案（獨立） |
| **代碼重複** | 在 Factory 中 | 在註冊檔案中（易於複製） |
| **擴展性** | O(n) 複雜度 | O(1) 複雜度 |
| **單一責任** | Factory 做太多 | Registry 專注註冊 |

---

## 實際範例

### 場景 1：系統有 10 個模組

#### ❌ 舊設計（單一工廠）

```typescript
// RepositoryFactory.ts - 500+ 行
export function createRepository(type: string, orm: string, db?: IDatabaseAccess): any {
  switch (type) {
    case 'user':
      switch (orm) { ... }
    case 'post':
      switch (orm) { ... }
    case 'order':
      switch (orm) { ... }
    // ... 7 個模組
    case 'invoice':
      switch (orm) { ... }
  }
}
```

**問題：** 500+ 行的怪物檔案，每個模組都要修改

#### ✅ 新設計（分布式）

```typescript
// bootstrap.ts
registerUserRepositories()
registerPostRepositories()
registerOrderRepositories()
registerProductRepositories()
registerPaymentRepositories()
registerInvoiceRepositories()
registerShippingRepositories()
registerReviewRepositories()
registerNotificationRepositories()
registerAnalyticsRepositories()

// 每個檔案 30-50 行，專注於一個模組
// src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
// src/Modules/Post/Infrastructure/Providers/registerPostRepositories.ts
// ... 等等
```

**優勢：** 清晰的結構，易於維護

---

### 場景 2：支持 4 個 ORM（memory、drizzle、atlas、prisma）

#### ❌ 舊設計

```typescript
// RepositoryFactory.ts
export function createRepository(type: string, orm: string, db?: IDatabaseAccess): any {
  if (type === 'user') {
    switch (orm) {
      case 'memory': return new UserRepository()
      case 'drizzle': return new DrizzleUserRepository(db!)
      case 'atlas': return new AtlasUserRepository(db!)
      case 'prisma': return new PrismaUserRepository(db!)
    }
  }

  if (type === 'post') {
    switch (orm) {
      case 'memory': return new PostRepository()
      case 'drizzle': return new DrizzlePostRepository(db!)
      case 'atlas': return new AtlasPostRepository(db!)
      case 'prisma': return new PrismaPostRepository(db!)
    }
  }

  // ... 每個模組都要 4 個 case

  // 總計：2 個模組 × 4 ORM = 8 個 case
  // 10 個模組 × 4 ORM = 40 個 case
  // 複雜度：O(n × m)
}
```

#### ✅ 新設計

```typescript
// src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
function createUserRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory': return new UserRepository()
    case 'drizzle': return new DrizzleUserRepository(db!)
    case 'atlas': return new AtlasUserRepository(db!)
    case 'prisma': return new PrismaUserRepository(db!)
  }
}

// src/Modules/Post/Infrastructure/Providers/registerPostRepositories.ts
function createPostRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory': return new PostRepository()
    case 'drizzle': return new DrizzlePostRepository(db!)
    case 'atlas': return new AtlasPostRepository(db!)
    case 'prisma': return new PrismaPostRepository(db!)
  }
}

// 每個模組 30 行，獨立維護
// 複雜度：O(m)，與模組數無關
```

---

## 性能影響

### Registry 查詢性能

```typescript
// Map 查詢是 O(1) 操作
registry.create('user', 'drizzle', db)
// └─ this.factories.get('user')  // O(1)
//    └─ factory('drizzle', db)   // O(1)
```

**結論：** 完全沒有性能影響，甚至更快（避免長 switch）

---

## 單元測試

### Mock Registry

```typescript
import { RepositoryRegistry } from '@/wiring/RepositoryRegistry'

describe('OrderServiceProvider', () => {
  it('應該使用 Registry 建立 Repository', () => {
    // Mock Registry
    const mockRegistry = new RepositoryRegistry()
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    }

    mockRegistry.register('order', () => mockRepository)

    // ... 測試 ServiceProvider 是否正確使用 Registry
  })
})
```

---

## 最佳實踐

### ✅ 檔案位置約定

```
src/Modules/X/Infrastructure/Providers/
├─ X*ServiceProvider.ts              ← Service 依賴注入
├─ registerX*Repositories.ts         ← Repository 工廠註冊 ← 新增
└─ X*ServiceProvider.spec.ts         ← 測試
```

### ✅ 命名約定

```typescript
// 工廠函數：createXRepository
function createUserRepository(orm: string, db?: IDatabaseAccess): any { }

// 註冊函數：registerXRepositories
export function registerUserRepositories(): void { }

// 檔案名稱：registerX*Repositories.ts
// registerUserRepositories.ts
// registerPostRepositories.ts
```

### ✅ 順序很重要

```typescript
// bootstrap.ts 中的正確順序
export async function bootstrap(port = 3000): Promise<PlanetCore> {
  // 1️⃣ 初始化 Registry
  initializeRegistry()

  // 2️⃣ 註冊所有 Repository 工廠
  registerUserRepositories()
  registerPostRepositories()
  registerOrderRepositories()

  // 3️⃣ 初始化 Gravito
  const core = new PlanetCore(config)

  // 4️⃣ 註冊 ServiceProvider（會從 Registry 取得工廠）
  core.register(createGravitoServiceProvider(new UserServiceProvider()))
  core.register(createGravitoServiceProvider(new PostServiceProvider()))
  core.register(createGravitoServiceProvider(new OrderServiceProvider()))

  // ...
}
```

**為什麼？** ServiceProvider.register() 會呼叫 registry.create()，所以 Registry 必須先初始化。

---

## 總結

| 特性 | 舊設計 | 新設計 |
|------|--------|--------|
| **檔案数量** | 1 個巨型 Factory | N 個小檔案（每個模組一個） |
| **可擴展性** | 差（線性增長） | 優（常數時間） |
| **新增模組** | 修改 Factory | 新增註冊檔案 |
| **代碼重複** | 在 Factory 中 | 可接受（易於複製） |
| **團隊協作** | 一個檔案，多人修改衝突 | 多個檔案，各自維護 |
| **ORM 支持** | O(n × m) 複雜度 | O(n) 複雜度 |

**RepositoryRegistry 模式是大型 DDD 應用的最佳實踐！**
