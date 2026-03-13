# 依賴注入架構 - ORM 透明抽換

## 概述

這個架構實現了**上層注入，下層透明**的設計原則：
- ✅ **模組對 ORM 實現完全無感知**
- ✅ **所有 ORM 選擇決策在 bootstrap.ts 中集中控制**
- ✅ **Memory 實現只在開發/測試時被注入，生產環境由上層決定**
- ✅ **新增 ORM 時只改 FactoryMapBuilder，無需改動模組**

---

## 架構設計

### 之前：硬編碼的工廠映射 ❌

```typescript
// registerUserRepositories.ts - 每個模組都硬編碼實現映射
const factory = createRepositoryFactory({
  memory: () => new UserRepository(),           // ← 硬編碼
  drizzle: (db) => new DrizzleUserRepository(), // ← 硬編碼
})
```

**問題：**
- 模組知道自己要使用哪些 ORM 實現
- Memory 實現被當作預設值，無法只在開發時使用
- 每個模組都重複定義映射

### 之後：上層注入 ✅

```typescript
// bootstrap.ts - 唯一決定 ORM 的地方
const orm = getCurrentORM()
const db = orm !== 'memory' ? getDatabaseAccess() : undefined
const factoryBuilder = new FactoryMapBuilder(orm, db)

registerUserRepositories(factoryBuilder.build('user'))

// registerUserRepositories.ts - 模組完全無感知
export function registerUserRepositories(factoryMap: RepositoryFactoryMap): void {
  const factory = createRepositoryFactory(factoryMap)
  getRegistry().register('user', factory)
}
```

**優勢：**
- ✅ 模組不知道 ORM 細節，只負責註冊
- ✅ ORM 選擇完全由上層控制
- ✅ Memory 實現由上層決定何時使用

---

## 核心概念

### 1. FactoryMapBuilder（工廠映射構建器）

**職責：** 根據 ORM 類型和模組名稱，動態構建 Repository 工廠映射

```typescript
// src/wiring/FactoryMapBuilder.ts
const builder = new FactoryMapBuilder('drizzle', databaseAccess)
const userFactoryMap = builder.build('user')
```

**關鍵特性：**
- 集中管理所有模組的 Repository 實現
- 支援 memory、drizzle、atlas、prisma
- 新增模組時只需在 FactoryMapBuilder 中加一個定義

### 2. registerXRepositories（模組註冊函數）

**職責：** 接受上層注入的工廠映射，註冊到全局 Registry

```typescript
// src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
export function registerUserRepositories(
  factoryMap: RepositoryFactoryMap
): void {
  const registry = getRegistry()
  const factory = createRepositoryFactory(factoryMap)
  registry.register('user', factory)
}
```

**改變：** 從硬編碼映射 → 接受參數

### 3. bootstrap.ts（應用啟動）

**職責：** 唯一決定 ORM 選擇的地方，協調所有模組

```typescript
// src/bootstrap.ts - Step 3
const orm = getCurrentORM()
const db = orm !== 'memory' ? getDatabaseAccess() : undefined
const factoryBuilder = new FactoryMapBuilder(orm, db)

registerUserRepositories(factoryBuilder.build('user'))
registerPostRepositories(factoryBuilder.build('post'))
```

---

## 完整流程

### 步驟 1：環境決策（bootstrap.ts）

```typescript
// 根據環境變數決定使用哪個 ORM
const orm = getCurrentORM()  // 'memory' | 'drizzle' | 'atlas' | 'prisma'
const db = orm !== 'memory' ? getDatabaseAccess() : undefined

console.log(`📦 已選擇 ORM: ${orm}`)
```

### 步驟 2：工廠映射構建（FactoryMapBuilder）

```typescript
// 根據 ORM 類型，為每個模組構建映射
const factoryBuilder = new FactoryMapBuilder(orm, db)

// 對 User 模組：
//   - ORM=memory  → memory() 函數
//   - ORM=drizzle → drizzle() 函數
//   - ...
const userFactoryMap = factoryBuilder.build('user')

// 對 Post 模組：
const postFactoryMap = factoryBuilder.build('post')
```

### 步驟 3：工廠註冊（各模組）

```typescript
// User 模組接收映射並註冊
registerUserRepositories(userFactoryMap)
// RepositoryRegistry 中：
//   'user' → (orm, db) => {
//     if (orm === 'memory') return new UserRepository()
//     if (orm === 'drizzle') return new DrizzleUserRepository(db)
//   }

// Post 模組接收映射並註冊
registerPostRepositories(postFactoryMap)
```

### 步驟 4：創建 Repository（ServiceProvider）

```typescript
// User ServiceProvider
override register(container: IContainer): void {
  container.singleton('userRepository', () => {
    const registry = getRegistry()
    const orm = getCurrentORM()
    const db = orm !== 'memory' ? getDatabaseAccess() : undefined
    return registry.create('user', orm, db)  // ← 自動選擇實現
  })
}

// 運行時行為：
// ORM=memory  → new UserRepository()
// ORM=drizzle → new DrizzleUserRepository(db)
```

---

## 實際範例

### 場景：切換 ORM

#### 方式 1：ORM=memory（開發/測試）

```bash
# 使用 memory 實現
export ORM=memory
bun run dev

# 所有模組使用 in-memory Repository
User Module:   UserRepository
Post Module:   PostRepository
Order Module:  OrderRepository (未來)
```

#### 方式 2：ORM=drizzle（開發/測試/生產）

```bash
# 使用 Drizzle 實現
export ORM=drizzle
export DATABASE_URL=...
bun run dev

# 所有模組使用 Drizzle Repository
User Module:   DrizzleUserRepository
Post Module:   DrizzlePostRepository
Order Module:  DrizzleOrderRepository (未來)
```

#### 方式 3：ORM=prisma（未來）

```bash
# 使用 Prisma 實現
export ORM=prisma
export DATABASE_URL=...
bun run dev

# 所有模組使用 Prisma Repository
User Module:   PrismaUserRepository
Post Module:   PrismaPostRepository
Order Module:  PrismaOrderRepository (未來)
```

### 切換 ORM 時無需改動任何模組代碼！

```typescript
// src/Modules/User/... - 完全不變
export function registerUserRepositories(factoryMap: RepositoryFactoryMap): void {
  // 完全相同的代碼
}

// src/Modules/Post/... - 完全不變
export function registerPostRepositories(factoryMap: RepositoryFactoryMap): void {
  // 完全相同的代碼
}
```

---

## 新增模組的流程

假設要新增 Order 模組：

### 步驟 1：在 FactoryMapBuilder 中定義映射

```typescript
// src/wiring/FactoryMapBuilder.ts
private getModuleDefinition(moduleName: string): Record<string, any> {
  const definitions = {
    // ... 現有模組 ...
    order: {  // ← 新增
      memory: () => new OrderRepository(),
      drizzle: (db) => new DrizzleOrderRepository(db!),
      atlas: undefined,
      prisma: undefined,
    },
  }
}
```

### 步驟 2：建立 registerOrderRepositories 函數

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
import type { RepositoryFactoryMap } from '@wiring/RepositoryFactoryGenerator'
import { createRepositoryFactory } from '@wiring/RepositoryFactoryGenerator'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function registerOrderRepositories(
  factoryMap: RepositoryFactoryMap
): void {
  const registry = getRegistry()
  const factory = createRepositoryFactory(factoryMap)
  registry.register('order', factory)
  console.log('✅ [Order] Repository 工廠已註冊')
}
```

### 步驟 3：在 bootstrap.ts 中註冊

```typescript
// src/bootstrap.ts
const factoryBuilder = new FactoryMapBuilder(orm, db)

registerUserRepositories(factoryBuilder.build('user'))
registerPostRepositories(factoryBuilder.build('post'))
registerOrderRepositories(factoryBuilder.build('order'))  // ← 新增
```

**完成！** Order 模組現在支援所有 ORM，無需為每個 ORM 改動代碼。

---

## 設計原則

### 1. 單一責任原則

| 組件 | 責任 |
|------|------|
| **bootstrap.ts** | 決定使用哪個 ORM |
| **FactoryMapBuilder** | 根據 ORM 選擇和模組名稱，提供對應的工廠映射 |
| **registerXRepositories** | 接受映射，註冊到 Registry |
| **ServiceProvider** | 從 Registry 建立 Repository 實例 |
| **模組** | 完全無感知 ORM 實現 |

### 2. 開放封閉原則

- **對擴展開放：** 新增模組時只改 FactoryMapBuilder
- **對修改封閉：** 現有代碼無需改動

### 3. 依賴反轉原則

- **高層（bootstrap）** 決定使用哪個實現
- **低層（模組）** 接受決策，無需知道細節
- **中層（FactoryMapBuilder）** 橋接高層決策到低層實現

### 4. 關注點分離

```
環境決策層   ← bootstrap.ts（決定 ORM）
    ↓
映射構建層   ← FactoryMapBuilder（提供映射）
    ↓
註冊層       ← registerXRepositories（註冊工廠）
    ↓
創建層       ← Registry.create()（創建實例）
    ↓
模組層       ← 各模組完全無感知
```

---

## 對比：舊 vs 新

| 指標 | 舊（硬編碼） | 新（注入） |
|------|----------|---------|
| **ORM 決策點** | 分散在每個模組 | 集中在 bootstrap.ts |
| **模組對 ORM 感知** | ✅ 感知 | ❌ 無感知 |
| **新增模組步數** | 為每個 ORM 實現 | 只改 FactoryMapBuilder |
| **新增 ORM 步數** | 修改所有模組 | 修改 FactoryMapBuilder |
| **Memory 實現** | 當作預設值 | 由上層控制何時使用 |
| **切換 ORM 難度** | 高（需改模組邏輯） | 低（只改環境變數） |
| **測試環境** | 難以模擬不同 ORM | 容易注入模擬實現 |

---

## 測試與模擬

### 單元測試：注入模擬工廠映射

```typescript
import { registerUserRepositories } from '@/Modules/User/Infrastructure/Providers/registerUserRepositories'
import { initializeRegistry } from '@wiring/RepositoryRegistry'

test('UserServiceProvider 應使用 mock Repository', () => {
  initializeRegistry()

  // 注入模擬工廠映射
  const mockFactoryMap = {
    memory: () => mockUserRepository,
  }

  registerUserRepositories(mockFactoryMap)

  // 測試 UserServiceProvider
  const provider = new UserServiceProvider()
  // ...
})
```

### 集成測試：測試不同 ORM

```typescript
test('ORM=memory → 使用 UserRepository', () => {
  process.env.ORM = 'memory'
  // bootstrap()...
  // 驗證 memory 實現
})

test('ORM=drizzle → 使用 DrizzleUserRepository', () => {
  process.env.ORM = 'drizzle'
  // bootstrap()...
  // 驗證 drizzle 實現
})
```

---

## 最佳實踐

### ✅ DO

```typescript
// 1. 在 bootstrap.ts 集中決定 ORM
const orm = getCurrentORM()
const db = orm !== 'memory' ? getDatabaseAccess() : undefined
const builder = new FactoryMapBuilder(orm, db)

// 2. 模組接受工廠映射參數
export function registerUserRepositories(
  factoryMap: RepositoryFactoryMap
): void { ... }

// 3. 在 FactoryMapBuilder 集中管理所有模組映射
class FactoryMapBuilder {
  build(moduleName: string): RepositoryFactoryMap { ... }
}

// 4. ServiceProvider 從 Registry 取得 Repository
const repo = registry.create('user', orm, db)
```

### ❌ DON'T

```typescript
// 1. 不要在模組中硬編碼 ORM 映射
const factory = createRepositoryFactory({
  memory: () => new UserRepository(),
  drizzle: (db) => new DrizzleUserRepository(),
})  // ❌ 硬編碼！

// 2. 不要在模組中決定使用哪個 ORM
if (process.env.ORM === 'memory') {
  return new UserRepository()
} else {
  return new DrizzleUserRepository()
}  // ❌ 模組感知 ORM！

// 3. 不要在多個地方複製 ORM 選擇邏輯
// registerUserRepositories.ts 中決定
// registerPostRepositories.ts 中也決定
// 重複！ ❌

// 4. 不要在 bootstrap 以外的地方改變 ORM 選擇
// 應該統一在 bootstrap.ts 中
```

---

## 常見問題

### Q：为什麼不直接在 FactoryMapBuilder 中初始化 db？

**A：** 保持單一責任。bootstrap.ts 負責決定何時需要 db（基於 ORM 類型），FactoryMapBuilder 只負責提供映射。這樣測試時更容易模擬。

### Q：新增第三方 ORM（如 TypeORM）時怎麼辦？

**A：** 三步驟：
1. 在 RepositoryFactory.ts 中加入 typeorm 適配器初始化
2. 在 FactoryMapBuilder 中為所有模組加入 typeorm 映射
3. 完成！所有模組自動支援

### Q：能否為不同模組使用不同 ORM？

**A：** 當前設計是全局一個 ORM。如果需要混合使用，可以擴展 FactoryMapBuilder 接受模組特定的 ORM 參數，但這會增加複雜度，不推薦。

### Q：Memory 實現何時使用？

**A：**
- **開發環境：** `export ORM=memory`
- **單元測試：** 注入 memory 工廠映射
- **集成測試：** 需要數據庫時使用真實 ORM
- **生產環境：** 使用真實 ORM（drizzle/prisma/atlas）

---

## 總結

這個架構實現了真正的**ORM 無關性**：

```
環境變數 (ORM=xxx)
         ↓
    bootstrap.ts
         ↓
  FactoryMapBuilder
         ↓
  registerXRepositories
         ↓
   RepositoryRegistry
         ↓
   ServiceProviders
         ↓
   模組（完全無感知 ORM）
```

**核心優勢：**
- 所有 ORM 選擇决策集中在一個地方（bootstrap.ts）
- 模組完全無感知實現細節
- 新增 ORM 時只改一個文件
- Memory 實現只在需要時注入
- 遵循所有 SOLID 原則

**這就是企業級 DDD 架構應該的樣子！** 🏗️✨
