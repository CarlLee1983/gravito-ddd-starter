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
