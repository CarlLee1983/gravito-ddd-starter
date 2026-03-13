# ORM 完全透明設計 - Repository 即插即用

## 概述

實現了**真正的 ORM 無關性**：

```typescript
// ✅ 只有一個 UserRepository 類，依賴必填的 IDatabaseAccess
export class UserRepository implements IUserRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }
}
```

**關鍵洞察：** 內存/數據庫由上層決定：`orm=memory` 時上層注入 `MemoryDatabaseAccess`，Repository 底層僅依賴 Port，無 `if (db)` 分支。

---

## 架構對比

### ❌ 舊設計（多個 Repository 類）

```
Wiring 層 (bootstrap)
    ↓
選擇 ORM → DrizzleUserRepository、DrizzlePostRepository
    ↓
模組無感知 ORM，但代碼重複
```

**問題：**
- 需要為每個 ORM 創建不同的 Repository 類
- 代碼重複：DrizzleUserRepository 和 UserRepository 邏輯 80% 相同
- 新增 ORM 時要改所有 Repository 類
- Repository 代碼分散在多個文件

### ✅ 新設計（單個 Repository + IDatabaseAccess）

```
Wiring 層 (bootstrap)
    ↓
DatabaseAccessBuilder 決定 IDatabaseAccess
    → orm=memory：MemoryDatabaseAccess
    → orm=drizzle/atlas：對應適配器
    ↓
注入到 Repository（必填，無分支）
    ↓
完全透明，零重複
```

**優勢：**
- 只有一個 UserRepository 類，無底層 `if (db)` 分支
- 內存預設由上層處理（MemoryDatabaseAccess），Repository 不感知
- 新增 ORM 時只改 DatabaseAccessBuilder，不改 Repository
- 代碼清晰，責任明確

---

## 核心設計

### 1. Repository（依賴 Port，無分支）

```typescript
/**
 * UserRepository - 僅依賴 IDatabaseAccess
 *
 * 設計：
 * - db 必填（由上層注入；無 DB 時上層注入 MemoryDatabaseAccess）
 * - 底層無 if (db) 分支，完全透過 Port 抽象
 */
export class UserRepository implements IUserRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }

  // 其他方法同樣只使用 this.db.table('users')...
}
```

**好處：**
- 一份代碼支援所有 ORM 與內存
- 無分支，易於維護與測試
- 內存/數據庫由上層決定，底層單一責任

### 2. DatabaseAccessBuilder（上層預設）

```typescript
/**
 * DatabaseAccessBuilder - 決定注入什麼 IDatabaseAccess（必為非 undefined）
 */
export class DatabaseAccessBuilder {
  private orm: ORMType
  private dbInstance: IDatabaseAccess

  constructor(orm: ORMType) {
    this.orm = orm
    this.dbInstance =
      orm === 'memory'
        ? new MemoryDatabaseAccess()
        : getDatabaseAccess()
  }

  getDatabaseAccess(): IDatabaseAccess {
    return this.dbInstance
  }
}
```

**職責：**
- Memory 模式 → 返回 `MemoryDatabaseAccess`（上層預設，Repository 無需分支）
- Drizzle/Prisma/Atlas → 初始化並返回對應適配器
- **永遠返回 IDatabaseAccess**，Repository 建構子必填

### 3. registerUserRepositories（簡化）

```typescript
/**
 * 現在（DatabaseAccessBuilder）：
 * - 接收 IDatabaseAccess（必填，由 getDatabaseAccess() 提供）
 * - 創建 UserRepository 實例
 */
export function registerUserRepositories(db: IDatabaseAccess): void {
  const registry = getRegistry()
  const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
    return new UserRepository(db)
  }
  registry.register('user', factory)
  console.log('✅ [User] Repository 工廠已註冊')
}
```

### 4. bootstrap.ts（最簡潔）

```typescript
// Step 3: Register all Repository factories
const orm = getCurrentORM()
const dbBuilder = new DatabaseAccessBuilder(orm)
const db = dbBuilder.getDatabaseAccess()

// 注入 IDatabaseAccess，Repository 內部自動決定使用哪種模式
registerUserRepositories(db)
registerPostRepositories(db)
```

**代碼對比：**
- FactoryMapBuilder 版本：8 行
- DatabaseAccessBuilder 版本：4 行
- 代碼減少 50%！

---

## 實際運作流程

### 開發環境（ORM=memory）

```typescript
const orm = getCurrentORM()           // 'memory'
const dbBuilder = new DatabaseAccessBuilder(orm)
const db = dbBuilder.getDatabaseAccess()  // MemoryDatabaseAccess 實例

registerUserRepositories(db)
// ↓
const repo = new UserRepository(db)   // db 為 MemoryDatabaseAccess
// ↓
repo.findById('123')  // this.db.table('users').where(...).first() → 內存表
```

### 生產環境（ORM=drizzle）

```typescript
const orm = getCurrentORM()           // 'drizzle'
const dbBuilder = new DatabaseAccessBuilder(orm)
const db = dbBuilder.getDatabaseAccess()  // DrizzleDatabaseAccess 實例

registerUserRepositories(db)
// ↓
const repo = new UserRepository(db)
// ↓
repo.findById('123')  // this.db.table('users').where(...).first() → 真實數據庫
```

---

## 新增模組的流程

### 步驟 1：建立 OrderRepository

```typescript
// src/Modules/Order/Infrastructure/Repositories/OrderRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class OrderRepository implements IOrderRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.db.table('orders').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }

  // 其他方法僅使用 this.db.table('orders')...
}
```

### 步驟 2：建立 registerOrderRepositories

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { OrderRepository } from '../Repositories/OrderRepository'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function registerOrderRepositories(db: IDatabaseAccess): void {
  const registry = getRegistry()
  const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
    return new OrderRepository(db)
  }
  registry.register('order', factory)
  console.log('✅ [Order] Repository 工廠已註冊')
}
```

### 步驟 3：在 bootstrap 中註冊

```typescript
// src/bootstrap.ts
const orm = getCurrentORM()
const dbBuilder = new DatabaseAccessBuilder(orm)
const db = dbBuilder.getDatabaseAccess()

registerUserRepositories(db)
registerPostRepositories(db)
registerOrderRepositories(db)  // ← 新增
```

**完成！** 新模組自動支援所有 ORM，無需額外配置。

---

## 新增 ORM 的流程

假設要加入 Prisma 支援：

### 步驟 1：在 RepositoryFactory.ts 中加入初始化

```typescript
// src/wiring/RepositoryFactory.ts
export function getDatabaseAccess() {
  const orm = getCurrentORM()

  if (orm === 'memory') {
    return undefined  // 實際由 DatabaseAccessBuilder 改為注入 MemoryDatabaseAccess
  }

  if (orm === 'drizzle') {
    return createDrizzleDatabaseAccess()
  }

  if (orm === 'prisma') {
    // ← 新增
    const { PrismaDatabaseAccess } = require('@/adapters/Prisma')
    return new PrismaDatabaseAccess()
  }

  // ...
}
```

### 步驟 2：建立 Prisma DatabaseAccess 適配器

```typescript
// src/adapters/Prisma/PrismaDatabaseAccess.ts
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'

export class PrismaDatabaseAccess implements IDatabaseAccess {
  private prismaClient: PrismaClient

  constructor() {
    this.prismaClient = new PrismaClient()
  }

  table(name: string): IQueryBuilder {
    return new PrismaQueryBuilder(this.prismaClient, name)
  }
}
```

### 完成！

**無需改動任何 Repository 或註冊函數！** 所有模組自動支援 Prisma。

---

## 設計原則對比

| 原則 | FactoryMapBuilder | DatabaseAccessBuilder |
|------|------------------|----------------------|
| **代碼重複** | 80%（多個 Xxx Repository） | 0%（單個 Repository） |
| **新增 ORM** | 改所有 Repository + FactoryMapBuilder | 只改 RepositoryFactory |
| **Repository 行數** | 40-50 行 | 80-100 行（但包含所有邏輯） |
| **新增模組** | 為每個 ORM 實現不同的類 | 一個 Repository + 一個註冊函數 |
| **模組對 ORM 感知** | 是 | 否（完全透明） |
| **代碼清晰度** | 低（分散邏輯） | 高（集中邏輯） |

---

## 核心優勢

### 1. 零重複

```
FactoryMapBuilder：
  UserRepository（內存）          ← 40 行
  DrizzleUserRepository           ← 40 行（80% 重複）
  PrismaUserRepository            ← 40 行（80% 重複）
  + FactoryMapBuilder 邏輯        ← 100+ 行
  = 總計：160+ 行，重複率 80%

DatabaseAccessBuilder：
  UserRepository（雙模式）        ← 80 行（包含所有邏輯）
  + DatabaseAccessBuilder         ← 30 行
  = 總計：110 行，重複率 0%

節省 50 行代碼！
```

### 2. 完全透明

Repository 不知道使用了什麼 ORM 或是否為內存：

```typescript
// 相同的代碼，支援所有 ORM 與 MemoryDatabaseAccess
export class UserRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }
}
```

### 3. 易於擴展

新增模組 → 複製 Repository + 註冊函數，無需改 ORM 邏輯

```bash
# 新增 Order 模組
cp -r src/Modules/User src/Modules/Order
# 改幾個類名稱，完成！
```

### 4. 易於測試

```typescript
// 測試內存實現
const repo = new UserRepository(new MemoryDatabaseAccess())
await repo.findById('123')  // 使用內存表

// 測試 Database / Mock
const repo = new UserRepository(mockDatabaseAccess)
await repo.findById('123')  // 使用 mock
```

---

## 最佳實踐

### ✅ DO

```typescript
// 1. Repository 依賴必填 IDatabaseAccess，無底層分支
constructor(private readonly db: IDatabaseAccess) {}

// 2. 上層在無 DB 時注入 MemoryDatabaseAccess
const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()  // 必為非 undefined

// 3. 註冊函數接收 IDatabaseAccess（必填）
export function registerXxx(db: IDatabaseAccess) {
  registry.register('xxx', () => new XxxRepository(db))
}
```

### ❌ DON'T

```typescript
// 1. 不要在 Repository 底層做 if (this.db) 分支
if (this.db) { ... } else { this.memoryMap.get(...) }  // ❌ 上層應注入 MemoryDatabaseAccess

// 2. 不要為每個 ORM 創建不同的 Repository 類
export class DrizzleUserRepository { ... }  // ❌ 重複！

// 3. 不要在 Repository 中硬編碼 ORM
if (process.env.ORM === 'drizzle') { ... }  // ❌ 感知 ORM！

// 4. 不要讓 getDatabaseAccess() 在 memory 時返回 undefined 給 Repository 使用
//    應在上層改為返回 MemoryDatabaseAccess，Repository 一律接收 IDatabaseAccess
```

---

## 總結

| 特性 | 評分 |
|------|-----|
| **代碼重複** | ⭐⭐⭐⭐⭐ （0%） |
| **ORM 透明性** | ⭐⭐⭐⭐⭐ （完全）|
| **易於擴展** | ⭐⭐⭐⭐⭐ （非常易） |
| **可讀性** | ⭐⭐⭐⭐⭐ （清晰）|
| **性能** | ⭐⭐⭐⭐⭐ （無開銷） |

---

## 執行示意

```bash
# 開發環境
export ORM=memory
bun run dev
# → db = MemoryDatabaseAccess，UserRepository 使用內存表

# 測試環境
export ORM=drizzle
export DATABASE_URL=sqlite:///test.db
bun run test
# → UserRepository 使用 db.table('users')...

# 生產環境
export ORM=drizzle
export DATABASE_URL=postgres://...
bun run start
# → UserRepository 使用 db.table('users')...

# 所有代碼完全相同！
```

**這就是真正的 ORM 無關性！** 🎯✨
