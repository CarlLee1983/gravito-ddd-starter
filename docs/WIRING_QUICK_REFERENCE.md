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
import { createRepository, getDatabaseAccess, getCurrentORM } from '@/wiring/RepositoryFactory'
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

export function getDatabaseAccess(): IDatabaseAccess | undefined {
  const orm = getCurrentORM()

  // ... 現有的

  if (orm === 'atlas') {  // ← 新增
    return createAtlasDatabaseAccess()
  }

  if (orm === 'prisma') {  // ← 新增
    return createPrismaDatabaseAccess()
  }

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
