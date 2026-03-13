# Wiring & Auto-Assembly Guide (接線與自動裝配指南)

> **核心願景**：實現「零手動接線」的模組化架構。新增功能只需符合目錄結構，系統啟動時將自動掃描並完成所有層級的裝配。

---

## 🏗️ 自動裝配架構 (Auto-Wiring)

專案使用 `ModuleAutoWirer` 掃描 `src/Modules/*/index.ts`。裝配流程分為三個關鍵步驟：

1.  **Infrastructure 裝配**：註冊模組的 Repository 工廠。
2.  **DI 裝配**：將模組的 `ServiceProvider` 註冊到全局依賴注入容器。
3.  **Presentation 裝配**：實例化控制器並將其路由掛載到 Web 框架。

### 核心組件

-   **`IModuleDefinition`**：每個模組必須導出的裝配契約。
-   **`ModuleAutoWirer`**：負責掃描、導入與執行裝配。
-   **`bootstrap.ts`**：啟動自動掃描的起點。

---

## 📋 模組裝配定義 (IModuleDefinition)

每個模組的入口點 (`src/Modules/{Name}/index.ts`) 必須導出一個符合介面的物件。

### 實作範例

```typescript
// src/Modules/User/index.ts
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'
import { registerUserRepositories } from './Infrastructure/Providers/registerUserRepositories'
import { registerUser } from '@wiring/index'

export const UserModule: IModuleDefinition = {
  name: 'User',                              // 模組名稱
  provider: UserServiceProvider,            // DI 服務提供者
  registerRepositories: registerUserRepositories, // (選填) 註冊 Repository 工廠
  registerRoutes: registerUser               // (選填) 註冊路由與裝配控制器
}
```

---

## 🛠️ 啟動流程 (Bootstrap)

在 `src/bootstrap.ts` 中，只需一行代碼即可啟動全系統裝配：

```typescript
// bootstrap.ts
const db = dbBuilder.getDatabaseAccess()
const core = new PlanetCore(config)

// ✨ 一鍵裝配所有模組
await ModuleAutoWirer.wire(core, db)
```

---

## 🚀 新增模組的流程

1.  **建立模組目錄**：遵循 `Domain`, `Application`, `Infrastructure`, `Presentation` 的分層結構。
2.  **定義入口點**：在 `index.ts` 中導出 `IModuleDefinition` 物件。
3.  **重啟系統**：模組將被自動識別並裝配，無需修改 `bootstrap.ts` 或 `src/routes.ts`。

### 檢查清單 (Wiring Checklist)
- [ ] `index.ts` 是否有命名為 `{Name}Module` 的導出物件？
- [ ] 該物件是否包含 `provider`？
- [ ] 若有資料庫，是否包含 `registerRepositories`？
- [ ] 路由裝配函式是否已正確導出並引用？

---

## 🔬 裝配診斷

當系統啟動時，控制台會顯示 `Module Auto-Wiring Report`：
- **Staged Modules**: 已掃描到的模組數量。
- **Active List**: 成功啟動並註冊的模組名稱清單。

若模組未出現，請檢查 `index.ts` 是否符合 `IModuleDefinition` 介面規範。
# Wiring 層快速參考

## 核心概念（1 分鐘理解）

```
環境變數 ORM=?
    ↓
ServiceProvider.register() 使用 RepositoryFactory
    ↓
createRepository('user'|'post'|..., db) 分發實現
    ↓
Wiring Layer: core.container.make() 取出已配置的服務
    ↓
組裝 Controller + 註冊路由
    ↓
應用啟動，ORM 完全切換
```

---

## 檔案位置速查

| 層次 | 位置 | 責任 |
|------|------|------|
| **Domain** | `src/Modules/X/Domain/Repositories/IX*Repository.ts` | 定義介面 |
| **Infrastructure** | `src/Modules/X/Infrastructure/Repositories/X*Repository.ts` | in-memory 實現 |
| **Infrastructure** | `src/adapters/Drizzle/Repositories/Drizzle*Repository.ts` | Drizzle 實現 |
| **ServiceProvider** | `src/Modules/X/Infrastructure/Providers/X*ServiceProvider.ts` | 使用 Factory 註冊 |
| **Factory** | `src/wiring/RepositoryFactory.ts` | ORM 選擇邏輯 |
| **Wiring** | `src/wiring/index.ts` | 組裝 Controller |

---

## ServiceProvider 範本（複製貼上）

```typescript
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createRepository, getDatabaseAccess, getCurrentORM } from '@wiring/RepositoryFactory'
import { CreateXHandler } from '../../Application/Commands/CreateX/CreateXHandler'

export class XServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 1. 註冊 Repository（使用 Factory）
    container.singleton('xRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('x', db)  // ← 只改這裡
    })

    // 2. 註冊 Handler（依賴 Repository）
    container.bind('createXHandler', (c: IContainer) => {
      const repository = c.make('xRepository')
      return new CreateXHandler(repository)
    })
  }

  override boot(_context: any): void {
    const orm = getCurrentORM()
    console.log(`📦 [X] Module loaded (ORM: ${orm})`)
  }
}
```

**只需改：**
- `x` → 你的模組名 (user, post, order)
- `'xRepository'` → `'xRepository'` (保持一致性)
- `X*ServiceProvider` → 你的類別名

---

## Wiring 層範本（複製貼上）

```typescript
export const registerX = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)

  // 從容器取出已配置的服務
  const repository = core.container.make('xRepository') as any
  const createXHandler = core.container.make('createXHandler') as any

  // 組裝控制器
  const controller = new XController(repository, createXHandler)

  // 註冊路由
  registerXRoutes(router, controller)
}
```

**只需改：**
- `x` → 模組名
- `XController` → 你的控制器
- `registerXRoutes` → 你的路由函式

---

## RepositoryFactory 更新（新增 ORM）

### 場景 1：新增 Repository 類型

```typescript
// src/wiring/RepositoryFactory.ts

export type RepositoryType = 'user' | 'post' | 'order'  // ← 加入新類型

export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  if (type === 'order') {  // ← 新增分發邏輯
    switch (orm) {
      case 'memory':
        return new OrderRepository()
      case 'drizzle':
        return new DrizzleOrderRepository(databaseAccess!)
      // ...
    }
  }

  // ... 其他類型保持不變
}
```

### 場景 2：新增 ORM 支援

```typescript
// src/wiring/RepositoryFactory.ts

export type ORMType = 'memory' | 'drizzle' | 'atlas' | 'prisma'

export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  if (type === 'user') {
    switch (orm) {
      // ... 現有的 ORM

      case 'atlas':  // ← 新增 ORM
        return new AtlasUserRepository(databaseAccess!)
      case 'prisma':  // ← 新增 ORM
        return new PrismaUserRepository(databaseAccess!)
    }
  }

  if (type === 'post') {
    switch (orm) {
      // ... 現有的 ORM

      case 'atlas':  // ← 新增 ORM
        return new AtlasPostRepository(databaseAccess!)
      case 'prisma':  // ← 新增 ORM
        return new PrismaPostRepository(databaseAccess!)
    }
  }

  // ... 其他類型自動支援新 ORM
}

// 實際由 DatabaseAccessBuilder 提供，必為 IDatabaseAccess（memory = MemoryDatabaseAccess）
export function getDatabaseAccess(): IDatabaseAccess | undefined {
  const orm = getCurrentORM()
  // ... 現有的
  if (orm === 'atlas') return createAtlasDatabaseAccess()
  if (orm === 'prisma') return createPrismaDatabaseAccess()
  // ...
}
```

---

## 環境變數設定

### 快速設定

```bash
# 開發（預設）
bun run dev
# 等同於：ORM=memory bun run dev

# 開發，明確指定
ORM=memory bun run dev

# 生產（Drizzle）
ORM=drizzle bun run start

# 測試
ORM=memory bun test

# 測試 Drizzle 適配器
ORM=drizzle DATABASE_URL=sqlite::memory: bun test
```

### 配置檔案

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

---

## 常用命令

### 啟動應用

```bash
# 開發
ORM=memory bun run dev

# 生產
ORM=drizzle DATABASE_URL=file:./data.db bun run start
```

### 執行測試

```bash
# 所有測試（in-memory）
ORM=memory bun test

# Drizzle 適配器測試
ORM=drizzle DATABASE_URL=sqlite::memory: bun test

# 特定檔案
ORM=memory bun test test/integration/repositories/DrizzleRepositories.test.ts
```

### 生成模組

```bash
# 新增 Order 模組（含 DB-backed Repository）
bun run make:module Order --db

# 新增 Product 模組（in-memory 為主）
bun run make:module Product

# 新增 Payment 模組（含 migration）
bun run make:module Payment --migration
```

---

## 故障排除

### ❌ 錯誤：`Cannot read property 'make' of undefined`

**原因：** ServiceProvider 未正確註冊

**修復：**
```typescript
// bootstrap.ts
core.register(createGravitoServiceProvider(new UserServiceProvider()))
```

### ❌ 錯誤：`Unsupported ORM: "xyz"`

**原因：** 環境變數設定錯誤

**修復：**
```bash
# 使用支援的 ORM
ORM=memory bun run dev
ORM=drizzle bun run start
```

### ❌ 錯誤：`DatabaseAccess required for ORM "drizzle" but not provided`

**原因：** 使用 Drizzle 但沒有提供 DATABASE_URL

**修復：**
```bash
ORM=drizzle DATABASE_URL=file:./data.db bun run start
```

### ❌ 錯誤：`Cannot find module 'UserRepository'`

**原因：** Repository 未在 ServiceProvider 註冊

**修復：**
```typescript
// UserServiceProvider
override register(container: IContainer): void {
  container.singleton('userRepository', () => {
    const orm = getCurrentORM()
    const db = orm !== 'memory' ? getDatabaseAccess() : undefined
    return createRepository('user', db)
  })
}
```

---

## 驗證清單

### 新增模組時

- [ ] Domain 層定義了 IXRepository 介面
- [ ] Infrastructure 層實現了 XRepository (in-memory)
- [ ] Drizzle 層實現了 DrizzleXRepository (db-backed)
- [ ] ServiceProvider 使用 createRepository('x', db)
- [ ] RepositoryFactory 加入了新的 case 'x'
- [ ] bootstrap.ts 註冊了 XServiceProvider
- [ ] Wiring 層添加了 registerX() 函式（可選）

### 新增 ORM 支援時

- [ ] 實現了 X*Repository（所有現有模組）
- [ ] 實現了 DatabaseAccess 適配器
- [ ] 更新 RepositoryFactory 的 ORM 型別
- [ ] 更新所有 createRepository() 的 switch 分支
- [ ] 更新 getDatabaseAccess() 的初始化邏輯
- [ ] 測試環境變數切換

---

## 關鍵點總結

| 概念 | 說明 |
|------|------|
| **getCurrentORM()** | 讀取 `ORM` 環境變數，預設 'memory' |
| **createRepository()** | 根據 ORM 分發 Repository 實現 |
| **getDatabaseAccess()** | 初始化 ORM 特定的 Database 適配器 |
| **RepositoryFactory** | 統一的 ORM 選擇邏輯集中地 |
| **ServiceProvider** | 使用 Factory，無需知道 ORM 細節 |
| **Wiring Layer** | 從容器取出服務，組裝表現層 |
| **環境驅動** | 單一環境變數決定全應用的 ORM |

---

## 相關文檔

- 📖 **UNIFIED_ORM_SWAPPING.md** - 完整架構設計
- 📖 **WIRING_GUIDE.md** - Wiring 層深度指南
- 📖 **ORM_SWAPPING_EXAMPLES.md** - 實戰範例
- 📖 **DATABASE.md** - 資料庫操作指南

---

## 最常用的 3 行代碼

### 在 ServiceProvider 中

```typescript
container.singleton('xRepository', () => {
  const orm = getCurrentORM()
  const db = orm !== 'memory' ? getDatabaseAccess() : undefined
  return createRepository('x', db)
})
```

### 在 Wiring 層中

```typescript
const repository = core.container.make('xRepository') as any
const createXHandler = core.container.make('createXHandler') as any
const controller = new XController(repository, createXHandler)
```

### 啟動應用

```bash
ORM=memory bun run dev    # 開發
ORM=drizzle bun run start # 生產
```

---

## 最後的提醒

> 🎯 核心原則：
> - Domain 層：完全 ORM 無關
> - Infrastructure 層：多種實現
> - ServiceProvider：統一模式（使用 Factory）
> - Wiring 層：只取出，不決定
> - Environment：驅動整個切換

**這就是整個 ORM 抽換機制的全部。**
# 零重複設計模式 - RepositoryFactoryGenerator

## 問題：高度重複的工廠代碼

你觀察得完全正確！看看這兩個檔案：

```typescript
// registerUserRepositories.ts
function createUserRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory': return new UserRepository()
    case 'drizzle': return new DrizzleUserRepository(db!)
    case 'atlas': throw new Error(...)
    case 'prisma': throw new Error(...)
    default: throw new Error(...)
  }
}

// registerPostRepositories.ts
function createPostRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory': return new PostRepository()
    case 'drizzle': return new DrizzlePostRepository(db!)
    case 'atlas': throw new Error(...)
    case 'prisma': throw new Error(...)
    default: throw new Error(...)
  }
}

// 這 80% 的代碼完全相同！
// 10 個模組 = 10 份重複代碼
```

**問題：**
- 💥 重複代碼（違反 DRY 原則）
- 💥 新增 ORM 時要改 10 個地方
- 💥 易出錯且難維護
- 💥 不符合設計模式最佳實踐

---

## 解決方案：工廠生成器

### RepositoryFactoryGenerator 優化

```typescript
/**
 * 生成通用的 Repository 工廠函數
 * 消除所有重複代碼
 */
export function createRepositoryFactory(factoryMap: RepositoryFactoryMap) {
  return (orm: string, db?: IDatabaseAccess): any => {
    const factory = factoryMap[orm as keyof RepositoryFactoryMap]

    if (!factory) {
      throw new Error(`❌ Repository 不支援 ORM "${orm}"`)
    }

    // 自動處理 memory（無需 db）vs 其他 ORM（需要 db）
    if (orm === 'memory') {
      return factory()
    } else {
      return factory(db!)
    }
  }
}
```

### 使用方式（超簡潔！）

```typescript
// registerUserRepositories.ts - 從 40+ 行減到 10 行！
import { createRepositoryFactory } from '@wiring/RepositoryFactoryGenerator'

export function registerUserRepositories(): void {
  const registry = getRegistry()

  // 只需定義 Repository 映射！工廠邏輯自動生成
  const factory = createRepositoryFactory({
    memory: () => new UserRepository(),
    drizzle: (db) => new DrizzleUserRepository(db!),
    // atlas: (db) => new AtlasUserRepository(db!),    // 未來
    // prisma: (db) => new PrismaUserRepository(db!),  // 未來
  })

  registry.register('user', factory)
}
```

---

## 對比：舊 vs 新

### ❌ 舊（重複）

```typescript
// registerUserRepositories.ts (40+ 行)
function createUserRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new UserRepository()

    case 'drizzle':
      if (!databaseAccess) {
        throw new Error('❌ ORM=drizzle 需要 DatabaseAccess...')
      }
      return new DrizzleUserRepository(databaseAccess)

    case 'atlas':
      throw new Error('❌ Atlas ORM 尚未實現')

    case 'prisma':
      throw new Error('❌ Prisma ORM 尚未實現')

    default:
      throw new Error(`❌ 不支援的 ORM: "${orm}"`)
  }
}

export function registerUserRepositories(): void {
  const registry = getRegistry()
  registry.register('user', createUserRepository)
  console.log('✅ [User] Repository 工廠已註冊')
}

// registerPostRepositories.ts (40+ 行)
function createPostRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory':
      return new PostRepository()

    case 'drizzle':
      if (!databaseAccess) {
        throw new Error('❌ ORM=drizzle 需要 DatabaseAccess...')
      }
      return new DrizzlePostRepository(databaseAccess)

    case 'atlas':
      throw new Error('❌ Atlas ORM 尚未實現')

    case 'prisma':
      throw new Error('❌ Prisma ORM 尚未實現')

    default:
      throw new Error(`❌ 不支援的 ORM: "${orm}"`)
  }
}

export function registerPostRepositories(): void {
  const registry = getRegistry()
  registry.register('post', createPostRepository)
  console.log('✅ [Post] Repository 工廠已註冊')
}

// 總計：80+ 行重複代碼！
```

### ✅ 新（零重複）

```typescript
// registerUserRepositories.ts (10 行)
import { createRepositoryFactory } from '@wiring/RepositoryFactoryGenerator'

export function registerUserRepositories(): void {
  const registry = getRegistry()
  const factory = createRepositoryFactory({
    memory: () => new UserRepository(),
    drizzle: (db) => new DrizzleUserRepository(db!),
  })
  registry.register('user', factory)
  console.log('✅ [User] Repository 工廠已註冊')
}

// registerPostRepositories.ts (10 行)
import { createRepositoryFactory } from '@wiring/RepositoryFactoryGenerator'

export function registerPostRepositories(): void {
  const registry = getRegistry()
  const factory = createRepositoryFactory({
    memory: () => new PostRepository(),
    drizzle: (db) => new DrizzlePostRepository(db!),
  })
  registry.register('post', factory)
  console.log('✅ [Post] Repository 工廠已註冊')
}

// 總計：20 行，0% 重複！
```

---

## 對比數據

| 指標 | 舊設計 | 新設計 |
|------|--------|--------|
| **代碼行數** | 80+ | 20 |
| **重複代碼** | 80% | 0% |
| **複雜度** | 高 | 低 |
| **易於複製** | 困難（要複製 40+ 行） | 簡單（10 行範本） |
| **新增 ORM** | 修改 10 個地方 | 修改 1 個地方（Generator） |
| **DRY 原則遵循** | ❌ | ✅ |

---

## 設計模式：工廠生成器

這是一個強大的設計模式組合：

1. **工廠模式** - 建立 Repository 實例
2. **生成器模式** - 自動生成工廠函數
3. **配置驅動** - 使用配置而非硬編碼邏輯

```typescript
// 工廠映射（配置）
{
  memory: () => new UserRepository(),
  drizzle: (db) => new DrizzleUserRepository(db!),
}

// ↓ 傳給生成器

createRepositoryFactory(factoryMap)

// ↓ 自動生成

(orm, db) => {
  const factory = factoryMap[orm]
  if (!factory) throw new Error(...)
  return orm === 'memory' ? factory() : factory(db!)
}
```

---

## 使用流程

### 新增模組時

假設要新增 Order 模組，只需：

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
import { createRepositoryFactory } from '@wiring/RepositoryFactoryGenerator'
import { OrderRepository } from '../Repositories/OrderRepository'
import { DrizzleOrderRepository } from '@/adapters/Drizzle/Repositories/DrizzleOrderRepository'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function registerOrderRepositories(): void {
  const registry = getRegistry()

  const factory = createRepositoryFactory({
    memory: () => new OrderRepository(),
    drizzle: (db) => new DrizzleOrderRepository(db!),
  })

  registry.register('order', factory)
  console.log('✅ [Order] Repository 工廠已註冊')
}
```

**完成！** 10 行代碼，零重複。

### 新增 ORM 支援時

假設要加入 Prisma 支援，只需修改所有模組的映射：

```typescript
// registerUserRepositories.ts
const factory = createRepositoryFactory({
  memory: () => new UserRepository(),
  drizzle: (db) => new DrizzleUserRepository(db!),
  prisma: (db) => new PrismaUserRepository(db!),  // ← 加這行
})

// registerPostRepositories.ts
const factory = createRepositoryFactory({
  memory: () => new PostRepository(),
  drizzle: (db) => new DrizzlePostRepository(db!),
  prisma: (db) => new PrismaPostRepository(db!),  // ← 加這行
})
```

**優勢：** 無需修改 Generator，只改配置映射！

---

## 進階用法：批量註冊

如果要一次註冊多個模組，可以使用 `registerRepositoriesInBatch`：

```typescript
// src/bootstrap.ts
import { registerRepositoriesInBatch } from '@wiring/RepositoryFactoryGenerator'

registerRepositoriesInBatch({
  user: {
    memory: () => new UserRepository(),
    drizzle: (db) => new DrizzleUserRepository(db!),
  },
  post: {
    memory: () => new PostRepository(),
    drizzle: (db) => new DrizzlePostRepository(db!),
  },
  order: {
    memory: () => new OrderRepository(),
    drizzle: (db) => new DrizzleOrderRepository(db!),
  },
  // ... 更多模組
})
```

**優勢：** 集中管理所有 Repository 映射！

---

## 原則遵循

### ✅ 此設計遵循的原則

| 原則 | 說明 |
|------|------|
| **DRY** | 無重複代碼，所有邏輯在 Generator 中 |
| **KISS** | 簡單明瞭，只定義映射 |
| **YAGNI** | 不過度設計，剛好滿足需求 |
| **開放封閉** | 對擴展開放（新增 ORM），對修改封閉（Generator 不變） |
| **單一責任** | 每個模組只定義自己的映射 |
| **關注點分離** | Generator 負責邏輯，模組負責配置 |

---

## 對比其他解決方案

### ❌ 方案 1：複製粘貼（最初的狀況）

```
重複代碼 × 10 個模組 = 維護噩夢
```

### ❌ 方案 2：基類繼承

```typescript
class BaseRepositoryFactory {
  protected factoryMap: RepositoryFactoryMap

  createRepository(orm: string, db?: IDatabaseAccess): any { ... }
}

class UserRepositoryFactory extends BaseRepositoryFactory {
  constructor() {
    super()
    this.factoryMap = {
      memory: () => new UserRepository(),
      drizzle: (db) => new DrizzleUserRepository(db!),
    }
  }
}

// 問題：過度工程化，引入不必要的類層次
```

### ✅ 方案 3：工廠生成器（我們的選擇）

```typescript
// 簡單、優雅、零重複
createRepositoryFactory({
  memory: () => new UserRepository(),
  drizzle: (db) => new DrizzleUserRepository(db!),
})
```

---

## 最佳實踐

### ✅ DO

```typescript
// 1. 使用工廠生成器消除重複
const factory = createRepositoryFactory({
  memory: () => new UserRepository(),
  drizzle: (db) => new DrizzleUserRepository(db!),
})

// 2. 在同一個檔案中定義和註冊
export function registerUserRepositories(): void {
  const factory = createRepositoryFactory({ ... })
  getRegistry().register('user', factory)
}

// 3. 新增 ORM 時，只改配置映射
// 新增模組時，複製現有的 registerXRepositories.ts
```

### ❌ DON'T

```typescript
// 1. 不要重複 switch/case 邏輯
function createUserRepository(orm) {
  switch (orm) { ... }  // 不聰明！
}

// 2. 不要在多個地方複製邏輯
// registerUserRepositories.ts 中的邏輯
// registerPostRepositories.ts 中重複了

// 3. 不要創建不必要的基類或抽象類
// 簡單的工廠生成器就足夠了
```

---

## 總結

**從重複 → 零重複**

```
舊設計：每個模組 40+ 行重複代碼
      10 模組 × 80% 重複 = 320 行浪費

新設計：統一的工廠生成器（50 行）
      每個模組 10 行配置映射
      10 模組 × 10 行 = 100 行（高效！）

節省：220 行代碼，提升代碼品質
```

**這就是真正的設計模式應用！** ✨
