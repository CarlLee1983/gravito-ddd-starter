# 聰明的工廠優化 - RepositoryFactory 精簡設計

## 問題：你的批評是對的

```typescript
// ❌ 不聰明的做法
export function createRepository<T extends RepositoryType>(
  type: T,
  databaseAccess?: IDatabaseAccess
): any {
  const orm = getCurrentORM()

  // 每多一個 Repository 就要加一堆 if/switch
  if (type === 'user') {
    switch (orm) {
      case 'memory': return new UserRepository()
      case 'drizzle': return new DrizzleUserRepository(databaseAccess!)
      // ...
    }
  }

  if (type === 'post') {
    switch (orm) {
      case 'memory': return new PostRepository()
      case 'drizzle': return new DrizzlePostRepository(databaseAccess!)
      // ...
    }
  }

  // 10 個模組 × 4 ORM = 40 個 case
  // 複雜度：O(n × m)
  // 維護噩夢！
}
```

**問題：**
- 💥 複雜度隨著模組和 ORM 增加而指數級增長
- 💥 每新增一個模組，都要修改這個檔案
- 💥 所有邏輯集中在一個地方，難以維護
- 💥 違反開放封閉原則（Open/Closed Principle）

---

## 解決方案：聰明的優化

既然我們已經有了 **RepositoryRegistry**，就不需要 createRepository 了！

### 新的 RepositoryFactory（精簡）

```typescript
// ✅ 聰明的做法
export type ORMType = 'memory' | 'drizzle' | 'atlas' | 'prisma'

// 只提供兩個工具函式
export function getCurrentORM(): ORMType { ... }
export function getDatabaseAccess() { ... }

// 就這樣，完成！
```

**優勢：**
- ✅ 檔案大小固定（50 行，不會無限增長）
- ✅ 複雜度 O(1)（與模組數無關）
- ✅ 新增模組時無需修改此檔案
- ✅ 完全遵循開放封閉原則

---

## 設計對比

### ❌ 舊設計（複雜）

```
RepositoryFactory.ts（單一工廠）
├─ if type === 'user'
│  └─ switch (orm)
│     ├─ case 'memory'
│     ├─ case 'drizzle'
│     └─ ...
├─ if type === 'post'
│  └─ switch (orm)
│     ├─ case 'memory'
│     ├─ case 'drizzle'
│     └─ ...
├─ if type === 'order'
│  └─ switch (orm)
│     └─ ... 無限增長
└─ ... 更多模組

複雜度：O(n × m)
```

### ✅ 新設計（聰明）

```
RepositoryFactory.ts（工具函式）
├─ getCurrentORM()         ← 工具
└─ getDatabaseAccess()     ← 工具

RepositoryRegistry.ts（註冊表）
├─ register(type, factory)
└─ create(type, orm, db)

分布式工廠（各模組）
├─ registerUserRepositories()
│  └─ createUserRepository(orm, db)
├─ registerPostRepositories()
│  └─ createPostRepository(orm, db)
├─ registerOrderRepositories()
│  └─ createOrderRepository(orm, db)
└─ ... 線性增長

複雜度：O(n)
```

---

## 核心洞察

### 舊設計的問題

```typescript
// 當系統增長時...

// 模組 1、2、3、4、5...
// 每個模組都要在 createRepository 中添加邏輯
// → 文件變成怪物
// → 多人修改衝突

export function createRepository(type: string, orm: string, db?: IDatabaseAccess): any {
  // 現在有 500+ 行
  // 包含 10 模組 × 4 ORM = 40 個 case
}
```

### 新設計的優勢

```typescript
// 系統增長時...

// 模組 1、2、3、4、5...
// 每個模組自己註冊自己的工廠
// → 各自維護，無衝突
// → RepositoryFactory 永遠只有 50 行

export function getCurrentORM(): ORMType { ... }  // 15 行
export function getDatabaseAccess() { ... }       // 35 行
// 完成！
```

---

## 實際數據對比

### 場景：支援 10 個模組，3 個 ORM

| 指標 | 舊設計 | 新設計 |
|------|--------|--------|
| **RepositoryFactory 行數** | 300+ | 50 |
| **複雜度** | O(30) | O(2) |
| **新增模組所需步驟** | 修改 Factory | 新增檔案 |
| **衝突風險** | 高（共用檔案） | 低（獨立檔案） |
| **可讀性** | 差 | 優 |
| **維護難度** | 高 | 低 |

---

## 為什麼這是「聰明的」

### 1️⃣ **違反關注點分離**

❌ 舊設計把所有邏輯混在一起：
```typescript
export function createRepository(type, orm, db) {
  // 包含所有模組的邏輯
  // 包含所有 ORM 的邏輯
  // → 關注點混亂
}
```

✅ 新設計清晰分離：
```typescript
// RepositoryFactory: 只負責 ORM 環境
export function getCurrentORM() { ... }
export function getDatabaseAccess() { ... }

// RepositoryRegistry: 負責工廠註冊
export class RepositoryRegistry { ... }

// 各模組: 負責自己的實現
registerUserRepositories() { ... }
registerPostRepositories() { ... }
```

### 2️⃣ **遵循單一責任原則**

❌ 舊 createRepository：
```typescript
// 責任：
// 1. 讀取環境變數
// 2. 驗證參數
// 3. User 邏輯
// 4. Post 邏輯
// 5. Order 邏輯
// 6. ... 等等
// → 太多責任！
```

✅ 新設計：
```typescript
// RepositoryFactory 責任：
// - 讀取環境變數
// - 初始化 Database
// ✅ 只有 2 個責任

// 各模組 registerXRepositories 責任：
// - 定義模組的 Repository 工廠
// ✅ 單一責任
```

### 3️⃣ **開放封閉原則**

❌ 舊設計（對修改開放）：
```typescript
// 新增 Order 模組？必須修改 createRepository
// 新增 Prisma ORM？必須修改 createRepository
// → 違反開放封閉原則
```

✅ 新設計（對擴展開放，對修改封閉）：
```typescript
// 新增 Order 模組？只新增 registerOrderRepositories.ts
// 新增 Prisma ORM？各模組獨立修改自己的工廠
// → 遵循開放封閉原則
```

---

## 如何使用新設計

### 步驟 1：模組定義自己的工廠

```typescript
// src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'

function createUserRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory': return new UserRepository()
    case 'drizzle': return new DrizzleUserRepository(db!)
  }
}

export function registerUserRepositories(): void {
  getRegistry().register('user', createUserRepository)
}
```

### 步驟 2：在 bootstrap 中集中調用

```typescript
// src/bootstrap.ts
import { registerUserRepositories } from './Modules/User/...'
import { registerPostRepositories } from './Modules/Post/...'

export async function bootstrap() {
  initializeRegistry()

  // 線性增長，清晰易讀
  registerUserRepositories()
  registerPostRepositories()
  registerOrderRepositories()    // 新增模組
  registerProductRepositories()  // 新增模組
}
```

### 步驟 3：ServiceProvider 只使用 Registry

```typescript
// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
override register(container: IContainer): void {
  container.singleton('userRepository', () => {
    const registry = getRegistry()
    const orm = getCurrentORM()
    const db = orm !== 'memory' ? getDatabaseAccess() : undefined
    return registry.create('user', orm, db)
  })
}
```

---

## 性能影響

### 執行速度

```typescript
// Map 查詢是 O(1)
const factory = registry.get('user')  // O(1)
const repo = factory(orm, db)         // O(1)

// 總計：O(1)，沒有性能損失
```

### 記憶體使用

```typescript
// 工廠函數存儲在 Map 中
// 記憶體開銷極小（只有引用）
const factories = new Map<string, Function>()
factories.set('user', fn1)     // 1 個引用
factories.set('post', fn2)     // 1 個引用
// ... 線性增長，無問題
```

---

## 測試

### 單元測試（更容易）

```typescript
// Mock Registry
const registry = new RepositoryRegistry()
registry.register('user', (orm, db) => mockRepository)

// 測試 UserServiceProvider
const provider = new UserServiceProvider()
provider.register(container)  // 應該使用 Registry 建立 Repository

// 無需測試 createRepository
```

### 集成測試（更簡單）

```typescript
// 只需測試不同 ORM
test('ORM=memory → UserRepository', () => {
  initializeRegistry()
  registerUserRepositories()

  const registry = getRegistry()
  const repo = registry.create('user', 'memory', undefined)

  expect(repo).toBeInstanceOf(UserRepository)
})

test('ORM=drizzle → DrizzleUserRepository', () => {
  initializeRegistry()
  registerUserRepositories()

  const registry = getRegistry()
  const db = getDatabaseAccess()
  const repo = registry.create('user', 'drizzle', db)

  expect(repo).toBeInstanceOf(DrizzleUserRepository)
})
```

---

## 最佳實踐

### ✅ DO（應該做）

```typescript
// ✅ 在模組的 registerXRepositories.ts 中定義工廠
function createUserRepository(orm: string, db?: IDatabaseAccess): any {
  switch (orm) {
    case 'memory': return new UserRepository()
    case 'drizzle': return new DrizzleUserRepository(db!)
  }
}

// ✅ 在 bootstrap 中線性調用
registerUserRepositories()
registerPostRepositories()

// ✅ 在 ServiceProvider 中使用 Registry
const repo = registry.create('user', orm, db)
```

### ❌ DON'T（不應該做）

```typescript
// ❌ 不要在 RepositoryFactory 中堆積邏輯
export function createRepository(type, orm, db) {
  if (type === 'user') { ... }
  if (type === 'post') { ... }
  // 不聰明！
}

// ❌ 不要在 ServiceProvider 中決定 ORM
container.singleton('userRepository', () => {
  if (process.env.ORM === 'memory') {
    return new UserRepository()
  } else {
    return new DrizzleUserRepository(db!)
  }
})

// ❌ 不要在多個地方複製相同的邏輯
// 應該在 RepositoryRegistry 中集中管理
```

---

## 總結

| 特性 | 舊設計 | 新設計 |
|------|--------|--------|
| **Smart Factor** | ⭐☆☆☆☆ | ⭐⭐⭐⭐⭐ |
| **代碼量** | 300+ 行 | 50 行 |
| **複雜度** | O(n×m) | O(n) |
| **可擴展性** | 差 | 優 |
| **可維護性** | 難 | 易 |
| **遵循原則** | ❌ | ✅ |

**這就是企業級架構的聰明設計！** 🧠✨
