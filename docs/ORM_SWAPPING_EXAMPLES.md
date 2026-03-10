# ORM 抽換實戰範例

## 快速開始

### 範例 1：從 Memory 切換到 Drizzle（零代碼改動）

**步驟 1：只改環境變數**

```bash
# 開發環境（in-memory）
ORM=memory bun run dev

# 切換到生產（Drizzle）
ORM=drizzle DATABASE_URL=file:./data.db bun run start
```

**就這樣！** 應用自動使用 Drizzle 所有的 Repository。

---

## 詳細流程對比

### 開發環境（ORM=memory）

```
┌─────────────────────────────────────────────┐
│ bootstrap(port=3000)                        │
│ 讀取環境：ORM=memory                        │
└──────────┬──────────────────────────────────┘
           │
           ├─► UserServiceProvider.register()
           │   │
           │   ├─ getCurrentORM() → 'memory'
           │   ├─ getDatabaseAccess() → undefined
           │   └─ createRepository('user', undefined)
           │      └─► new UserRepository()  ◄─── 記憶體存儲
           │
           ├─► PostServiceProvider.register()
           │   └─ createRepository('post', undefined)
           │      └─► new PostRepository()  ◄─── 記憶體存儲
           │
           └─► 應用啟動，所有資料在記憶體中
```

**結果：**
```
# 輸出
📦 已選擇 ORM: memory
👤 [User] Module loaded (ORM: memory)
✨ [Post] Module loaded (ORM: memory)

# 資料存儲位置：JavaScript Map 物件
```

---

### 生產環境（ORM=drizzle）

```
┌─────────────────────────────────────────────┐
│ bootstrap(port=3000)                        │
│ 讀取環境：ORM=drizzle                       │
│          DATABASE_URL=file:./data.db        │
└──────────┬──────────────────────────────────┘
           │
           ├─► UserServiceProvider.register()
           │   │
           │   ├─ getCurrentORM() → 'drizzle'
           │   ├─ getDatabaseAccess() → createDrizzleDatabaseAccess()
           │   │  └─ 初始化 Drizzle 連接
           │   └─ createRepository('user', drizzleDb)
           │      └─► new DrizzleUserRepository(drizzleDb)  ◄─── DB 存儲
           │
           ├─► PostServiceProvider.register()
           │   └─ createRepository('post', drizzleDb)
           │      └─► new DrizzlePostRepository(drizzleDb)  ◄─── DB 存儲
           │
           └─► 應用啟動，所有資料在 SQLite 資料庫中
```

**結果：**
```
# 輸出
📦 已選擇 ORM: drizzle
👤 [User] Module loaded (ORM: drizzle)
✨ [Post] Module loaded (ORM: drizzle)

# 資料存儲位置：SQLite 資料庫檔案
```

---

## 代碼對比：三層參與

### ❌ 舊設計（假想）

```typescript
// src/Modules/User/Infrastructure/Providers/UserServiceProvider-Memory.ts
export class UserServiceProviderMemory extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => new UserRepository())
  }
}

// src/Modules/User/Infrastructure/Providers/UserServiceProvider-Drizzle.ts
export class UserServiceProviderDrizzle extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const db = getDatabaseAccess()
      return new DrizzleUserRepository(db)
    })
  }
}

// src/bootstrap.ts
if (process.env.ORM === 'memory') {
  core.register(createGravitoServiceProvider(new UserServiceProviderMemory()))
} else if (process.env.ORM === 'drizzle') {
  core.register(createGravitoServiceProvider(new UserServiceProviderDrizzle()))
}

// 每個模組都要重複這個邏輯！
// Post、Order、Product 模組都需要：
// PostServiceProviderMemory + PostServiceProviderDrizzle + ...
```

**問題：**
- 💥 為每個模組建立 2 個 ServiceProvider
- 💥 為每個 ORM 重複上面的代碼
- 💥 代碼重複率 > 80%
- 💥 難以維護和擴展

---

### ✅ 新設計（已實現）

```typescript
// src/wiring/RepositoryFactory.ts
export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  if (type === 'user') {
    switch (orm) {
      case 'memory':
        return new UserRepository()
      case 'drizzle':
        return new DrizzleUserRepository(databaseAccess!)
      // ... 未來的 ORM
    }
  }

  if (type === 'post') {
    switch (orm) {
      case 'memory':
        return new PostRepository()
      case 'drizzle':
        return new DrizzlePostRepository(databaseAccess!)
      // ... 未來的 ORM
    }
  }
}

// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 統一的模式，適用所有 ORM
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('user', db)
    })
  }
}

// src/Modules/Post/Infrastructure/Providers/PostServiceProvider.ts
export class PostServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 完全相同的模式！只改 'post'
    container.singleton('postRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('post', db)  // ← 只有這裡不同
    })
  }
}

// src/bootstrap.ts
core.register(createGravitoServiceProvider(new UserServiceProvider()))
core.register(createGravitoServiceProvider(new PostServiceProvider()))
// 無需條件判斷，自動適配所有 ORM！
```

**優勢：**
- ✅ 每個模組只有一個 ServiceProvider
- ✅ ServiceProvider 代碼是通用的
- ✅ ORM 選擇邏輯集中在 RepositoryFactory
- ✅ 新增模組時代碼重用率 100%

---

## 實戰演練：新增 Order 模組

### 場景：系統要新增訂單模組，需要支持 memory 和 drizzle 兩個 ORM

**傳統做法（舊設計）：**
1. 建立 OrderRepository (in-memory)
2. 建立 OrderRepositoryDrizzle
3. 建立 OrderServiceProvider-Memory
4. 建立 OrderServiceProvider-Drizzle
5. 修改 bootstrap.ts 的條件判斷
6. 😱 6 個檔案

**新設計做法（現在）：**

#### Step 1：定義 Domain（不涉及 ORM）

```typescript
// src/Modules/Order/Domain/Repositories/IOrderRepository.ts
export interface IOrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
  delete(id: string): Promise<void>
}
```

#### Step 2：實現 in-memory Repository

```typescript
// src/Modules/Order/Infrastructure/Repositories/OrderRepository.ts
export class OrderRepository implements IOrderRepository {
  private orders = new Map<string, Order>()

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order)
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id)
  }
}
```

#### Step 3：實現 Drizzle Repository

```typescript
// src/adapters/Drizzle/Repositories/DrizzleOrderRepository.ts
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

  async delete(id: string): Promise<void> {
    await this.db.table('orders').where('id', '=', id).delete()
  }

  private toDomain(row: any): Order {
    return Order.fromDatabase({...})
  }

  private toRow(order: Order): Record<string, unknown> {
    return {...}
  }
}
```

#### Step 4：建立 ServiceProvider（複製貼上 User 的模式）

```typescript
// src/Modules/Order/Infrastructure/Providers/OrderServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createRepository, getDatabaseAccess, getCurrentORM } from '@/wiring/RepositoryFactory'

export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 複製 User 模組的模式，只改 'order'
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

#### Step 5：在 RepositoryFactory 中新增分發邏輯

```typescript
// src/wiring/RepositoryFactory.ts

export type RepositoryType = 'user' | 'post' | 'order'  // ← 加入

export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  // ... user, post 的邏輯保持不變 ...

  if (type === 'order') {  // ← 新增
    switch (orm) {
      case 'memory':
        return new OrderRepository()
      case 'drizzle':
        return new DrizzleOrderRepository(databaseAccess!)
      // ...
    }
  }

  // ...
}
```

#### Step 6：在 bootstrap 註冊

```typescript
// src/bootstrap.ts
core.register(createGravitoServiceProvider(new OrderServiceProvider()))
```

#### Step 7：完成！

```bash
# 自動支持 memory
ORM=memory bun run dev

# 自動支持 drizzle
ORM=drizzle bun run start
```

**整個過程：**
- ✅ 7 個檔案（2 個 Repository + 1 個 ServiceProvider + RepositoryFactory 修改 + bootstrap 修改 + migration + seeder）
- ✅ 代碼無重複
- ✅ 無需為每個 ORM 建立額外檔案
- ✅ 自動支持現有和未來的所有 ORM

---

## 驗證：測試流程

### 方式 1：Unit Test（in-memory，快）

```bash
# 使用 ORM=memory 測試
ORM=memory bun test
```

**執行流程：**
```
✅ UserRepository 被使用
✅ PostRepository 被使用
✅ OrderRepository 被使用
⚡ 無資料庫連接，速度快
```

### 方式 2：Integration Test（Drizzle，驗證 DB）

```bash
# 使用 ORM=drizzle 測試
ORM=drizzle DATABASE_URL=sqlite::memory: bun test
```

**執行流程：**
```
✅ DrizzleUserRepository 被使用
✅ DrizzlePostRepository 被使用
✅ DrizzleOrderRepository 被使用
✅ Drizzle 適配器正確運行
✅ SQL 查詢正確執行
```

### 方式 3：開發環境（互動測試）

```bash
ORM=memory bun run dev
# → 訪問 http://localhost:3000/api/users
# → 建立、查詢、更新、刪除用戶
# → 資料存在記憶體，快速反應
```

### 方式 4：生產環境（持久化驗證）

```bash
ORM=drizzle DATABASE_URL=file:./data.db bun run start
# → 訪問 http://localhost:3000/api/users
# → 建立用戶，應用重啟後資料仍存在
# → 驗證資料庫中有記錄
sqlite3 data.db "SELECT * FROM users;"
```

---

## 配置完整範例

### .env.development

```bash
ORM=memory
NODE_ENV=development
PORT=3000
```

### .env.production

```bash
ORM=drizzle
DATABASE_URL=postgresql://user:pass@db.production.com:5432/app
NODE_ENV=production
PORT=3000
```

### .env.staging

```bash
ORM=drizzle
DATABASE_URL=sqlite:./staging.db
NODE_ENV=staging
PORT=3000
```

### 啟動命令

```bash
# 開發
NODE_ENV=development ORM=memory bun run dev

# 測試
NODE_ENV=test ORM=memory bun test

# Staging
NODE_ENV=staging ORM=drizzle bun run start

# 生產
NODE_ENV=production ORM=drizzle bun run start
```

---

## 常見錯誤和修復

### ❌ 錯誤 1：在 ServiceProvider 中直接建立 Repository

```typescript
// 錯誤！
override register(container: IContainer): void {
  container.singleton('userRepository', () => {
    return new UserRepository()  // 只支援 memory
  })
}
```

**修復：**
```typescript
// 正確！
override register(container: IContainer): void {
  container.singleton('userRepository', () => {
    const orm = getCurrentORM()
    const db = orm !== 'memory' ? getDatabaseAccess() : undefined
    return createRepository('user', db)  // 支援所有 ORM
  })
}
```

### ❌ 錯誤 2：在 Wiring 層選擇 ORM

```typescript
// 錯誤！
const registerUser = (core: PlanetCore): void => {
  const orm = getCurrentORM()
  const repository = orm === 'memory'
    ? new UserRepository()
    : new DrizzleUserRepository(db)
  // ...
}
```

**修復：**
```typescript
// 正確！
const registerUser = (core: PlanetCore): void => {
  // ORM 選擇由 ServiceProvider 負責
  const repository = core.container.make('userRepository')
  // Wiring 層只負責組裝
}
```

### ❌ 錯誤 3：新增 ORM 但忘記更新 RepositoryFactory

```typescript
// 新增 Atlas 支援，但沒更新 Factory
export class AtlasUserRepository implements IUserRepository {
  // ...
}

// ❌ Factory 仍然不支援 'atlas'
// → 執行時拋出錯誤
```

**修復：**
```typescript
// 更新 RepositoryFactory
export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  if (type === 'user') {
    switch (orm) {
      case 'atlas':  // ← 新增
        return new AtlasUserRepository(databaseAccess!)
      // ...
    }
  }
}
```

---

## 性能考量

### In-Memory（ORM=memory）

```typescript
// 速度：極快 ⚡
// 時間複雜度：O(1) 插入、O(1) 查詢（Map）
// 記憶體：用戶數量 × 物件大小
```

**何時使用：**
- 開發環境
- 單元測試
- 低流量場景
- 原型設計

### Drizzle（ORM=drizzle）

```typescript
// 速度：中等 🚀
// 時間複雜度：O(n) 查詢（需要掃描表）
// 記憶體：SQLite 數據庫（磁盤存儲）
```

**何時使用：**
- 生產環境
- 需要持久化
- 多實例部署
- 數據量大

---

## 總結

| 方面 | 舊設計 | 新設計 |
|------|--------|--------|
| ServiceProvider 數量 | 模組 × ORM | 模組 |
| 代碼重複率 | ~80% | ~0% |
| 新增 ORM 的工作 | 修改所有 ServiceProvider | 更新 RepositoryFactory |
| 切換 ORM 的方式 | 改 bootstrap.ts | 改環境變數 |
| 支援的 ORM 數 | 限制 | 無限制 |
| 可維護性 | 差 | 優 |

**最重要的設計洞察：**
> ORM 的複雜性應該集中在一個地方（RepositoryFactory），
> 而不是分散到每個 ServiceProvider。
