# Drizzle 適配器實作路線圖

> **目的**：將 Drizzle ORM 整合為概念驗證，證明依賴完全可替換

---

## 📋 實作清單

### 階段 1：基礎設置

- [ ] 安裝 Drizzle 依賴
  ```bash
  bun add drizzle-orm drizzle-kit @libsql/client
  bun add -d drizzle-kit
  ```

- [ ] 建立 Drizzle 配置檔案
  ```
  src/adapters/Drizzle/
  ├── config.ts                          # Drizzle 連線配置
  ├── schema.ts                          # Schema 定義
  ├── DrizzleDatabaseAdapter.ts          # IDatabaseAccess 實現
  ├── DrizzleQueryBuilder.ts             # IQueryBuilder 實現
  ├── DrizzleConnectivityCheck.ts        # IDatabaseConnectivityCheck 實現
  └── index.ts                           # 公開 API
  ```

### 階段 2：核心實現

#### 2.1 配置層
```typescript
// src/adapters/Drizzle/config.ts
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

export function initializeDrizzle() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
  })
  return drizzle(client)
}
```

#### 2.2 Schema 定義
```typescript
// src/adapters/Drizzle/schema.ts
import { sqliteTable, text, integer, timestamp } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  user_id: text('user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
})
```

#### 2.3 QueryBuilder 實現
```typescript
// src/adapters/Drizzle/DrizzleQueryBuilder.ts
import type { IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { eq, like, between, desc, asc } from 'drizzle-orm'

class DrizzleQueryBuilder implements IQueryBuilder {
  private selectStatement: any
  private whereConditions: any[] = []
  private orderByConfig: { column: string; direction: 'asc' | 'desc' } | null = null
  private limitValue: number | null = null
  private offsetValue: number | null = null

  constructor(private db: any, private tableName: string, private schema: any) {
    this.selectStatement = this.db.select().from(this.schema)
  }

  where(column: string, operator: string, value: unknown): IQueryBuilder {
    // 轉換運算子為 Drizzle 式
    const col = this.schema[column]

    switch (operator) {
      case '=':
        this.whereConditions.push(eq(col, value))
        break
      case '!=':
        this.whereConditions.push(sql`${col} != ${value}`)
        break
      case '>':
        this.whereConditions.push(sql`${col} > ${value}`)
        break
      case '<':
        this.whereConditions.push(sql`${col} < ${value}`)
        break
      case '>=':
        this.whereConditions.push(sql`${col} >= ${value}`)
        break
      case '<=':
        this.whereConditions.push(sql`${col} <= ${value}`)
        break
      case 'like':
        this.whereConditions.push(like(col, value as string))
        break
      case 'in':
        this.whereConditions.push(inArray(col, value as any[]))
        break
    }

    return this
  }

  async first(): Promise<Record<string, unknown> | null> {
    let query = this.selectStatement

    if (this.whereConditions.length > 0) {
      query = query.where(and(...this.whereConditions))
    }

    const result = await query.limit(1)
    return result[0] || null
  }

  async select(): Promise<Record<string, unknown>[]> {
    let query = this.selectStatement

    if (this.whereConditions.length > 0) {
      query = query.where(and(...this.whereConditions))
    }

    if (this.orderByConfig) {
      const col = this.schema[this.orderByConfig.column]
      query = query.orderBy(
        this.orderByConfig.direction === 'asc' ? asc(col) : desc(col)
      )
    }

    if (this.limitValue) {
      query = query.limit(this.limitValue)
    }

    if (this.offsetValue) {
      query = query.offset(this.offsetValue)
    }

    return query
  }

  limit(value: number): IQueryBuilder {
    this.limitValue = value
    return this
  }

  offset(value: number): IQueryBuilder {
    this.offsetValue = value
    return this
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): IQueryBuilder {
    this.orderByConfig = { column, direction }
    return this
  }

  async count(): Promise<number> {
    const countResult = await this.db
      .select({ count: countDistinct(this.schema.id) })
      .from(this.schema)

    return countResult[0]?.count || 0
  }

  // 其他方法實現...
  async insert(data: Record<string, unknown>): Promise<void> {
    await this.db.insert(this.schema).values(data)
  }

  async update(data: Record<string, unknown>): Promise<void> {
    let query = this.db.update(this.schema)

    if (this.whereConditions.length > 0) {
      query = query.where(and(...this.whereConditions))
    }

    await query.set(data)
  }

  async delete(): Promise<void> {
    let query = this.db.delete(this.schema)

    if (this.whereConditions.length > 0) {
      query = query.where(and(...this.whereConditions))
    }

    await query
  }

  whereBetween(column: string, range: [unknown, unknown]): IQueryBuilder {
    const col = this.schema[column]
    this.whereConditions.push(between(col, range[0], range[1]))
    return this
  }
}
```

#### 2.4 DatabaseAccess 實現
```typescript
// src/adapters/Drizzle/DrizzleDatabaseAdapter.ts
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { DrizzleQueryBuilder } from './DrizzleQueryBuilder'
import { initializeDrizzle } from './config'
import * as schema from './schema'

class DrizzleDatabaseAccess implements IDatabaseAccess {
  private db: any

  constructor() {
    this.db = initializeDrizzle()
  }

  table(name: string): IQueryBuilder {
    const tableSchema = (schema as any)[name]

    if (!tableSchema) {
      throw new Error(`Table "${name}" not found in schema`)
    }

    return new DrizzleQueryBuilder(this.db, name, tableSchema)
  }
}

export function createDrizzleDatabaseAccess(): IDatabaseAccess {
  return new DrizzleDatabaseAccess()
}
```

#### 2.5 連線檢查實現
```typescript
// src/adapters/Drizzle/DrizzleConnectivityCheck.ts
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { initializeDrizzle } from './config'
import { sql } from 'drizzle-orm'

export function createDrizzleConnectivityCheck(): IDatabaseConnectivityCheck {
  const db = initializeDrizzle()

  return {
    async ping(): Promise<boolean> {
      try {
        await db.execute(sql`SELECT 1`)
        return true
      } catch {
        return false
      }
    },
  }
}
```

#### 2.6 公開 API
```typescript
// src/adapters/Drizzle/index.ts
export { createDrizzleDatabaseAccess } from './DrizzleDatabaseAdapter'
export { createDrizzleConnectivityCheck } from './DrizzleConnectivityCheck'
```

### 階段 3：Repository 實現

實現 Drizzle 版本的 UserRepository 和 PostRepository：

```typescript
// src/adapters/Drizzle/Repositories/DrizzleUserRepository.ts
import { createDrizzleDatabaseAccess } from '..'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'

class DrizzleUserRepository implements IUserRepository {
  private db = createDrizzleDatabaseAccess()

  async save(user: User): Promise<void> {
    // 實現
  }

  async findById(id: string): Promise<User | null> {
    // 實現
  }

  // ... 其他方法
}

export function createDrizzleUserRepository(): IUserRepository {
  return new DrizzleUserRepository()
}
```

### 階段 4：可替換性驗證

- [ ] 執行 `RepositorySwappability.test.ts`
  ```bash
  # 加入測試註解
  it('Drizzle 實現應該通過所有測試', async () => {
    const { createDrizzleUserRepository } = await import('@/adapters/Drizzle')
    createUserRepositoryTests(() => createDrizzleUserRepository())
  })
  ```

- [ ] 執行 `DatabaseAccessSwappability.test.ts`
  ```bash
  # 加入測試註解
  describe('Drizzle DatabaseAccess - 可替換性驗證', () => {
    createDatabaseAccessSwappabilityTests(
      'Drizzle',
      () => createDrizzleDatabaseAccess()
    )
  })
  ```

- [ ] 驗證所有測試通過

### 階段 5：Wiring 層測試

驗證在 `src/wiring/` 中只需改變導入路徑：

```typescript
// 情景 1：Atlas
import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
const db = createGravitoDatabaseAccess()

// 情景 2：Drizzle（只需改變此行）
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
const db = createDrizzleDatabaseAccess()

// 其他所有代碼不改變！
```

---

## 🔄 遷移流程

### 從 Atlas 切換到 Drizzle

```bash
# 1. 安裝 Drizzle
bun add drizzle-orm @libsql/client

# 2. 在 src/wiring/ 中改變導入
- import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
+ import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

# 3. 執行相同代碼
- const db = createGravitoDatabaseAccess()
+ const db = createDrizzleDatabaseAccess()

# 4. 完成！所有應用層代碼無需改動
```

---

## ⚠️ 已知限制和注意事項

1. **Schema 遷移**：Drizzle 使用不同的 schema 定義格式，需要手動對應
2. **查詢差異**：某些 Drizzle 特定的查詢可能需要調整
3. **型別檢查**：Drizzle 提供更強的型別檢查，可能需要調整某些代碼
4. **連線池**：Drizzle 的連線管理與 Atlas 不同

---

## 📊 進度追蹤

| 項目 | 狀態 | 時間 |
|-----|------|------|
| 環境設置 | ⏳ | 1h |
| QueryBuilder 實現 | ⏳ | 6h |
| DatabaseAccess 實現 | ⏳ | 3h |
| Repository 實現 | ⏳ | 4h |
| 測試驗證 | ⏳ | 2h |
| **總計** | ⏳ | **16h** |

---

## 📚 相關資源

- `docs/Atlas/README.md` - Atlas 適配器參考
- `docs/ABSTRACTION_RULES.md` - 抽象化規則
- `test/integration/adapters/RepositorySwappability.test.ts` - 可替換性測試
- `test/integration/adapters/DatabaseAccessSwappability.test.ts` - 適配器測試

---

**狀態**: 🟡 準備中
**預計開始**: 2026-03-10
**預計完成**: 2026-03-15
