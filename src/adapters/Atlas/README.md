# Atlas ORM 適配器

> Gravito Atlas ORM 的 ORM-無關適配實現

---

## 📍 位置

```
src/adapters/Atlas/
├── GravitoDatabaseAdapter.ts    ← 核心實現
├── index.ts                      ← 公開 API 匯出
└── README.md                     ← 此檔案
```

---

## 🎯 職責

此適配器的職責是：

1. **實現公開介面**：將 Atlas ORM 的 API 適配為：
   - `IDatabaseAccess` - ORM 無關的資料庫訪問介面
   - `IDatabaseConnectivityCheck` - 連線檢查介面

2. **隱藏 ORM 細節**：所有 Atlas 特定的 API 都在此模組內隱藏

3. **提供工廠函數**：
   - `createGravitoDatabaseAccess()` - 建立資料庫訪問實例
   - `createGravitoDatabaseConnectivityCheck()` - 建立連線檢查實例

---

## 📦 公開 API

```typescript
/**
 * 建立資料庫訪問實例（使用 Atlas ORM）
 */
export function createGravitoDatabaseAccess(): IDatabaseAccess

/**
 * 建立資料庫連線檢查實例（使用 Atlas ORM）
 */
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck
```

---

## 🔄 使用示例

### 在 Wiring 層中使用

```typescript
// src/wiring/index.ts

import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export function wireApplicationDependencies(container: IContainer): void {
  // 建立資料庫訪問實例
  const db = createGravitoDatabaseAccess()

  // 註冊為單例
  container.singleton('db', () => db)

  // 所有 Repository 都依賴此實例
  container.singleton('UserRepository', (c) => new UserRepository(c.make('db')))
  container.singleton('PostRepository', (c) => new PostRepository(c.make('db')))
}
```

### 切換到其他 ORM

若要切換到 Drizzle ORM，只需改變導入：

```typescript
// 改這一行
- import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
+ import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

// 改這一行
- const db = createGravitoDatabaseAccess()
+ const db = createDrizzleDatabaseAccess()

// 完成！所有其他代碼無需改動
```

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

## 🔌 如何實現新的 ORM 適配器

要新增對其他 ORM（如 Drizzle、Prisma）的支持，請按以下步驟：

### 1️⃣ 建立新的適配器資料夾

```bash
mkdir -p src/adapters/Drizzle
```

### 2️⃣ 實現公開介面

```typescript
// src/adapters/Drizzle/DrizzleDatabaseAdapter.ts

import { drizzle } from 'drizzle-orm/...'
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'

/**
 * Drizzle ORM 的查詢建構器實現
 */
class DrizzleQueryBuilder implements IQueryBuilder {
  constructor(
    private db: any,  // Drizzle DB 實例
    private table: string
  ) {}

  where(column: string, operator: string, value: unknown): IQueryBuilder {
    // 使用 Drizzle 的 API 實現 where
    // ...
    return this
  }

  async first(): Promise<Record<string, unknown> | null> {
    // 使用 Drizzle 取得單筆記錄
    // ...
  }

  // 實現其他方法...
}

/**
 * 建立 Drizzle 資料庫訪問實例
 */
export function createDrizzleDatabaseAccess(): IDatabaseAccess {
  const db = drizzle(...)

  return {
    table(name: string): IQueryBuilder {
      return new DrizzleQueryBuilder(db, name)
    }
  }
}

/**
 * 建立 Drizzle 連線檢查實例
 */
export function createDrizzleDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
  const db = drizzle(...)

  return {
    async ping(): Promise<boolean> {
      try {
        await db.execute('SELECT 1')
        return true
      } catch {
        return false
      }
    }
  }
}
```

### 3️⃣ 建立索引檔案

```typescript
// src/adapters/Drizzle/index.ts

export { createDrizzleDatabaseAccess, createDrizzleDatabaseConnectivityCheck } from './DrizzleDatabaseAdapter'
```

### 4️⃣ 更新 Wiring

```typescript
// src/wiring/index.ts
- import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
+ import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

export function wireApplicationDependencies(container: IContainer): void {
  - const db = createGravitoDatabaseAccess()
  + const db = createDrizzleDatabaseAccess()
  // ...
}
```

### 5️⃣ 完成！

所有其他代碼（Repository、Service、Controller）無需改動。

---

## 🧪 測試新適配器

建議使用以下方式測試新適配器：

```typescript
// test/adapters/DrizzleDatabaseAdapter.test.ts

import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

describe('DrizzleDatabaseAdapter', () => {
  let db: IDatabaseAccess

  beforeEach(() => {
    db = createDrizzleDatabaseAccess()
  })

  it('should create table', async () => {
    const result = await db.table('test_users').select()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should insert record', async () => {
    await db.table('test_users').insert({ id: '1', name: 'Test' })
    const user = await db.table('test_users').where('id', '=', '1').first()
    expect(user).toBeDefined()
  })

  // ... 更多測試
})
```

---

## 📚 相關資源

- `docs/ABSTRACTION_RULES.md` - 依賴抽象化規則
- `docs/DATABASE.md` - 資料庫操作指南
- `src/Shared/Infrastructure/IDatabaseAccess.ts` - 公開介面定義
- `src/Modules/*/Infrastructure/Repositories/` - Repository 實現範例

---

## 🎯 設計原則

此適配器遵循以下設計原則：

1. **完全隱藏 ORM**：外部代碼無法直接訪問 Atlas 的 API
2. **介面-based**：所有公開 API 都通過定義好的介面
3. **工廠模式**：通過工廠函數建立實例，便於模擬測試
4. **最小化依賴**：只暴露必要的功能，保持介面簡潔

---

**版本**: 1.0
**最後更新**: 2026-03-10
**狀態**: 🟢 Active
