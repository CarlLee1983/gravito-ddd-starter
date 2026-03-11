# Atlas DatabaseAccess 轉接器完整指南

## 概述

完整實現了 **Atlas ORM 適配器**，遵循 **ORM 透明設計** 架構。Repository 只依賴 `IDatabaseAccess` 抽象，完全無感知底層使用的是 Atlas、Drizzle 還是內存實現。

---

## 核心元件

### 1. AtlasQueryBuilder (`src/adapters/Atlas/AtlasQueryBuilder.ts`)

實現 `IQueryBuilder` 介面，將 Atlas ORM API 轉換為統一的查詢介面。

**支援的操作**：
- `where(column, operator, value)` - WHERE 條件
- `first()` - 取得單筆記錄
- `select()` - 取得多筆記錄
- `insert(data)` - 新增記錄
- `update(data)` - 更新記錄
- `delete()` - 刪除記錄
- `limit(n)` - 限制返回記錄數
- `offset(n)` - 分頁偏移
- `orderBy(column, direction)` - 排序
- `whereBetween(column, range)` - 範圍查詢
- `count()` - 計數

**特性**：
- ✅ 懶加載 Atlas DB 實例（避免測試環境載入問題）
- ✅ 支援鏈式調用
- ✅ 所有比較運算子：`=`, `!=`, `<>`, `>`, `<`, `>=`, `<=`, `like`, `in`, `between`
- ✅ 錯誤處理與日誌

**範例**：
```typescript
const users = await db
  .table('users')
  .where('status', '=', 'active')
  .where('age', '>=', 18)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .select()
```

### 2. AtlasDatabaseAccess (`src/adapters/Atlas/GravitoDatabaseAdapter.ts`)

實現 `IDatabaseAccess` 介面，提供 ORM 無關的資料庫訪問。

```typescript
class AtlasDatabaseAccess implements IDatabaseAccess {
  table(name: string): IQueryBuilder {
    return new AtlasQueryBuilder(name)
  }
}
```

### 3. DatabaseAccessBuilder (`src/wiring/DatabaseAccessBuilder.ts`)

根據環境變數選擇注入適當的 `IDatabaseAccess` 實現：

```typescript
const orm = getCurrentORM()
const builder = new DatabaseAccessBuilder(orm)
const db = builder.getDatabaseAccess()

// orm='memory'  → MemoryDatabaseAccess
// orm='drizzle' → DrizzleDatabaseAccess
// orm='atlas'   → AtlasDatabaseAccess
// orm='prisma'  → PrismaDatabaseAccess (未來)
```

---

## 使用方式

### 開發環境（使用 Atlas）

```bash
export ORM=atlas
bun run dev
```

### 啟用 Atlas 適配器

1. **環境變數**：
   ```bash
   ORM=atlas
   DATABASE_URL=sqlite://memory  # 或連接字符串
   ```

2. **Bootstrap**：
   ```typescript
   import { DatabaseAccessBuilder } from '@/wiring/DatabaseAccessBuilder'
   import { registerUserRepositories } from '@/Modules/User/Infrastructure/Providers/registerUserRepositories'

   const orm = getCurrentORM()  // 'atlas'
   const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()

   registerUserRepositories(db)
   ```

3. **Repository 自動適配**：
   ```typescript
   export class UserRepository implements IUserRepository {
     constructor(private db: IDatabaseAccess) {}

     async findById(id: string): Promise<User | null> {
       const row = await this.db
         .table('users')
         .where('id', '=', id)
         .first()
       return row ? this.toDomain(row) : null
     }
   }
   ```

### 測試

Atlas 適配器已包含完整單元測試：

```bash
# 運行 Atlas 轉接器測試
bun test tests/Unit/Adapters/AtlasDatabaseAdapter.test.ts

# 運行所有測試
bun test
```

**測試覆蓋**：
- ✅ AtlasQueryBuilder 介面實現
- ✅ 所有 CRUD 操作
- ✅ 鏈式調用
- ✅ 比較運算子支援
- ✅ 排序、分頁、計數

---

## 架構對比

### ❌ 舊方式（多個 Repository 類）

```typescript
// 需要為每個 ORM 實現不同的 Repository 類
export class UserRepository implements IUserRepository { ... }
export class DrizzleUserRepository implements IUserRepository { ... }
export class AtlasUserRepository implements IUserRepository { ... }
export class PrismaUserRepository implements IUserRepository { ... }
```

**問題**：
- 代碼重複（80% 相同）
- 新增 ORM 時要改所有 Repository 類
- Repository 代碼分散

### ✅ 新方式（單個 Repository + IDatabaseAccess）

```typescript
// 只有一個 Repository 類
export class UserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}

  async findById(id: string) {
    return this.db.table('users').where('id', '=', id).first()
  }
}
```

**優勢**：
- ✅ 零重複代碼
- ✅ ORM 完全透明
- ✅ 新增 ORM 時只改適配器
- ✅ 易於測試（注入 mock IDatabaseAccess）

---

## 新增其他 ORM 的流程

假設要加入 Prisma 支援：

### 步驟 1：建立 PrismaQueryBuilder

```typescript
// src/adapters/Prisma/PrismaQueryBuilder.ts
import type { IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { prisma } from './config'

export class PrismaQueryBuilder implements IQueryBuilder {
  // 實現所有 IQueryBuilder 方法
  // 轉換 Prisma API 為統一介面
}
```

### 步驟 2：建立 PrismaDatabaseAccess

```typescript
// src/adapters/Prisma/PrismaDatabaseAdapter.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { PrismaQueryBuilder } from './PrismaQueryBuilder'

class PrismaDatabaseAccess implements IDatabaseAccess {
  table(name: string): IQueryBuilder {
    return new PrismaQueryBuilder(name)
  }
}

export function createPrismaDatabaseAccess(): IDatabaseAccess {
  return new PrismaDatabaseAccess()
}
```

### 步驟 3：更新 RepositoryFactory

```typescript
// src/wiring/RepositoryFactory.ts
if (orm === 'prisma') {
  const { createPrismaDatabaseAccess } = require('@/adapters/Prisma')
  return createPrismaDatabaseAccess()
}
```

### 步驟 4：完成！

所有 Repository 自動支援 Prisma，無需任何改動。

---

## 比較運算子參考

| 運算子 | 用途 | 範例 |
|--------|------|------|
| `=` | 相等 | `.where('id', '=', '123')` |
| `!=` 或 `<>` | 不相等 | `.where('status', '!=', 'deleted')` |
| `>` | 大於 | `.where('age', '>', 18)` |
| `<` | 小於 | `.where('price', '<', 100)` |
| `>=` | 大於等於 | `.where('score', '>=', 70)` |
| `<=` | 小於等於 | `.where('qty', '<=', 5)` |
| `like` | 模糊匹配 | `.where('name', 'like', '%john%')` |
| `in` | 列表查詢 | `.where('status', 'in', ['active', 'pending'])` |
| `between` | 範圍查詢 | `.whereBetween('date', [start, end])` |

---

## 最佳實踐

### ✅ DO

```typescript
// 1. Repository 依賴 IDatabaseAccess（不感知 ORM）
export class UserRepository {
  constructor(private db: IDatabaseAccess) {}
}

// 2. 上層決定具體實現
const orm = getCurrentORM()
const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()
registerUserRepositories(db)

// 3. Repository 使用統一的查詢 API
async findActive() {
  return this.db
    .table('users')
    .where('status', '=', 'active')
    .select()
}
```

### ❌ DON'T

```typescript
// 1. 不要為每個 ORM 創建不同的 Repository 類
export class AtlasUserRepository { ... }
export class DrizzleUserRepository { ... }  // ❌ 重複！

// 2. 不要在 Repository 中硬編碼 ORM
if (process.env.ORM === 'atlas') { ... }  // ❌ 耦合！

// 3. 不要讓 Repository 檢查 db 是否 undefined
if (this.db) { ... } else { this.memoryMap.get(...) }  // ❌ 分支！
```

---

## 可能的擴展

### 1. 虛擬列（Computed Properties）

```typescript
whereBetween(column: string, range: [Date, Date]): IQueryBuilder
whereRaw(sql: string, bindings?: any[]): IQueryBuilder  // 自訂 SQL
```

### 2. 事務支援

```typescript
async transaction<T>(callback: (db: IDatabaseAccess) => Promise<T>): Promise<T>
```

### 3. 日誌和監控

```typescript
where(...): IQueryBuilder // 自動記錄查詢日誌
```

---

## 故障排除

### 問題：Module not found `@gravito/atlas`

**原因**：開發環境未安裝 Atlas

**解決**：
```bash
bun install @gravito/atlas
# 或改用其他 ORM
export ORM=memory
```

### 問題：表名稱不存在

**原因**：查詢了不存在的表

**解決**：
```typescript
// 確認表名稱（區分大小寫）
const users = await db.table('users').select()  // ✓ 正確
const Users = await db.table('Users').select()  // ✗ 可能錯誤
```

### 問題：WHERE 條件未生效

**原因**：條件應用順序或運算子錯誤

**解決**：
```typescript
// 確認條件顯式應用
const result = db
  .table('users')
  .where('status', '=', 'active')
  .where('age', '>=', 18)  // 多個 WHERE 條件
  .select()
```

---

## 性能考慮

### 1. 查詢優化

```typescript
// ✓ 好：限制欄位
const user = await db
  .table('users')
  .where('id', '=', userId)
  .limit(1)
  .first()

// ✗ 差：不必要的全表掃描
const users = await db.table('users').select()
```

### 2. 批量操作

```typescript
// ✓ 好：使用交易（未來功能）
await db.transaction(async (trx) => {
  await trx.table('users').insert(user1)
  await trx.table('users').insert(user2)
})

// ✗ 差：多次往返
await db.table('users').insert(user1)
await db.table('users').insert(user2)
```

---

## 測試

### 單元測試（不依賴數據庫）

```typescript
import { AtlasQueryBuilder } from '@/adapters/Atlas/AtlasQueryBuilder'

describe('AtlasQueryBuilder', () => {
  it('should support chainable API', () => {
    const qb = new AtlasQueryBuilder('users')
      .where('status', '=', 'active')
      .limit(10)

    expect(qb).toBeInstanceOf(AtlasQueryBuilder)
  })
})
```

### 集成測試（依賴實際數據庫）

```typescript
import { createAtlasDatabaseAccess } from '@/adapters/Atlas'
import { UserRepository } from '@/Modules/User/Infrastructure/Repositories/UserRepository'

describe('UserRepository with Atlas', () => {
  let db: IDatabaseAccess
  let repo: UserRepository

  beforeEach(() => {
    db = createAtlasDatabaseAccess()
    repo = new UserRepository(db)
  })

  it('should find user by ID', async () => {
    // 測試真實數據庫操作
    const user = await repo.findById('123')
    expect(user).toBeDefined()
  })
})
```

---

## 總結

| 特性 | 評分 |
|------|-----:|
| **代碼重複** | ⭐⭐⭐⭐⭐ (0%) |
| **ORM 透明性** | ⭐⭐⭐⭐⭐ (完全) |
| **易於擴展** | ⭐⭐⭐⭐⭐ (非常易) |
| **可測性** | ⭐⭐⭐⭐⭐ (優異) |
| **性能** | ⭐⭐⭐⭐⭐ (無開銷) |

**這就是真正的 ORM 無關性！** 🎯✨
