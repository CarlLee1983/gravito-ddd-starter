# 依賴抽象化規則 (Abstraction Rules)

**目的**：確保應用層與基礎設施層清晰分離，使 ORM 可隨時被替換

**願景**：從 Atlas → Drizzle/Prisma/TypeORM 時，僅改動 `adapters/` 層，不影響業務層

---

## 📍 分層定義

```
┌─────────────────────────────────────┐
│   Domain + Application Layers       │ ← 業務邏輯（不知道 ORM 存在）
│   (Entities, Services, Use Cases)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Infrastructure Layer (Adapters)   │ ← ORM 適配層（只能改這裡）
│   (Repositories, Adapters)          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Access Layer                 │ ← ORM 具體實現（可替換）
│   (@gravito/atlas, Drizzle, etc.)   │
└─────────────────────────────────────┘
```

---

## ✅ DO's - 允許的做法

### 1. Domain 層

```typescript
// ✅ Domain Entity - 只知道自己的邏輯
export class User {
  private readonly id: string
  private readonly email: string
  private readonly name: string

  constructor(id: string, email: string, name: string) {
    if (!email.includes('@')) throw new Error('Invalid email')
    this.id = id
    this.email = email
    this.name = name
  }

  getEmail(): string {
    return this.email
  }
}

// ✅ Domain Repository Interface - 定義契約，不知道實現
export interface IUserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}

// ✅ Domain Service - 使用 Repository 介面
export class UserService {
  constructor(private repo: IUserRepository) {}

  async getUser(id: string): Promise<User | null> {
    return this.repo.findById(id)
  }
}
```

### 2. Application 層

```typescript
// ✅ 只依賴 IDatabaseAccess（ORM 無關介面）
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class UserApplicationService {
  constructor(
    private db: IDatabaseAccess,
    private userService: UserService
  ) {}

  async createUser(dto: CreateUserDTO): Promise<User> {
    // 使用 IDatabaseAccess 介面，不知道底層是 Atlas 還是 Drizzle
    const user = User.create(dto.email, dto.name)
    await this.db.table('users').insert(...)
    return user
  }
}
```

### 3. Infrastructure 層

```typescript
// ✅ 只在 Infrastructure 層導入 @gravito/atlas
import { DB } from '@gravito/atlas'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

// ✅ Repository 實現 Domain 介面，使用 IDatabaseAccess
export class UserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', id).first()
    return row ? this.toDomain(row) : null
  }

  private toDomain(row: Record<string, unknown>): User {
    return new User(row.id as string, row.email as string, row.name as string)
  }
}

// ✅ Adapter 實現公開介面
export function createGravitoDatabaseAccess(): IDatabaseAccess {
  return DB as unknown as IDatabaseAccess
}
```

### 4. Migration 層

```typescript
// ✅ 使用 SchemaBuilder（ORM 無關）
import type { AtlasOrbit } from '@gravito/atlas'
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
  await createTable(db, 'users', (t) => {
    t.id()
    t.string('email').notNull().unique()
    t.string('name').notNull()
    t.timestamps()
  })
}

export async function down(db: AtlasOrbit): Promise<void> {
  await dropTableIfExists(db, 'users')
}
```

### 5. Routes & 依賴注入

```typescript
// ✅ Wiring 層決定使用哪個 Adapter
import { createGravitoDatabaseAccess } from '@/adapters/Atlas/GravitoDatabaseAdapter'
import { UserRepository } from '@/Modules/User/Infrastructure/Repositories/UserRepository'

export function registerUserModule(container: Container): void {
  // 注入 IDatabaseAccess 介面的 Atlas 實現
  const db = createGravitoDatabaseAccess()
  container.bind('db', db)
  container.bind('UserRepository', new UserRepository(db))
}

// 未來：只需改成 Drizzle
// import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle/DrizzleDatabaseAdapter'
// const db = createDrizzleDatabaseAccess()
```

---

## ❌ DON'Ts - 禁止的做法

### 1. ❌ Domain 層導入 ORM

```typescript
// ❌ 禁止：Domain 層知道具體 ORM
import { DB } from '@gravito/atlas'

export class UserService {
  async getUser(id: string) {
    // 直接用 Atlas 的 API
    return DB.table('users').where('id', id).first()
  }
}

// 原因：Domain 層應該完全獨立，換 ORM 時需要改 Domain 層代碼
```

### 2. ❌ Application 層直接用 ORM 特定型別

```typescript
// ❌ 禁止：Application 層依賴具體 ORM
import { type DrizzleDatabase } from 'drizzle-orm'

export class UserController {
  constructor(private db: DrizzleDatabase) {
    // 被 Drizzle 鎖定，換 ORM 時無法使用
  }
}

// ✅ 應該：
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class UserController {
  constructor(private db: IDatabaseAccess) {
    // ORM 無關，可隨時替換
  }
}
```

### 3. ❌ 在多個地方實現同一個 Adapter

```typescript
// ❌ 禁止：分散的 Adapter 實現
// src/modules/User/UserAdapter.ts
export function getUserDB() { return createGravitoDatabaseAccess() }

// src/modules/Post/PostAdapter.ts
export function getPostDB() { return createGravitoDatabaseAccess() }

// ✅ 應該：統一的 Adapter 實現
// src/adapters/Atlas/GravitoDatabaseAdapter.ts
export function createGravitoDatabaseAccess() { ... }
```

### 4. ❌ 混用 SchemaBuilder 和原始 SQL

```typescript
// ❌ 禁止：同一個 migration 中混用風格
export async function up(db: AtlasOrbit): Promise<void> {
  // 部分用 SchemaBuilder
  await createTable(db, 'users', (t) => {
    t.id()
    t.string('email')
  })

  // 部分用原始 SQL（風格不一致）
  await db.connection.execute(sql`CREATE INDEX idx_email ON users(email)`)
}

// ✅ 應該：優先用 SchemaBuilder，複雜操作用 rawSQL
export async function up(db: AtlasOrbit): Promise<void> {
  await createTable(db, 'users', (t) => {
    t.id()
    t.string('email').notNull()
  })

  // 複雜操作才用 rawSQL，但保持清晰
  await rawSQL(db, 'CREATE INDEX idx_email ON users(email) WHERE deleted_at IS NULL')
}
```

### 5. ❌ Repository 暴露 ORM 特定方法

```typescript
// ❌ 禁止：Repository 洩漏 ORM 實現細節
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    // 暴露 Atlas 特定的 .where() 方法
    const row = await this.db.table('users').where('id', id).first()
    return row
  }

  // ❌ 多出來的 ORM 特定方法
  async findByAtlasQuery(query: any) {
    return this.db.raw(query)
  }
}

// ✅ 應該：只實現 IUserRepository 介面
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .table('users')
      .where('id', '=', id)  // IDatabaseAccess 風格，not .where('id', id)
      .first()
    return row ? this.toDomain(row) : null
  }

  // 沒有多出來的 ORM 特定方法
}
```

---

## 🔍 檢查清單

在提交 PR 時，檢查以下項目：

### Domain 層檢查

- [ ] 沒有 import `@gravito/*`、`drizzle-orm`、`prisma` 等 ORM
- [ ] 所有 Repository 都是介面定義，沒有實現
- [ ] Entity 沒有任何數據庫相關邏輯

### Application 層檢查

- [ ] 沒有直接 import `@gravito/*` 或其他 ORM
- [ ] 只使用 `IDatabaseAccess` 或其他公開介面
- [ ] Service 通過 Dependency Injection 接收 Repository

### Infrastructure 層檢查

- [ ] 所有 ORM 導入都在 `src/adapters/{ORM}/` 目錄下
- [ ] Repository 實現了對應的 Domain 介面
- [ ] Adapter 實現了公開介面（IDatabaseAccess、IXxxRepository）

### Migration 層檢查

- [ ] 使用 `SchemaBuilder` 定義表結構
- [ ] 複雜操作使用 `rawSQL()`，不混用 SQL 和 SchemaBuilder
- [ ] Migration 不依賴應用層邏輯

---

## 🛠️ 違反規則時的修復指南

### 案例 1：Domain 層導入 ORM

```typescript
// ❌ 現狀
import { DB } from '@gravito/atlas'

export class UserService {
  async find(id: string) {
    return DB.table('users').where('id', id).first()
  }
}

// ✅ 修復
export class UserService {
  constructor(private repo: IUserRepository) {}

  async find(id: string): Promise<User | null> {
    return this.repo.findById(id)
  }
}
```

### 案例 2：混用 ORM 特定型別

```typescript
// ❌ 現狀
export class OrderService {
  constructor(
    private db: DrizzleDatabase,  // ← Drizzle 特定型別
    private redis: RedisClient
  ) {}
}

// ✅ 修復
export class OrderService {
  constructor(
    private db: IDatabaseAccess,  // ← 公開介面
    private redis: IRedisService
  ) {}
}
```

### 案例 3：Repository 暴露 ORM 方法

```typescript
// ❌ 現狀
export class OrderRepository {
  async findComplex(filter: any) {
    // 直接暴露 Atlas 的 SQL 查詢語法
    return this.db.raw(`SELECT * FROM orders WHERE ${filter}`)
  }
}

// ✅ 修復
export class OrderRepository implements IOrderRepository {
  async findByStatus(status: string): Promise<Order[]> {
    return this.db
      .table('orders')
      .where('status', '=', status)  // IDatabaseAccess 風格
      .select()
  }
}
```

---

## 📊 規則遵循評分

使用以下標準評估代碼質量：

| 層級 | Domain 隔離 | ORM 隱藏 | 介面一致 | 評分 |
|------|-----------|---------|---------|------|
| ⭐⭐⭐⭐⭐ | 完全隔離 | 完全隱藏 | 完全一致 | 可隨時換 ORM |
| ⭐⭐⭐⭐ | 隔離良好 | 隱藏良好 | 基本一致 | 換 ORM 需小改 |
| ⭐⭐⭐ | 部分隔離 | 部分隱藏 | 部分一致 | 換 ORM 需大改 |
| ⭐⭐ | 隔離不足 | 隱藏不足 | 不一致 | 難以換 ORM |
| ⭐ | 無隔離 | 無隱藏 | 混亂 | ❌ 無法換 ORM |

**目標**：所有代碼達到 ⭐⭐⭐⭐⭐ 或 ⭐⭐⭐⭐ 級別

---

## 📚 參考資源

- `docs/ARCHITECTURE_DECISIONS.md` - 架構決策背景
- `docs/IMPLEMENTATION_PLAN.md` - 完整實施計畫
- `docs/DATABASE.md` - 數據庫操作指南
- `src/Shared/Infrastructure/IDatabaseAccess.ts` - 公開介面定義
- `src/adapters/Atlas/` - 當前 Atlas adapter 參考實現

---

## 🛡️ 跨模組 ACL（防腐層）

當一個模組需要另一個模組的資訊時，使用 ACL 防腐層隔離兩個模組。

### 原則

1. **ACL 屬於使用方** — 如果 Post 需要 User 資訊，ACL 在 Post 的 `Infrastructure/Adapters/`
2. **Port 由使用方定義** — Post 定義 `IAuthorService`（我需要什麼）
3. **Adapter 實現 Port** — ACL 實現 Port，並轉換供應方的語言

### 範例結構

```
User 模組（供應方）
  └─ IUserRepository（User 的介面）
      └─ findById(id): Promise<User>

Post 模組（使用方）
  ├─ Application/Ports/
  │   └─ IAuthorService.ts (Post 定義：我需要什麼)
  └─ Infrastructure/Adapters/
      └─ UserToPostAdapter.ts (ACL 實現：如何適配)
          ├─ 呼叫 userRepository.findById()
          └─ 轉換為 AuthorDTO { id, name, email }
```

### DO's

```typescript
// ✅ Post 定義自己的 Port（需求）
// src/Modules/Post/Application/Ports/IAuthorService.ts
export interface IAuthorService {
  findAuthor(authorId: string): Promise<AuthorDTO | null>
}

// ✅ ACL 實現 Port（在 Post 的 Infrastructure 層）
// src/Modules/Post/Infrastructure/Adapters/UserToPostAdapter.ts
export class UserToPostAdapter implements IAuthorService {
  constructor(private userRepository: IUserRepository) {}

  async findAuthor(authorId: string): Promise<AuthorDTO | null> {
    const user = await this.userRepository.findById(authorId)
    if (!user) return null
    // 翻譯：User 語言 → Post 語言
    return { id: user.id, name: user.name, email: user.email }
  }
}

// ✅ Application 層只依賴 Port
// src/Modules/Post/Presentation/Controllers/PostController.ts
export class PostController {
  constructor(
    private postRepository: IPostRepository,
    private authorService: IAuthorService  // ← Port
  ) {}

  async show(ctx: IHttpContext): Promise<Response> {
    const post = await this.postRepository.findById(id)
    const author = await this.authorService.findAuthor(post.userId)
    // Post 完全不知道 User 存在
    return ctx.json({ success: true, data: { ...post, author } })
  }
}
```

### DON'Ts

```typescript
// ❌ 禁止：在 Post 的 Application 層直接使用 User Repository
export class PostService {
  constructor(
    private postRepository: IPostRepository,
    private userRepository: IUserRepository  // ← 跨模組耦合！
  ) {}

  async getPostWithAuthor(id: string) {
    const post = await this.postRepository.findById(id)
    const user = await this.userRepository.findById(post.userId)
    // Post 知道 User 的實現細節
  }
}

// ❌ 禁止：在 src/Adapters/ 中放 ACL
// src/Adapters/ProductShop/ProductToShopAdapter.ts  ← 錯誤位置
// 應該改為：src/Modules/Post/Infrastructure/Adapters/UserToPostAdapter.ts

// ❌ 禁止：污染 User Repository 介面
// src/Modules/User/Domain/Repositories/IUserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findUsersByPostCategory(category: string): Promise<User[]>  // ← 污染！
  findAuthorsByPostId(postId: string): Promise<User[]>  // ← 污染！
}

// 改為：在 ACL 層自己實現這些複雜查詢
export class UserToPostAdapter implements IAuthorService {
  constructor(
    private userRepository: IUserRepository,
    private db: IDatabaseAccess
  ) {
    // ✅ 複雜查詢不污染 User Repository
    const users = await this.db
      .table('users')
      .whereIn('id', (qb) => qb.select('user_id').from('posts').where('category', category))
      .get()
  }
}
```

### 驗證 ACL 設計

檢查跨模組依賴的位置：

```bash
# 應該只在 Adapters/ 中有 User 依賴
grep -r "Modules/User" src/Modules/Post --include="*.ts" | grep -v Adapters

# 預期：無結果
```

詳見 [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md)

---

## ❓ 常見問題

### Q: 如果我需要 ORM 特定功能怎麼辦？

**A**: 有兩個選項：

1. 在 `IDatabaseAccess` 中添加新方法
   ```typescript
   // src/Shared/Infrastructure/IDatabaseAccess.ts
   export interface IDatabaseAccess {
     table(name: string): IQueryBuilder
     transaction(callback: (db: IDatabaseAccess) => Promise<void>): Promise<void>
     // ← 新方法
   }
   ```

2. 建立專用的 adapter 介面
   ```typescript
   // src/Shared/Infrastructure/ITransactionSupport.ts
   export interface ITransactionSupport {
     transaction(callback: () => Promise<void>): Promise<void>
   }
   ```

### Q: 可以混用 SchemaBuilder 和 SQL 嗎？

**A**: 可以，但要有紀律：

- 常見操作用 `SchemaBuilder`（id、string、timestamps 等）
- 複雜操作用 `rawSQL()`（索引、約束、複雜邏輯）
- 同一個 migration 中不要混用兩種方式寫同一個操作

### Q: 舊代碼違反規則怎麼辦？

**A**: 漸進式重構：

1. **立即修復** - 新代碼必須遵守規則（Phase 1-3）
2. **監控** - 標記現有違反規則的代碼
3. **計畫重構** - 在下個 sprint 逐步改善舊代碼

---

**最後更新**: 2026-03-10
**版本**: 1.0
**狀態**: 🟢 Active
