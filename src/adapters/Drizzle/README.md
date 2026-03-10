# Drizzle ORM 適配器

> Gravito Drizzle ORM 的 ORM-無關適配實現

---

## 📍 位置

```
src/adapters/Drizzle/
├── config.ts                          ← Drizzle 連線配置
├── schema.ts                          ← 資料庫 Schema 定義
├── DrizzleQueryBuilder.ts             ← 核心實現（QueryBuilder）
├── DrizzleDatabaseAdapter.ts          ← DatabaseAccess 實現
├── DrizzleConnectivityCheck.ts        ← 連線檢查實現
├── index.ts                           ← 公開 API 匯出
└── README.md                          ← 此檔案
```

---

## 🎯 職責

此適配器的職責是：

1. **實現公開介面**：將 Drizzle ORM 的 API 適配為：
   - `IDatabaseAccess` - ORM 無關的資料庫訪問介面
   - `IDatabaseConnectivityCheck` - 連線檢查介面

2. **隱藏 ORM 細節**：所有 Drizzle 特定的 API 都在此模組內隱藏

3. **提供工廠函數**：
   - `createDrizzleDatabaseAccess()` - 建立資料庫訪問實例
   - `createDrizzleConnectivityCheck()` - 建立連線檢查實例

---

## 📦 公開 API

```typescript
/**
 * 建立資料庫訪問實例（使用 Drizzle ORM）
 */
export function createDrizzleDatabaseAccess(): IDatabaseAccess

/**
 * 建立資料庫連線檢查實例（使用 Drizzle ORM）
 */
export function createDrizzleConnectivityCheck(): IDatabaseConnectivityCheck
```

---

## 🔄 使用示例

### 在 Wiring 層中使用

```typescript
// src/wiring/index.ts

import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'

export function wireApplicationDependencies(container: IContainer): void {
  // 建立資料庫訪問實例
  const db = createDrizzleDatabaseAccess()

  // 註冊為單例
  container.singleton('db', () => db)

  // Repository 依賴此實例
  container.singleton('postRepository', (c) => new PostRepository(c.make('db')))
}
```

### 在 Repository 中使用

```typescript
// src/Modules/Post/Infrastructure/Repositories/PostRepository.ts

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'

export class PostRepository implements IPostRepository {
  constructor(private db: IDatabaseAccess) {}

  async findById(id: string): Promise<Post | null> {
    const row = await this.db.table('posts').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }

  async findAll(): Promise<Post[]> {
    const rows = await this.db.table('posts').select()
    return rows.map((row) => this.toDomain(row))
  }

  async save(post: Post): Promise<void> {
    const row = this.toRow(post)
    await this.db.table('posts').insert(row)
  }

  private toDomain(row: any): Post {
    return new Post(row.id, row.title, row.content, row.user_id)
  }

  private toRow(post: Post) {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      user_id: post.userId,
    }
  }
}
```

### 在應用層中使用

```typescript
// src/Modules/Post/Application/Services/CreatePostService.ts

import type { IPostRepository } from '@/Modules/Post/Domain/Repositories/IPostRepository'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'

export class CreatePostService {
  constructor(private repository: IPostRepository) {}

  async execute(title: string, content: string, userId: string): Promise<Post> {
    const post = new Post(crypto.randomUUID(), title, content, userId)
    await this.repository.save(post)
    return post
  }
}
```

---

## 🔧 架構細節

### 查詢建構器鏈

Drizzle 適配器支援完整的查詢建構器鏈：

```typescript
const db = createDrizzleDatabaseAccess()

// 簡單查詢
const users = await db.table('users').select()

// 帶條件的查詢
const admin = await db.table('users')
  .where('email', '=', 'admin@example.com')
  .first()

// 複雜查詢（含分頁、排序）
const activePosts = await db.table('posts')
  .where('status', '=', 'published')
  .where('user_id', '=', userId)
  .orderBy('created_at', 'desc')
  .limit(10)
  .offset(0)
  .select()

// 計數
const totalPosts = await db.table('posts')
  .where('user_id', '=', userId)
  .count()

// 範圍查詢
const recentPosts = await db.table('posts')
  .whereBetween('created_at', [startDate, endDate])
  .select()
```

### WHERE 運算子

支援的運算子：

| 運算子 | 描述 | 例子 |
|-------|------|------|
| `=` | 等於 | `.where('id', '=', userId)` |
| `!=` / `<>` | 不等於 | `.where('status', '!=', 'deleted')` |
| `>` | 大於 | `.where('price', '>', 100)` |
| `<` | 小於 | `.where('price', '<', 100)` |
| `>=` | 大於等於 | `.where('age', '>=', 18)` |
| `<=` | 小於等於 | `.where('age', '<=', 65)` |
| `like` | 模糊匹配 | `.where('name', 'like', '%john%')` |
| `in` | 集合匹配 | `.where('status', 'in', ['active', 'pending'])` |

---

## 📋 實現清單

此適配器實現了以下公開介面：

### ✅ IDatabaseAccess

- `table(name: string): IQueryBuilder` - 取得表的查詢建構器

### ✅ IQueryBuilder

- `where(column, operator, value): IQueryBuilder` - WHERE 條件
- `first(): Promise<Record>` - 取得單筆記錄
- `select(): Promise<Record[]>` - 取得多筆記錄
- `insert(data): Promise<void>` - 新增記錄
- `update(data): Promise<void>` - 更新記錄
- `delete(): Promise<void>` - 刪除記錄
- `limit(n): IQueryBuilder` - 限制記錄數
- `offset(n): IQueryBuilder` - 分頁偏移
- `orderBy(column, direction): IQueryBuilder` - 排序
- `whereBetween(column, range): IQueryBuilder` - 範圍查詢
- `count(): Promise<number>` - 計數

### ✅ IDatabaseConnectivityCheck

- `ping(): Promise<boolean>` - 檢查連線

---

## 🚀 環境配置

### 環境變數

```bash
# 資料庫連線 URL
DATABASE_URL=file:local.db

# 或使用遠端 Turso 資料庫
DATABASE_URL=libsql://your-database-url.turso.io?authToken=your-token
```

### 初始化

```bash
# 安裝依賴
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit

# 執行 migrations（當添加新表時）
bun run migrate
```

---

## 🧪 測試

### 執行可替換性測試

```bash
# 測試 DatabaseAccess 適配器
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts

# 測試 Repository
bun test test/integration/adapters/RepositorySwappability.test.ts

# 測試 DI 容器
bun test test/integration/wiring/ContainerSwappability.test.ts
```

### 預期結果

所有測試應該通過，表示：
- ✅ Drizzle 適配器完全實現了 IDatabaseAccess 介面
- ✅ QueryBuilder 支援所有必要的操作
- ✅ 連線檢查正常運作
- ✅ 可以無縫替換其他 ORM

---

## 🔄 切換到其他 ORM

若要切換到 Prisma、TypeORM 等其他 ORM，只需改變導入：

```typescript
// 改這一行
- import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
+ import { createPrismaDatabaseAccess } from '@/adapters/Prisma'

// 改這一行
- const db = createDrizzleDatabaseAccess()
+ const db = createPrismaDatabaseAccess()

// 完成！所有其他代碼無需改動
```

---

## 📊 遷移到 Drizzle 的步驟

1. **安裝依賴**
   ```bash
   bun add drizzle-orm @libsql/client
   bun add -d drizzle-kit
   ```

2. **建立 Schema** - 在 `schema.ts` 中定義所有表

3. **更新 Wiring** - 在 `src/wiring/index.ts` 改變導入：
   ```typescript
   - import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
   + import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
   ```

4. **執行測試** - 確認所有可替換性測試通過

5. **部署** - 更新資料庫並啟動應用

---

## ⚠️ 已知限制

1. **SQLite 限制**：當前使用 LibSQL/SQLite，不支援某些進階功能
2. **複雜查詢**：非常複雜的查詢可能需要使用 `rawSQL()` 或直接 SQL
3. **交易**：當前版本未實現交易支援

---

## 📚 相關資源

- `docs/ORM_MIGRATION_GUIDE.md` - ORM 遷移指南
- `docs/DRIZZLE_ADAPTER_ROADMAP.md` - 實作路線圖
- `src/adapters/Atlas/README.md` - Atlas 適配器參考
- `src/Shared/Infrastructure/IDatabaseAccess.ts` - 公開介面定義
- `test/integration/adapters/` - 可替換性測試

---

## 🎓 設計原則

此適配器遵循以下設計原則：

1. **完全隱藏 ORM**：外部代碼無法直接訪問 Drizzle 的 API
2. **介面-based**：所有公開 API 都通過定義好的介面
3. **工廠模式**：通過工廠函數建立實例，便於模擬測試
4. **最小化依賴**：只暴露必要的功能，保持介面簡潔
5. **易於擴展**：新 ORM 適配器遵循相同模式

---

**版本**: 1.0
**狀態**: 🟡 開發中
**最後更新**: 2026-03-10
