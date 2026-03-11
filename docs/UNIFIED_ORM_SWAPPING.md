# 統一的 ORM 抽換機制

## 概述

在這個 DDD 架構中，**ORM 抽換只需要：**

1. **一個環境變數** (`ORM=memory|drizzle|atlas|prisma`)
2. **一個工廠函式** (`RepositoryFactory`)
3. **每個模組一個 ServiceProvider**（不因 ORM 而改變）

**完全不需要為每個模組分別修改配置或創建多個 ServiceProvider。**

---

## 架構設計圖

```
┌─────────────────────────────────────────────────────────────┐
│                        bootstrap()                          │
│                  初始化應用程序入口                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─► 讀取 ORM 環境變數
                   │
                   └─► ServiceProvider.register() 被呼叫
                       │
                       ├─► bootstrap: db = DatabaseAccessBuilder(orm).getDatabaseAccess()
                       │       ├─ orm=memory → MemoryDatabaseAccess
                       │       └─ orm=drizzle/atlas → 對應適配器
                       │
                       ├─► registerUserRepositories(db) / registerPostRepositories(db)
                       │   └─ 工廠：new UserRepository(db) / new PostRepository(db)
                       │
                       └─► UserServiceProvider / PostServiceProvider
                               └─ container.make('userRepository') → 工廠回傳 Repository
                       │
                       └─► Container 儲存已配置的 repositories

┌─────────────────────────────────────────────────────────────┐
│                    Wiring Layer                              │
│              registerUser(), registerPost()                  │
│         從 Container 取出 Repository + 組裝控制器            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   └─► 路由註冊完成
                       不涉及 ORM 選擇邏輯
```

---

## 四層合作模型

### 1️⃣ **Domain 層**（完全 ORM 無關）

```typescript
// src/Modules/User/Domain/Aggregates/User.ts
export class User {
  private constructor(private props: UserProps) {}

  static create(id: string, name: string, email: string): User {
    return new User({
      id,
      name,
      email,
      createdAt: new Date(),
    })
  }

  static fromDatabase(data: {...}): User {
    // 用於 Repository 重構
  }
}

// src/Modules/User/Domain/Repositories/IUserRepository.ts
export interface IUserRepository {
  save(user: User): Promise<void>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findAll(params?: {limit?: number; offset?: number}): Promise<User[]>
  count(): Promise<number>
  delete(id: string): Promise<void>
}
```

**特點：**
- ✅ 完全抽象化，不知道如何持久化
- ✅ 定義介面契約
- ✅ 被所有 Repository 實現遵守

---

### 2️⃣ **Infrastructure 層（多種實現）**

#### A. In-Memory 實現（開發/測試）

```typescript
// src/Modules/User/Infrastructure/Persistence/UserRepository.ts
export class UserRepository implements IUserRepository {
  private users = new Map<string, User>()

  async save(user: User): Promise<void> {
    this.users.set(user.id, user)
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  // ... 其他方法
}
```

**特點：**
- ✅ 無需資料庫
- ✅ 快速測試
- ✅ 預設/開發用

#### B. Drizzle 實現（生產環境）

```typescript
// src/adapters/Drizzle/Repositories/DrizzleUserRepository.ts
export class DrizzleUserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}

  async save(user: User): Promise<void> {
    const row = this.toRow(user)
    // 檢查存在，insert 或 update
    const existing = await this.db
      .table('users')
      .where('id', '=', user.id)
      .first()

    if (existing) {
      await this.db.table('users').where('id', '=', user.id).update(row)
    } else {
      await this.db.table('users').insert(row)
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }

  // ... 其他方法

  private toDomain(row: any): User {
    return User.fromDatabase({
      id: row.id,
      name: row.name,
      email: row.email,
      created_at: row.created_at,
    })
  }

  private toRow(user: User): Record<string, unknown> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
```

**特點：**
- ✅ 接收 ORM-agnostic `IDatabaseAccess`
- ✅ 實現資料庫持久化
- ✅ 使用 toDomain/toRow 進行轉換
- ✅ 完全實現 IUserRepository 介面

---

### 3️⃣ **Service Provider 層（統一、ORM 無關）**

```typescript
// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createRepository, getDatabaseAccess } from '@/wiring/RepositoryFactory'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'

export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 關鍵：使用 RepositoryFactory 自動選擇實現
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('user', db)
    })

    // Handler 依賴注入
    container.bind('createUserHandler', (c: IContainer) => {
      const repository = c.make('userRepository')
      return new CreateUserHandler(repository)
    })
  }

  override boot(_context: any): void {
    console.log('👤 [User] Module loaded')
  }
}
```

**特點：**
- ✅ 使用 RepositoryFactory
- ✅ **不需要為不同 ORM 創建多個 ServiceProvider**
- ✅ 自動處理 Repository 選擇
- ✅ 完全框架無關（不依賴 Gravito）

---

### 4️⃣ **Wiring 層（路由和控制器組裝）**

```typescript
// src/wiring/index.ts
export const registerUser = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)

  // 從容器取出已配置的服務（ORM 選擇已在 ServiceProvider 完成）
  const repository = core.container.make('userRepository') as any
  const createUserHandler = core.container.make('createUserHandler') as any

  // 組裝控制器（框架實現）
  const controller = new UserController(repository, createUserHandler)

  // 註冊路由（框架無關）
  registerUserRoutes(router, controller)
}
```

**特點：**
- ✅ **完全不涉及 ORM 選擇**
- ✅ 只負責將已配置的服務組裝成表現層
- ✅ 非常簡潔

---

## RepositoryFactory 工廠函式

### 核心 API

```typescript
// src/wiring/RepositoryFactory.ts

/**
 * 讀取環境變數決定 ORM
 */
export function getCurrentORM(): ORMType

/**
 * 建立指定類型的 Repository（自動根據 ORM 選擇）
 */
export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any

/**
 * 取得 Database 單例（若使用 DB）
 */
export function getDatabaseAccess(): IDatabaseAccess | undefined
```

### 使用流程

```
環境變數 ORM=?
    ↓
DatabaseAccessBuilder(orm).getDatabaseAccess()  → 必為 IDatabaseAccess
    ├─ orm=memory → MemoryDatabaseAccess
    ├─ orm=drizzle → DrizzleDatabaseAccess
    └─ orm=atlas/prisma → 對應適配器
    ↓
registerUserRepositories(db) / registerPostRepositories(db)
    ↓
工廠回傳 new UserRepository(db) / new PostRepository(db)
（Repository 一律接收 IDatabaseAccess，無底層分支）
```

---

## 實際使用範例

### 場景 1：開發（In-Memory）

```bash
# 使用預設 ORM=memory
bun run dev

# 或明確指定
ORM=memory bun run dev

# 輸出：
# 📦 已選擇 ORM: memory
# 👤 [User] Module loaded
# ✨ [Post] Module loaded
```

**流程：**
1. getCurrentORM() 返回 'memory'
2. db = DatabaseAccessBuilder('memory').getDatabaseAccess() → MemoryDatabaseAccess
3. 工廠回傳 new UserRepository(db)，資料存在內存表
4. 無需真實資料庫

---

### 場景 2：生產（Drizzle）

```bash
# 切換到 Drizzle
ORM=drizzle bun run start

# 輸出：
# 📦 已選擇 ORM: drizzle
# 👤 [User] Module loaded
# ✨ [Post] Module loaded
```

**流程：**
1. getCurrentORM() 返回 'drizzle'
2. db = DatabaseAccessBuilder('drizzle').getDatabaseAccess() → DrizzleDatabaseAccess
3. 工廠回傳 new UserRepository(db)
4. 資料持久化到資料庫

---

### 場景 3：新增模組（自動支援）

假設要新增 Order 模組：

```typescript
// 1. 建立 Domain（不變）
export interface IOrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
  // ...
}

// 2. In-Memory 實現（不變）
export class OrderRepository implements IOrderRepository {
  // ...
}

// 3. Drizzle 實現（不變）
export class DrizzleOrderRepository implements IOrderRepository {
  constructor(private db: IDatabaseAccess) {}
  // ...
}

// 4. ServiceProvider（使用 RepositoryFactory）
export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('orderRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('order', db)  // 相同的工廠函式！
    })
  }
}

// 5. 完成！無需修改任何 ORM 配置
// ORM=memory 自動使用 OrderRepository
// ORM=drizzle 自動使用 DrizzleOrderRepository
```

---

## 對比：舊 vs 新設計

### ❌ 舊設計（未實現）

```
User 模組
├─ UserServiceProvider-Memory
├─ UserServiceProvider-Drizzle  ← 重複
├─ UserServiceProvider-Atlas    ← 重複
└─ UserServiceProvider-Prisma   ← 重複

Post 模組
├─ PostServiceProvider-Memory
├─ PostServiceProvider-Drizzle  ← 重複
├─ PostServiceProvider-Atlas    ← 重複
└─ PostServiceProvider-Prisma   ← 重複

Order 模組
├─ OrderServiceProvider-Memory
├─ OrderServiceProvider-Drizzle ← 重複
├─ OrderServiceProvider-Atlas   ← 重複
└─ OrderServiceProvider-Prisma  ← 重複

問題：
- 💥 每個模組 × 每個 ORM = 大量重複代碼
- 💥 新增模組時必須為每個 ORM 建立 ServiceProvider
- 💥 修改 ORM 需要更新許多文件
```

### ✅ 新設計（已實現）

```
User 模組
├─ UserRepository (in-memory)
├─ DrizzleUserRepository (db-backed)
└─ UserServiceProvider ← 統一使用 RepositoryFactory

Post 模組
├─ PostRepository (in-memory)
├─ DrizzlePostRepository (db-backed)
└─ PostServiceProvider ← 統一使用 RepositoryFactory

Order 模組
├─ OrderRepository (in-memory)
├─ DrizzleOrderRepository (db-backed)
└─ OrderServiceProvider ← 統一使用 RepositoryFactory

RepositoryFactory ← 統一的 ORM 選擇點

優勢：
- ✅ 每個模組只有一個 ServiceProvider
- ✅ 新增模組只需實現 2 個 Repository（in-memory + drizzle）
- ✅ 改變 ORM 只需改一個環境變數
- ✅ RepositoryFactory 重用於所有模組
- ✅ 不存在重複代碼
```

---

## 環境配置

### 支援的環境變數

```bash
# 開發/測試（預設）
ORM=memory
# 或不設定（自動預設為 memory）

# 生產環境
ORM=drizzle

# 未來計劃
ORM=atlas
ORM=prisma
```

### .env 示例

```bash
# .env.development
ORM=memory

# .env.production
ORM=drizzle
DATABASE_URL=file:./data.db

# .env.staging
ORM=drizzle
DATABASE_URL=postgresql://user:pass@db:5432/app
```

### 執行範例

```bash
# 開發環境
ORM=memory bun run dev

# 生產環境
ORM=drizzle DATABASE_URL=file:./data.db bun run start

# 測試環境
ORM=memory bun test

# 測試 Drizzle 適配器（需要資料庫）
ORM=drizzle DATABASE_URL=sqlite::memory: bun test
```

---

## 擴展性：新增 ORM 支援

假設要新增 Prisma 支援，只需：

### 1. 實現 Prisma Repository

```typescript
// src/adapters/Prisma/Repositories/PrismaUserRepository.ts
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: this.toRow(user),
      update: this.toRow(user),
    })
  }

  // ... 其他方法
}
```

### 2. 更新 RepositoryFactory

```typescript
// src/wiring/RepositoryFactory.ts
export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  if (type === 'user') {
    switch (orm) {
      // ... 其他
      case 'prisma':
        return new PrismaUserRepository(databaseAccess!)
    }
  }

  // ... 其他類型
}

// 實際由 DatabaseAccessBuilder 統一提供；memory 時為 MemoryDatabaseAccess
export function getDatabaseAccess(): IDatabaseAccess | undefined {
  // ... 其他
  if (orm === 'prisma') {
    const { createPrismaDatabaseAccess } = require('@/adapters/Prisma')
    return createPrismaDatabaseAccess()
  }
}
```

### 3. 完成！

```bash
# 自動支援
ORM=prisma bun run start
```

**無需修改：**
- ❌ 任何 ServiceProvider
- ❌ 任何模組程式碼
- ❌ 任何 Domain 層

---

## 驗證清單

- [ ] RepositoryFactory.ts 已建立
- [ ] Wiring/index.ts 已更新，展示統一模式
- [ ] UserServiceProvider 使用 RepositoryFactory
- [ ] PostServiceProvider 使用 RepositoryFactory
- [ ] 環境變數 ORM 可以切換 Repository 實現
- [ ] ORM=memory 使用 in-memory Repository
- [ ] ORM=drizzle 使用 DrizzleRepository
- [ ] 各模組 ServiceProvider **不重複**（只有一個）
- [ ] Wiring 層不涉及 ORM 選擇邏輯
- [ ] 新增模組時無需修改 ORM 配置

---

## 總結

| 層次 | 責任 | 變化性 |
|------|------|--------|
| **Domain** | 定義介面 | ❌ 不變 |
| **Infrastructure** | 實現 Repository（多個） | ✅ 每個 ORM 一個 |
| **ServiceProvider** | 選擇並註冊 Repository | ❌ 統一（使用 Factory） |
| **Wiring** | 組裝控制器和路由 | ❌ 不涉及 ORM |
| **Environment** | 選擇 ORM | ✅ 環境變數決定 |

**關鍵洞察：**

> ORM 抽換的複雜性集中在 **RepositoryFactory** 這個單一點。
> 所有模組和 ServiceProvider 都不需要知道 ORM 選擇邏輯。
> 整個應用只需要一個環境變數即可切換完整的持久化策略。
