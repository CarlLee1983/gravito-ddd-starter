# Repository 抽象化範本

> 如何實現「ORM 無關」的 Repository，確保依賴隨時可替換

---

## 📐 標準結構

所有 Repository 應遵循以下結構：

```
src/Modules/{Module}/
├── Domain/
│   └── Repositories/
│       └── I{Entity}Repository.ts        ← 公開介面（Domain 層定義）
│
└── Infrastructure/
    └── Repositories/
        └── {Entity}Repository.ts         ← 實現（Infrastructure 層實現）
```

---

## 🎯 三層契約

### 1️⃣ Domain 層：定義介面

**位置**：`src/Modules/{Module}/Domain/Repositories/I{Entity}Repository.ts`

```typescript
/**
 * 用戶資料倉儲介面
 *
 * @public - 所有層都可以使用此介面
 *
 * 定義了應用層與資料層的契約。
 * Application 層只知道這個介面，不知道底層是 Atlas、Drizzle 還是其他 ORM。
 */
import type { IRepository } from '@/Shared/Domain/IRepository'
import type { User } from '../Aggregates/User'

export interface IUserRepository extends IRepository<User> {
  /**
   * 按 Email 查詢用戶
   * @param email - 用戶 email
   * @returns 用戶實體或 null
   */
  findByEmail(email: string): Promise<User | null>

  /**
   * 查詢活躍用戶
   * @returns 所有活躍用戶
   */
  findActive(): Promise<User[]>
}
```

**規則：**
- ✅ 繼承 `IRepository<T>`（基礎 CRUD 操作）
- ✅ 添加業務相關方法（如 `findByEmail`）
- ❌ 不暴露 ORM 特定型別
- ❌ 不涉及實現細節

---

### 2️⃣ Infrastructure 層：實現介面

**位置**：`src/Modules/{Module}/Infrastructure/Repositories/{Entity}Repository.ts`

```typescript
/**
 * 用戶資料倉儲實現 (Atlas ORM)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IDatabaseAccess 使用
 *
 * 實現了 IUserRepository 介面，隱藏所有 ORM 細節。
 * 使用 Atlas 的具體 API，但不在此暴露給上層。
 */
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { User } from '../../Domain/Aggregates/User'

export class UserRepository implements IUserRepository {
  /**
   * 構造函數使用 IDatabaseAccess（ORM 無關介面）
   *
   * ✅ DO: 使用公開介面 IDatabaseAccess
   * ❌ DON'T: 使用 @gravito/atlas 的 DB 物件
   */
  constructor(private db: IDatabaseAccess) {}

  // ============================================
  // 基礎 CRUD 操作（實現 IRepository<User>）
  // ============================================

  /**
   * 保存用戶（新增或更新）
   */
  async save(user: User): Promise<void> {
    // 將 Domain Entity 轉換為資料庫行
    const row = this.toRow(user)

    // 使用 IDatabaseAccess 介面，而不是原生 ORM
    await this.db.table('users').insert(row)
  }

  /**
   * 根據 ID 查詢用戶
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .table('users')
      .where('id', '=', id)        // IDatabaseAccess 風格
      .first()

    return row ? this.toDomain(row) : null
  }

  /**
   * 刪除用戶
   */
  async delete(id: string): Promise<void> {
    await this.db.table('users').where('id', '=', id).delete()
  }

  /**
   * 查詢所有用戶（支援分頁）
   */
  async findAll(params?: { limit?: number; offset?: number }): Promise<User[]> {
    let query = this.db.table('users')

    if (params?.offset) {
      query = query.offset(params.offset)
    }
    if (params?.limit) {
      query = query.limit(params.limit)
    }

    const rows = await query.select()
    return rows.map((row) => this.toDomain(row))
  }

  /**
   * 計算用戶總數
   */
  async count(): Promise<number> {
    return this.db.table('users').count()
  }

  // ============================================
  // 業務相關方法（實現 IUserRepository）
  // ============================================

  /**
   * 按 Email 查詢用戶
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .table('users')
      .where('email', '=', email)
      .first()

    return row ? this.toDomain(row) : null
  }

  /**
   * 查詢活躍用戶
   */
  async findActive(): Promise<User[]> {
    const rows = await this.db
      .table('users')
      .where('status', '=', 'active')
      .select()

    return rows.map((row) => this.toDomain(row))
  }

  // ============================================
  // 私有轉換方法（隱藏資料層細節）
  // ============================================

  /**
   * 將資料庫行轉換為 Domain Entity
   *
   * @private - 內部使用，不暴露給上層
   */
  private toDomain(row: Record<string, unknown>): User {
    return new User(
      row.id as string,
      row.email as string,
      row.name as string,
      row.status as string
    )
  }

  /**
   * 將 Domain Entity 轉換為資料庫行
   *
   * @private - 內部使用，不暴露給上層
   */
  private toRow(user: User): Record<string, unknown> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      created_at: new Date().toISOString(),
    }
  }
}
```

**規則：**
- ✅ 實現 Domain 介面 `IUserRepository`
- ✅ 構造函數接收 `IDatabaseAccess`（公開介面）
- ✅ 使用 `IDatabaseAccess` 進行所有資料庫操作
- ✅ 提供私有的轉換方法 `toRow()` 和 `toDomain()`
- ❌ 不直接 import `@gravito/atlas`
- ❌ 不在方法簽名中暴露 ORM 型別

---

### 3️⃣ Application 層：使用 Repository

**位置**：`src/Modules/{Module}/Application/Services/{Entity}Service.ts`

```typescript
/**
 * 用戶應用服務
 *
 * @public - Application 層的服務
 *
 * 通過 Repository 介面與資料層互動，不知道 ORM 是什麼。
 */
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import type { User } from '../../Domain/Aggregates/User'

export class UserApplicationService {
  /**
   * 構造函數注入 Repository 介面
   *
   * ✅ DO: 依賴 IUserRepository 介面
   * ❌ DON'T: 依賴具體實現或 ORM
   */
  constructor(private userRepository: IUserRepository) {}

  /**
   * 取得用戶（通過 Repository）
   */
  async getUser(id: string): Promise<User | null> {
    // 完全不知道底層如何實現，只知道有這個方法
    return this.userRepository.findById(id)
  }

  /**
   * 通過 Email 取得用戶
   */
  async getUserByEmail(email: string): Promise<User | null> {
    // Repository 的業務方法
    return this.userRepository.findByEmail(email)
  }

  /**
   * 列出所有活躍用戶
   */
  async listActiveUsers(): Promise<User[]> {
    return this.userRepository.findActive()
  }
}
```

**規則：**
- ✅ 只依賴 `IUserRepository` 介面
- ✅ 不知道 Repository 如何實現
- ❌ 不 import `@gravito/atlas` 或其他 ORM
- ❌ 不使用 ORM 特定方法

---

## 🔄 完整範例：User 模組

### 目錄結構

```
src/Modules/User/
├── Domain/
│   ├── Aggregates/
│   │   └── User.ts                      ← Entity 聚合根
│   ├── Repositories/
│   │   └── IUserRepository.ts           ← Repository 介面
│   └── Services/
│       └── UserService.ts               ← Domain Service
│
└── Infrastructure/
    ├── Repositories/
    │   └── UserRepository.ts            ← Repository 實現（ORM 無關）
    ├── Providers/
    │   └── UserServiceProvider.ts       ← 服務註冊
    └── Adapters/
        └── GravitoUserAdapter.ts        ← Framework 適配層
```

### 依賴圖

```
Application Service
    ↓ (depends)
IUserRepository (介面)
    ↑ (implements)
UserRepository (實現)
    ↓ (depends)
IDatabaseAccess (公開介面)
    ↑ (implements)
GravitoDatabaseAdapter (Framework 適配層)
```

---

## ✅ 檢查清單

在實現或重構 Repository 時，使用此清單檢查：

### Domain 層 (Repositories/IXxxRepository.ts)

- [ ] 檔案位於 `Domain/Repositories/`
- [ ] 介面名稱為 `IXxxRepository`
- [ ] 繼承 `IRepository<T>`
- [ ] 只定義介面，無實現
- [ ] 所有方法返回 Domain Entity，不返回 ORM 型別
- [ ] 有詳細的 JSDoc

### Infrastructure 層 (Repositories/XxxRepository.ts)

- [ ] 檔案位於 `Infrastructure/Repositories/`
- [ ] 類名稱為 `XxxRepository`
- [ ] 實現 `IXxxRepository` 介面
- [ ] 構造函數只依賴 `IDatabaseAccess` 或其他公開介面
- [ ] 所有資料庫操作使用 `IDatabaseAccess`
- [ ] 提供 `toDomain()` 和 `toRow()` 轉換方法
- [ ] 沒有 `import` 具體 ORM（如 `@gravito/atlas`）
- [ ] 所有 ORM 細節都隱藏在 Repository 內部

### Application 層 (Services/XxxService.ts)

- [ ] 只依賴 `IXxxRepository` 介面
- [ ] 沒有 `import` 具體 Repository 實現
- [ ] 沒有 `import` ORM
- [ ] 所有資料庫操作都通過 Repository

### 測試層

- [ ] 有 Repository 的單元測試
- [ ] 有 Mock Repository 實現用於 Service 測試
- [ ] 測試不依賴真實的 ORM

---

## 🔀 ORM 遷移指南

如果需要從 Atlas 遷移到另一個 ORM（如 Drizzle），步驟非常簡單：

### 步驟 1：實現新 ORM 的 Database Adapter

```typescript
// src/adapters/Drizzle/DrizzleDatabaseAdapter.ts
import { drizzle } from 'drizzle-orm/...'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export function createDrizzleDatabaseAccess(): IDatabaseAccess {
  const db = drizzle(...)

  return {
    table(name: string) {
      // 實現 IDatabaseAccess 介面
      // 使用 Drizzle 的 API，但暴露為 IDatabaseAccess
      return new DrizzleQueryBuilder(db, name)
    }
  }
}
```

### 步驟 2：更改容器註冊

```typescript
// src/wiring/index.ts
// 改變這一行
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle/DrizzleDatabaseAdapter'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createDrizzleDatabaseAccess()  // ← 改這裡
  container.singleton('db', db)

  // 所有 Repository 無需改動！
  container.singleton('UserRepository', (c) => new UserRepository(c.make('db')))
  // ...
}
```

### 步驟 3：完成！

所有 Repository、Service、Controller 都無需改動。✅

---

## 🚀 最佳實踐

### 1. 單一職責原則

Repository 只負責資料持久化，不要混入業務邏輯：

```typescript
// ❌ 不好：Repository 包含業務邏輯
async findActiveUsers(): Promise<User[]> {
  const users = await this.db.table('users').where('status', '=', 'active').select()

  // ❌ 業務邏輯應在 Service 中
  return users.filter(u => u.lastLoginAt > someDate)
}

// ✅ 好：Repository 只負責資料訪問
async findActiveUsers(): Promise<User[]> {
  const rows = await this.db.table('users').where('status', '=', 'active').select()
  return rows.map(r => this.toDomain(r))
}

// ✅ 業務邏輯在 Service 中
async findRecentlyActiveUsers(sinceDate: Date): Promise<User[]> {
  const users = await this.userRepository.findActive()
  return users.filter(u => u.lastLoginAt > sinceDate)
}
```

### 2. 批量操作

如果需要批量操作，在 Repository 中添加專用方法：

```typescript
// ✅ Repository 介面
export interface IUserRepository extends IRepository<User> {
  saveMany(users: User[]): Promise<void>
  deleteMany(ids: string[]): Promise<void>
}

// ✅ Repository 實現
async saveMany(users: User[]): Promise<void> {
  const rows = users.map(u => this.toRow(u))
  await Promise.all(rows.map(r => this.db.table('users').insert(r)))
  // 或使用 ORM 的批量操作 API
}
```

### 3. 事務支持

如果需要事務，在公開介面中添加：

```typescript
// ✅ src/Shared/Infrastructure/IDatabaseAccess.ts
export interface IDatabaseAccess {
  table(name: string): IQueryBuilder

  // 新增事務方法
  transaction<T>(
    callback: (db: IDatabaseAccess) => Promise<T>
  ): Promise<T>
}

// ✅ Repository 中使用
async transferMoney(fromId: string, toId: string, amount: number): Promise<void> {
  await this.db.transaction(async (txDb) => {
    await txDb.table('accounts').where('id', '=', fromId).update({ balance: -amount })
    await txDb.table('accounts').where('id', '=', toId).update({ balance: +amount })
  })
}
```

### 4. 性能優化

```typescript
// ✅ 在 Repository 中使用 ORM 的效能優化特性
async findUsersWithPosts(): Promise<(User & { posts: Post[] })[]> {
  // 使用 ORM 的 join 或 eager loading
  const rows = await this.db
    .table('users')
    .join('posts', 'users.id', '=', 'posts.user_id')
    .select()

  // 但在返回時仍轉換為 Domain Entity
  return rows.map(r => ({
    ...this.toDomain(r),
    posts: [/* ... */]
  }))
}
```

---

## 📚 參考資源

- `docs/ABSTRACTION_RULES.md` - 依賴抽象化規則
- `docs/DATABASE.md` - 資料庫操作指南
- `src/Modules/User/` - 現有的 User 模組示例
- `src/Modules/Post/` - 現有的 Post 模組示例

---

**版本**: 1.0
**最後更新**: 2026-03-10
**狀態**: 🟢 Active
