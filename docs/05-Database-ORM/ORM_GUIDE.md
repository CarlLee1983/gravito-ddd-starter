> **Tier: 1 - 必需** | 預計 10 分鐘 | 資料庫和遷移 | ⭐⭐⭐

# 資料庫操作指南

本指南介紹如何使用 Gravito DDD Starter 中的資料庫相關工具，參考 Laravel Artisan 設計原則。

## 📋 指令速查表

### Migration 指令

| 指令 | 說明 | 狀態 |
|------|------|------|
| `bun run migrate` | 執行所有待執行的 migration | ✅ 可用 |
| `bun run migrate:status` | 查看 migration 執行狀態 | ✅ 可用 |
| `bun run migrate:rollback` | 回滾最後一批執行的 migration | ✅ 可用 |
| `bun run migrate:fresh` | 清除所有表並重新執行所有 migration（危險操作） | ✅ 可用 |
| `bun run make:migration <name>` | **手動建立** migration 檔案 | ℹ️ 見下方 |

### Seeder 指令

| 指令 | 說明 |
|------|------|
| `bun run seed` | 執行所有 seeder |
| `bun run db:fresh` | 執行 `migrate:fresh` 再執行 `seed`（一鍵重置） |

### 診斷與工具

| 指令 | 說明 | 狀態 |
|------|------|------|
| `bun run db:doctor` | 診斷資料庫連線狀態 | ℹ️ 計劃中 |
| `bun run generate:types` | 從 Model 產生 TypeScript 型別 | ℹ️ 計劃中 |

---

## ⚙️ 當前可用的指令

### 實施完成的指令

```bash
# Migration 執行相關
bun run migrate              # 執行所有待執行的 migration
bun run migrate:status       # 查看遷移狀態
bun run migrate:rollback     # 回滾最後一批
bun run migrate:fresh        # 清除重跑所有 migration

# Seeder 執行相關
bun run seed                 # 執行所有 seeder
bun run db:fresh             # migrate:fresh + seed（一鍵重置）

# 模組生成相關
bun run make:module <name>   # 生成新模組（可加 --db --migration --redis --cache）
bun run make:controller      # 生成 Controller
bun run make:middleware      # 生成 Middleware
bun run make:command         # 生成 Command
bun run route:list           # 列出所有路由
bun run tinker               # 進入互動式 REPL
```

### 手動建立 Migration（推薦）

由於 `orbit make:migration` 暫不可用，請手動建立 migration 檔案：

```bash
# 1. 確定下一個序號（查看 database/migrations/ 最大編號）
ls database/migrations/

# 2. 建立新檔案（按照命名約定）
# 例如：database/migrations/002_create_posts_table.ts

# 3. 編寫 migration 內容（見下方「Migration 檔案格式」章節）

# 4. 執行 migration
bun run migrate
```

---

## 🔄 Migration 工作流程

### 建立 Migration（手動）

由於 `orbit make:migration` 指令暫不可用，請遵循以下步驟手動建立：

```bash
# 1. 查看現有 migrations 的序號
ls database/migrations/

# 2. 確定下一個序號（例如 002）

# 3. 使用編輯器建立新檔案
# 檔案路徑：database/migrations/002_create_posts_table.ts

# 4. 將以下模板貼到新檔案
```

**快速建立命令**（macOS/Linux）：

```bash
# 建立新 migration 檔案並開啟編輯器
touch database/migrations/002_create_posts_table.ts
open database/migrations/002_create_posts_table.ts  # macOS
# 或使用其他編輯器打開編輯
```

### Migration 檔案格式（Laravel 風格）

使用 **SchemaBuilder** 和 **MigrationHelper** 提供 Laravel 風格的流暢 API：

```typescript
import type { AtlasOrbit } from '@gravito/atlas'
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
  await createTable(db, 'posts', (t) => {
    t.id()
    t.string('title').notNull()
    t.text('content')
    t.string('user_id').notNull().references('id').on('users').onDelete('cascade')
    t.timestamps()
  })
}

export async function down(db: AtlasOrbit): Promise<void> {
  await dropTableIfExists(db, 'posts')
}
```

#### 支援的欄位類型

| 方法 | SQL 型別 | 說明 |
|------|---------|------|
| `id()` | TEXT PRIMARY KEY | 主鍵（UUID 或 nanoid） |
| `string(name, length)` | VARCHAR(255) | 字符串（預設 255） |
| `text(name)` | TEXT | 長文本 |
| `integer(name)` | INTEGER | 整數 |
| `bigInteger(name)` | BIGINT | 大整數 |
| `float(name)` | FLOAT | 浮點數 |
| `decimal(name, p, s)` | DECIMAL(p, s) | 十進制數 |
| `boolean(name)` | BOOLEAN | 布林值 |
| `date(name)` | DATE | 日期 |
| `dateTime(name)` | DATETIME | 日期時間 |
| `timestamp(name)` | TIMESTAMP | 時間戳 |
| `json(name)` | JSON | JSON 欄位 |
| `uuid(name)` | TEXT | UUID 欄位 |

#### 支援的欄位修飾符

```typescript
t.string('email')
  .notNull()           // NOT NULL
  .unique()            // UNIQUE
  .default('value')    // DEFAULT 'value'
  .collate('utf8mb4')  // COLLATE utf8mb4
```

#### 外鍵約束

```typescript
t.string('user_id')
  .notNull()
  .references('id')      // 參考的欄位
  .on('users')           // 參考的表
  .onDelete('cascade')   // 刪除級聯
  .onUpdate('cascade')   // 更新級聯
```

#### 特殊方法

```typescript
t.timestamps()      // 新增 created_at 和 updated_at（自動設為 CURRENT_TIMESTAMP）
t.softDeletes()     // 新增 deleted_at（軟刪除）
t.primary(['id', 'org_id'])  // 複合主鍵
t.unique(['email', 'tenant_id'])  // 複合唯一約束
t.index(['email'])  // 新增索引
```

#### 完整例子：複雜表結構

```typescript
import type { AtlasOrbit } from '@gravito/atlas'
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
  await createTable(db, 'orders', (t) => {
    t.id()                                    // id (TEXT PRIMARY KEY)
    t.string('order_number').notNull().unique()
    t.string('user_id').notNull()
    t.string('status').notNull().default('pending')
    t.decimal('total_amount', 10, 2)         // DECIMAL(10,2)
    t.json('metadata')                       // JSON 欄位
    t.text('notes')                          // 長文本
    t.dateTime('completed_at')               // 可為 null

    // 外鍵參考
    t.string('billing_address_id')
      .references('id')
      .on('addresses')
      .onDelete('restrict')

    // 時間戳
    t.timestamps()

    // 軟刪除
    t.softDeletes()
  })
}

export async function down(db: AtlasOrbit): Promise<void> {
  await dropTableIfExists(db, 'orders')
}
```

### 執行 Migration

```bash
# 執行所有待執行的 migration
bun run migrate

# 查看執行狀態
bun run migrate:status

# 回滾最後一批
bun run migrate:rollback
```

---

## 🌱 Seeder 工作流程

### Seeder 檔案格式

```typescript
import { DB } from '@gravito/atlas'

export default async function seed(): Promise<void> {
  // 植入 posts 資料
  await DB.table('posts').insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'First Post',
      content: 'This is the first post',
      user_id: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Second Post',
      content: 'This is the second post',
      user_id: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    },
  ])
  console.log('PostSeeder: Seeding complete')
}
```

### 執行 Seeder

```bash
# 執行所有 seeder
bun run seed

# 通常配合 migration 一起使用
bun run migrate && bun run seed

# 一鍵重置資料庫（清除 → 遷移 → 植入）
bun run db:fresh
```

---

## 🚀 模組生成時整合資料庫

使用 `generate:module` 時支援 `--db` 和 `--migration` 旗標：

### 含資料庫支援的模組

```bash
# 生成模組，自動建立 DB-backed Repository 和 migration/seeder
bun run make:module Post --db

# 生成的結構：
# src/Modules/Post/
# ├── Infrastructure/Repositories/PostRepository.ts (DB-backed, 接收 IDatabaseAccess)
# ├── ... (其他模組檔案)
#
# database/
# ├── migrations/002_create_posts_table.ts
# └── seeders/PostSeeder.ts
```

### 僅含 Migration 的模組

```bash
# 生成模組，生成 migration 和 seeder，但 Repository 仍為 in-memory
bun run make:module Article --migration

# 後續可手動修改 Repository 為 DB-backed
```

### 含 Cache/Redis 的模組

```bash
# 生成支援 Redis cache 的模組（適配層）
bun run make:module Session --redis --cache

# 生成支援資料庫的模組（含 migration）
bun run make:module Order --db --redis --cache --migration
```

---

## 🔍 IDatabaseAccess 介面

DB-backed Repository 依賴於 `IDatabaseAccess` 介面。該介面提供：

```typescript
interface IDatabaseAccess {
  table(name: string): QueryBuilder
  connection: DatabaseConnection
  // 其他方法...
}
```

**範例：DB-backed Repository**

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'

export class PostRepository implements IPostRepository {
  constructor(private db: IDatabaseAccess) {}

  async findAll(): Promise<any[]> {
    return this.db.table('posts').select()
  }

  async findById(id: string): Promise<any | null> {
    return this.db.table('posts').where('id', id).first()
  }

  async save(entity: any): Promise<void> {
    const exists = await this.findById(entity.id)
    if (exists) {
      await this.db.table('posts').where('id', entity.id).update(entity)
    } else {
      await this.db.table('posts').insert(entity)
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.table('posts').where('id', id).delete()
  }
}
```

---

## 💡 最佳實踐

### 1. 命名約定

- **Migrations**: `NNN_description_here.ts`（如 `001_create_users_table.ts`）
- **Seeders**: `{Module}Seeder.ts`（如 `PostSeeder.ts`、`UserSeeder.ts`）
- **表名**: 小寫複數（`users`、`posts`、`orders`）

### 2. Migration 設計

```typescript
// ✅ 好的做法
export async function up(db: AtlasOrbit): Promise<void> {
  await db.connection.execute(sql`
    CREATE TABLE IF NOT EXISTS posts (...)
  `)
}

// ✅ 冪等性（可重複執行）
export async function down(db: AtlasOrbit): Promise<void> {
  await db.connection.execute(sql`DROP TABLE IF EXISTS posts`)
}

// ❌ 避免
export async function up(db: AtlasOrbit): Promise<void> {
  await db.connection.execute(sql`CREATE TABLE posts (...)`) // 會失敗（表已存在）
}
```

### 3. Seeder 組織

```typescript
// ✅ 分離 seeder，各司其職
// database/seeders/UserSeeder.ts
export default async function seed(): Promise<void> {
  // 僅植入 users
}

// database/seeders/PostSeeder.ts
export default async function seed(): Promise<void> {
  // 僅植入 posts（依賴 users 已存在）
}

// ❌ 避免
// 一個 seeder 做所有事，難以維護
```

### 4. 開發工作流程

```bash
# 1. 建立新 migration
bun run make:migration add_status_to_posts

# 2. 編輯 migration 檔案

# 3. 執行 migration
bun run migrate

# 4. 驗證結果
bun run migrate:status

# 5. 如果需要回滾
bun run migrate:rollback

# 6. 建立 seeder 並植入測試資料
bun run seed

# 7. 一鍵重置（開發時常用）
bun run db:fresh
```

---

## 🔗 相關資源

- [Module Generation Guide](./MODULE_GENERATION.md) - 模組生成文檔
- [Architecture Guide](./ARCHITECTURE.md) - 架構設計
- [Testing Guide](./TESTING.md) - 測試指南
- [@gravito/atlas 文檔](https://github.com/gravito/atlas) - Atlas Migration 工具

---

## 📝 常見問題

**Q：如何查看執行過的 migrations？**

```bash
bun run migrate:status
```

**Q：如何在開發時完全重置資料庫？**

```bash
# 慎用！此命令清除所有資料
bun run db:fresh
```

**Q：如何在生產環境安全地執行 migration？**

```bash
# 先檢查狀態
bun run migrate:status

# 備份資料庫後執行
bun run migrate

# 驗證
bun run migrate:status
```

**Q：為什麼 `orbit make:migration` 不能用？**

A：@gravito/atlas v2.0.0 的 CLI 工具暫不完全可用。請使用**手動方式**建立 migration 檔案：

```bash
# 1. 確定下一個序號
ls database/migrations/

# 2. 建立新檔案（如 002_create_posts_table.ts）
touch database/migrations/002_create_posts_table.ts

# 3. 使用下方「Migration 檔案格式」的模板填入內容

# 4. 執行 migration
bun run migrate
```

**Q：如何為現有模組新增資料庫支援？**

1. 手動建立 migration 檔案：`database/migrations/NNN_create_table_name.ts`
2. 複製並修改下方「Migration 檔案格式」的模板
3. 修改 Repository 類別，使其接收 `IDatabaseAccess` constructor 參數
4. 執行 `bun run migrate`

**Q：generate-module.ts 中的 --db 旗標會自動建立 migration 和 seeder 嗎？**

A：是的！使用 `--db` 旗標時會：
- ✅ 生成 DB-backed Repository（接收 IDatabaseAccess）
- ✅ 自動建立 migration 檔案（在 `database/migrations/`）
- ✅ 自動建立 seeder 檔案（在 `database/seeders/`）
- ✅ 提供後續執行指令的提示

```bash
bun run make:module Post --db
# 會自動建立 migration 和 seeder，無需手動建立
```
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
   import { DatabaseAccessBuilder } from '@wiring/DatabaseAccessBuilder'
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
# ORM 遷移指南 - 可替換依賴的完整流程

> 本指南演示如何使用可替換性測試驗證新 ORM 適配器，確保零業務邏輯改動的 ORM 遷移

---

## 🎯 快速概覽

此專案採用**依賴反轉原則**，使得任何 ORM 都可以無縫替換：

```
┌─────────────────────────────────────┐
│   業務邏輯層（Domain + Application） │ ← 完全不依賴 ORM
└─────────────────────────────────────┘
               ↓ 依賴
    ┌──────────────────────┐
    │   公開介面           │
    │ (IDatabaseAccess)    │
    └──────────────────────┘
               ↓ 實現
┌─────────────────────────────────────┐
│   適配器層（Atlas / Drizzle / etc）   │ ← 可隨時替換
└─────────────────────────────────────┘
```

---

## 📋 遷移檢查清單

### ✅ 階段 1：驗證舊 ORM（Atlas）

```bash
# 1. 執行現有可替換性測試
bun test test/integration/adapters/RepositorySwappability.test.ts
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts
bun test test/integration/wiring/ContainerSwappability.test.ts

# 預期結果：所有測試通過 ✅
```

### ✅ 階段 2：實現新 ORM（例：Drizzle）

按照 `DRIZZLE_ADAPTER_ROADMAP.md`：

1. **建立適配器目錄**
   ```bash
   mkdir -p src/adapters/Drizzle
   ```

2. **實現 QueryBuilder**
   - `DrizzleQueryBuilder.ts`：實現 `IQueryBuilder` 介面
   - 支援所有方法：where、first、select、insert、update、delete、limit、offset、orderBy、whereBetween、count

3. **實現 DatabaseAccess**
   - `DrizzleDatabaseAdapter.ts`：實現 `IDatabaseAccess` 介面
   - 返回 `DrizzleQueryBuilder` 實例

4. **實現連線檢查**
   - `DrizzleConnectivityCheck.ts`：實現 `IDatabaseConnectivityCheck` 介面

5. **暴露公開 API**
   - `index.ts`：匯出 `createDrizzleDatabaseAccess` 和 `createDrizzleConnectivityCheck`

### ✅ 階段 3：驗證新適配器

在可替換性測試中啟用 Drizzle 測試：

```typescript
// test/integration/adapters/DatabaseAccessSwappability.test.ts

describe('Drizzle DatabaseAccess - 可替換性驗證', () => {
  import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

  createDatabaseAccessSwappabilityTests(
    'Drizzle',
    () => createDrizzleDatabaseAccess()
  )
})
```

```bash
# 執行 Drizzle 適配器測試
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts

# 預期結果：Drizzle 測試也通過 ✅
```

### ✅ 階段 4：驗證 Repository 適配器

實現 Drizzle 版本的 Repository：

```typescript
// src/adapters/Drizzle/Repositories/DrizzleUserRepository.ts

import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import { createDrizzleDatabaseAccess } from '..'
import { User } from '@/Modules/User/Domain/Aggregates/User'

class DrizzleUserRepository implements IUserRepository {
  private db = createDrizzleDatabaseAccess()

  async save(user: User): Promise<void> {
    await this.db.table('users').insert({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: new Date(),
    })
  }

  // 實現其他方法...
}

export function createDrizzleUserRepository(): IUserRepository {
  return new DrizzleUserRepository()
}
```

在可替換性測試中啟用 Drizzle Repository 測試：

```typescript
// test/integration/adapters/RepositorySwappability.test.ts

import { createDrizzleUserRepository } from '@/adapters/Drizzle/Repositories'

describe('User Repository - 可替換性驗證', () => {
  // 現有 Atlas 測試
  it('in-memory 實現應該通過所有測試', async () => {
    const { UserRepository } = await import('@/Modules/User/Infrastructure/Persistence/UserRepository')
    createUserRepositoryTests(() => new UserRepository())
  })

  // 新增 Drizzle 測試
  it('Drizzle 實現應該通過所有測試', async () => {
    const { createDrizzleUserRepository } = await import('@/adapters/Drizzle')
    createUserRepositoryTests(() => createDrizzleUserRepository())
  })
})
```

### ✅ 階段 5：切換生產環境

在 Wiring 層改變導入路徑：

**之前（使用 Atlas）：**
```typescript
// src/wiring/index.ts
import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createGravitoDatabaseAccess()
  container.singleton('postRepository', () => new PostRepository(db))
  // ...
}
```

**之後（使用 Drizzle）：**
```typescript
// src/wiring/index.ts
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'  // ← 只改這行
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createDrizzleDatabaseAccess()  // ← 只改這行
  container.singleton('postRepository', () => new PostRepository(db))
  // ... 其他代碼完全不改！
}
```

### ✅ 階段 6：運行完整測試套件

```bash
# 運行所有適配器測試
bun test test/integration/adapters/

# 運行所有 Wiring 測試
bun test test/integration/wiring/

# 運行整個應用測試
bun test

# 預期結果：所有測試通過 ✅
```

---

## 🔄 常見遷移場景

### 場景 1：Atlas → Drizzle

```bash
# 1. 實現 Drizzle 適配器（參考 DRIZZLE_ADAPTER_ROADMAP.md）
mkdir -p src/adapters/Drizzle
# ... 實現代碼 ...

# 2. 驗證 Drizzle 適配器通過所有測試
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts

# 3. 在 src/wiring/index.ts 中改變導入
- import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
+ import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

# 4. 運行完整測試套件
bun test

# 完成！✅
```

### 場景 2：Atlas → Prisma

完全相同的流程，只需改變適配器名稱：

```bash
mkdir -p src/adapters/Prisma
# 實現 PrismaDatabaseAdapter.ts
# 實現 PrismaQueryBuilder.ts
# ... 等等 ...

# 在 wiring 中改變導入
import { createPrismaDatabaseAccess } from '@/adapters/Prisma'
```

### 場景 3：多個 ORM 並行測試

可以同時對多個 ORM 執行相同測試，確保兼容性：

```typescript
// test/integration/adapters/AllAdaptersSwappability.test.ts

describe('所有 ORM 適配器 - 相同測試套件', () => {
  // Atlas
  createDatabaseAccessSwappabilityTests('Atlas', () => createGravitoDatabaseAccess())

  // Drizzle
  createDatabaseAccessSwappabilityTests('Drizzle', () => createDrizzleDatabaseAccess())

  // Prisma
  createDatabaseAccessSwappabilityTests('Prisma', () => createPrismaDatabaseAccess())
})
```

---

## 📊 成功指標

遷移成功的標記：

| 指標 | 預期 | 驗證方法 |
|-----|------|--------|
| **業務邏輯零改動** | 0 個文件在 Domain/Application 層改動 | `git diff --name-only HEAD~1 src/Modules/` |
| **Repository 通過測試** | 100% 測試通過 | `bun test test/integration/adapters/` |
| **DatabaseAccess 通過測試** | 100% 測試通過 | `bun test test/integration/adapters/` |
| **Container 通過測試** | 100% 測試通過 | `bun test test/integration/wiring/` |
| **應用可啟動** | 應用啟動無錯誤 | `bun run dev` 不拋出錯誤 |
| **基本功能正常** | 所有 API 端點正常 | 執行端到端測試 |

---

## ⚠️ 常見陷阱

### ❌ 陷阱 1：改動業務層代碼

**錯誤**：
```typescript
// ❌ 不要這樣做
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'  // 在業務層導入！

export class UserService {
  private db = createDrizzleDatabaseAccess()  // 業務層耦合 ORM！
}
```

**正確**：
```typescript
// ✅ 正確做法
export class UserService {
  constructor(private repository: IUserRepository) {}  // 只依賴介面
}
```

### ❌ 陷阱 2：忘記實現所有 QueryBuilder 方法

某個方法未實現會導致運行時錯誤：

```typescript
// ❌ 不完整
class DrizzleQueryBuilder implements IQueryBuilder {
  where(...) { /* ... */ }
  first() { /* ... */ }
  // ❌ 忘記實現 select()！
}

// 測試會失敗
await db.table('users').select()  // 錯誤：select is not a function
```

**修復**：確保實現所有必要方法：

```typescript
// ✅ 完整
class DrizzleQueryBuilder implements IQueryBuilder {
  where(...) { /* ... */ }
  first() { /* ... */ }
  select() { /* ... */ }  // ✅ 實現
  insert() { /* ... */ }  // ✅ 實現
  update() { /* ... */ }  // ✅ 實現
  delete() { /* ... */ }  // ✅ 實現
  // ... 所有其他方法
}
```

### ❌ 陷阱 3：忘記更新 Wiring 層

如果忘記在 wiring 層改變導入，應用會使用舊 ORM：

```typescript
// ❌ 忘記改變
import { createGravitoDatabaseAccess } from '@/adapters/Atlas'  // 仍使用 Atlas！

export function wireApplicationDependencies(container: IContainer): void {
  const db = createGravitoDatabaseAccess()  // 仍使用 Atlas
}
```

**修復**：在 wiring 層改變導入：

```typescript
// ✅ 正確
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createDrizzleDatabaseAccess()  // 使用 Drizzle
}
```

---

## 🧪 測試驗證檢查清單

完成 ORM 遷移時，請驗證：

- [ ] 所有 `RepositorySwappability.test.ts` 測試通過
- [ ] 所有 `DatabaseAccessSwappability.test.ts` 測試通過
- [ ] 所有 `ContainerSwappability.test.ts` 測試通過
- [ ] 應用正常啟動（`bun run dev`）
- [ ] 所有 API 端點正常工作
- [ ] 資料庫連線正常（health check `/health` 通過）
- [ ] 沒有在業務層代碼中發現 ORM 特定的導入
- [ ] Git diff 顯示只有適配器層代碼改動

---

## 📚 相關資源

- `docs/ABSTRACTION_RULES.md` - 依賴抽象化規則
- `docs/DRIZZLE_ADAPTER_ROADMAP.md` - Drizzle 實作指南
- `src/adapters/Atlas/README.md` - Atlas 適配器參考
- `test/integration/adapters/` - 所有可替換性測試
- `docs/ARCHITECTURE_DECISIONS.md` - 架構決策文檔

---

## 🎓 最佳實踐

1. **完全依賴倒轉**：業務層只依賴介面，不依賴實現
2. **測試驅動遷移**：先通過測試再切換生產環境
3. **單一導入點**：只在 wiring 層導入 ORM 適配器
4. **鎖定 ORM 版本**：在 package.json 中鎖定版本以避免兼容性問題
5. **逐漸遷移**：可以在一個 Service 通過後再遷移下一個

---

**版本**: 1.0
**最後更新**: 2026-03-10
**狀態**: 🟢 Active
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
import { createRepository, getDatabaseAccess } from '@wiring/RepositoryFactory'
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
