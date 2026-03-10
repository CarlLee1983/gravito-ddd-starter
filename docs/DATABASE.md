# 資料庫操作指南

本指南介紹如何使用 Gravito DDD Starter 中的資料庫相關工具，參考 Laravel Artisan 設計原則。

## 📋 指令速查表

### Migration 指令

| 指令 | 說明 |
|------|------|
| `bun run migrate` | 執行所有待執行的 migration |
| `bun run migrate:status` | 查看 migration 執行狀態 |
| `bun run migrate:rollback` | 回滾最後一批執行的 migration |
| `bun run migrate:fresh` | 清除所有表並重新執行所有 migration（危險操作） |
| `bun run make:migration <name>` | 建立新的 migration 檔案 |

### Seeder 指令

| 指令 | 說明 |
|------|------|
| `bun run seed` | 執行所有 seeder |
| `bun run db:fresh` | 執行 `migrate:fresh` 再執行 `seed`（一鍵重置） |

### 診斷與工具

| 指令 | 說明 |
|------|------|
| `bun run db:doctor` | 診斷資料庫連線狀態 |
| `bun run generate:types` | 從 Model 產生 TypeScript 型別 |

---

## 🔄 Migration 工作流程

### 建立 Migration

```bash
# 使用 atlas 建立新的 migration
bun run make:migration create_posts_table

# 或手動在 database/migrations/ 建立：
# 001_create_posts_table.ts
```

### Migration 檔案格式

```typescript
import { sql } from 'drizzle-orm'
import type { AtlasOrbit } from '@gravito/atlas'

export async function up(db: AtlasOrbit): Promise<void> {
  await db.connection.execute(sql`
    CREATE TABLE IF NOT EXISTS posts (
      id          TEXT      NOT NULL PRIMARY KEY,
      title       TEXT      NOT NULL,
      content     TEXT,
      user_id     TEXT      NOT NULL,
      created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
}

export async function down(db: AtlasOrbit): Promise<void> {
  await db.connection.execute(sql`DROP TABLE IF EXISTS posts`)
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

**Q：如何為現有模組新增資料庫支援？**

1. 建立 migration 檔案：`database/migrations/NNN_create_table_name.ts`
2. 修改 Repository 類別，使其接收 `IDatabaseAccess` constructor 參數
3. 執行 `bun run migrate`
