# 🛡️ ACL（防腐層）設計與實施指南

**目的**：在模組間設置 ACL 防腐層，保持業務層乾淨，實現模組完全解耦

---

## 📋 核心原則

### 1️⃣ ACL 屬於使用方

```
User 模組（供應方）
    ↓
ACL 防腐層（屬於 Post 模組 ✅）
    ↓
Post 模組（使用方）
```

> **關鍵**：如果 Post 需要 User 資訊，ACL 就在 Post 的 `Infrastructure/Adapters/` 目錄內。

### 2️⃣ Port 由使用方定義

Post 自己定義「我想要什麼」（Port），而不是被迫使用 User 的介面：

```typescript
// ✅ Post 定義自己的 Port（需求）
export interface IAuthorService {
  findAuthor(authorId: string): Promise<AuthorDTO | null>
}

// ✅ Post 定義自己的 DTO（語言）
export interface AuthorDTO {
  id: string
  name: string
  email: string
}
```

### 3️⃣ Adapter 實現 Port

ACL 實現 Post 定義的 Port，並轉換 User 語言為 Post 語言：

```typescript
// ✅ ACL：實現 Port，轉換語言
export class UserToPostAdapter implements IAuthorService {
  constructor(private userRepository: IUserRepository) {}

  async findAuthor(authorId: string): Promise<AuthorDTO | null> {
    const user = await this.userRepository.findById(authorId)
    if (!user) return null

    // 翻譯：User 語言 → Post 語言
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  }
}
```

### 4️⃣ Application 層只依賴 Port

Post 的 Application 層完全不知道 User 的存在：

```typescript
// ✅ Application 層只依賴 Port
export class PostController {
  constructor(
    private postRepository: IPostRepository,
    private authorService: IAuthorService  // ← Port，不知道 User
  ) {}

  async show(ctx: IHttpContext): Promise<Response> {
    const post = await this.postRepository.findById(id)

    // 透過 Port 取得作者，完全不知道來自 User 模組
    const author = await this.authorService.findAuthor(post.userId)

    return ctx.json({
      success: true,
      data: { ...post, author },
    })
  }
}
```

---

## 🏗️ 目錄結構

```
src/Modules/Post/
├── Domain/
│   └── Ports/
│       └── IAuthorService.ts             ← Post Domain 定義的 Port（DDD）
├── Application/
│   └── DTOs/
│       └── PostWithAuthorDTO.ts          ← Post 的複合 DTO
├── Infrastructure/
│   └── Adapters/
│       └── UserToPostAdapter.ts          ← ACL：實現 Port（供應）
├── Presentation/
└── ...
```

**關鍵設計原則**：
- **Domain/Ports** - Domain 層定義它所依賴的抽象
- **Infrastructure/Adapters** - Infrastructure 層實現 Port，具體如何滿足需求
- 依賴方向：Domain → Infrastructure（單向依賴）

---

## 📝 實施步驟

### 步驟 1：在 Domain 層定義 Port（Post/Domain/Ports/）

Domain 層定義它所依賴的抽象（符合 DDD）：

```typescript
// Post/Domain/Ports/IAuthorService.ts

/**
 * Post 模組定義的作者服務介面（Port）
 *
 * 設計重點（DDD）：
 * - 位置：Domain 層（因為 Post Domain 層依賴此介面）
 * - 所有權：Post 自己定義（使用方定義，不被迫用供應方的介面）
 * - 語言：Post 的語言（不暴露 User 的細節）
 * - 沒有外部依賴：只定義 Post 真正需要的欄位
 */

export interface AuthorDTO {
  id: string
  name: string
  email: string
}

export interface IAuthorService {
  findAuthor(authorId: string): Promise<AuthorDTO | null>
}
```

### 步驟 2：定義 DTO（Post/Application/DTOs/）

定義複合 DTO：

```typescript
// Post/Application/DTOs/PostWithAuthorDTO.ts

import type { AuthorDTO } from '../Ports/IAuthorService'

export interface PostDTO {
  id: string
  title: string
  content?: string
  authorId: string
  createdAt: string
}

export interface PostWithAuthorDTO extends PostDTO {
  author: AuthorDTO | null
}
```

### 步驟 3：實現 Adapter（Post/Infrastructure/Adapters/）

供應方適配到使用方的需求：

```typescript
// Post/Infrastructure/Adapters/UserToPostAdapter.ts

import type { IAuthorService, AuthorDTO } from '../../Application/Ports/IAuthorService'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

/**
 * ACL：User 模組 → Post 模組的防腐層
 *
 * 位置：Post 的 Infrastructure 層（使用方）
 * 職責：轉換 User 語言為 Post 語言
 */
export class UserToPostAdapter implements IAuthorService {
  constructor(private readonly userRepository: IUserRepository) {}

  async findAuthor(authorId: string): Promise<AuthorDTO | null> {
    // 從 User 模組的倉庫取得用戶
    const user = await this.userRepository.findById(authorId)
    if (!user) return null

    // 翻譯：User Domain 語言 → Post Domain 語言
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  }
}
```

### 步驟 4：在 Application 層使用 Port

```typescript
// Post/Presentation/Controllers/PostController.ts

export class PostController {
  constructor(
    private repository: IPostRepository,
    private authorService: IAuthorService  // ← 注入 Port
  ) {}

  async show(ctx: IHttpContext): Promise<Response> {
    const post = await this.repository.findById(id)
    if (!post) return ctx.json({ success: false }, 404)

    // 透過 Port 查詢作者（不知道 User）
    const author = await this.authorService.findAuthor(post.userId)

    return ctx.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.userId,
        createdAt: post.createdAt.toISOString(),
        author,
      },
    })
  }
}
```

### 步驟 5：在 Framework 層組裝（Wiring）

```typescript
// Shared/Infrastructure/Framework/GravitoPostAdapter.ts

import { UserToPostAdapter } from '@/Modules/Post/Infrastructure/Adapters/UserToPostAdapter'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'

export function registerPostWithGravito(core: PlanetCore): void {
  const db = createAtlasDatabaseAccess()

  // 組裝 Repository（數據訪問層）
  const postRepository = new PostRepository(db)
  const userRepository = new UserRepository(db)

  // 組裝 ACL（防腐層，實現 Port）
  const authorService = new UserToPostAdapter(userRepository)

  // 組裝 Controller（依賴 Port，不知道 Adapter）
  const controller = new PostController(postRepository, authorService)

  // 註冊路由
  const router = createGravitoModuleRouter(core)
  registerPostRoutes(router, controller)
}
```

---

## 🎯 常見場景

### 場景 1：Port 方法已在 Repository 中

**問題**：`IUserRepository` 已有 `findByEmail()` 方法

**解決**：直接在 ACL 中使用：

```typescript
// Post/Infrastructure/Adapters/UserToPostAdapter.ts

export class UserToPostAdapter implements IAuthorService {
  constructor(private userRepository: IUserRepository) {}

  async findAuthorByEmail(email: string): Promise<AuthorDTO | null> {
    // ✅ 直接使用已有的方法
    const user = await this.userRepository.findByEmail(email)
    if (!user) return null
    return { id: user.id, name: user.name, email: user.email }
  }
}
```

### 場景 2：Port 方法未在 Repository 中

**問題**：需要 `findUsersByPostCategory()`，但 User Repository 沒有

**解決**：在 ACL 層直接使用 `IDatabaseAccess`：

```typescript
// Post/Infrastructure/Adapters/UserToPostAdapter.ts

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class UserToPostAdapter implements IAuthorService {
  constructor(
    private userRepository: IUserRepository,
    private db: IDatabaseAccess  // ← 直接存取 DB
  ) {}

  async findAuthorsByPostCategory(category: string): Promise<AuthorDTO[]> {
    // ✅ 在 ACL 層自己實現複雜查詢，不污染 User Repository
    const users = await this.db
      .table('users')
      .whereIn('id', (qb) =>
        qb.select('user_id')
          .from('posts')
          .where('category', category)
      )
      .get()

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }))
  }
}
```

### 場景 3：改變 User 來源（External API）

**無需改動 Post 模組**，只改 Adapter：

```typescript
// Post/Infrastructure/Adapters/ExternalUserToPostAdapter.ts

import { HttpClient } from '@/Shared/Infrastructure/Http/HttpClient'

export class ExternalUserToPostAdapter implements IAuthorService {
  constructor(private httpClient: HttpClient) {}

  async findAuthor(authorId: string): Promise<AuthorDTO | null> {
    try {
      // 從外部 API 取得用戶
      const response = await this.httpClient.get(`/api/users/${authorId}`)
      return {
        id: response.id,
        name: response.username,
        email: response.contact_email,
      }
    } catch {
      return null
    }
  }
}
```

**Wiring 中切換**：

```typescript
const authorService = process.env.USE_EXTERNAL_API
  ? new ExternalUserToPostAdapter(httpClient)
  : new UserToPostAdapter(userRepository)
```

---

## ✅ 驗證 ACL 設計

### 檢查清單

- [ ] **Port 在 Post 的 Application 層** - 使用方定義需求
- [ ] **Adapter 在 Post 的 Infrastructure 層** - 實現細節隱藏
- [ ] **Post 的 Application 層只依賴 Port** - 不知道 User
- [ ] **跨模組 import 只在 Adapters 層** - 隔離程度最高
- [ ] **DTO 轉換在 Adapter 中** - 防止模組語言混淆
- [ ] **複雜查詢在 Adapter 中實現** - 不污染 User Repository

### 驗證指令

```bash
# 檢查 Post 模組中 User 的依賴位置
grep -r "Modules/User" src/Modules/Post --include="*.ts" | grep -v Adapters

# 預期：無結果（只有 Adapters/ 應該有 User 依賴）
```

---

## 🔄 ORM 變更時的威力

### 場景：Atlas → Drizzle 遷移

**User Repository 實現改變**：

```typescript
// 之前：Atlas
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return this.db.table('users').where('id', id).first()
  }
}

// 改為：Drizzle
import { eq } from 'drizzle-orm'
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    })
  }
}
```

**Post 模組無需改動**：

1. `IUserRepository` 介面不變 → Adapter 無感知
2. `UserToPostAdapter` 邏輯不變 → 沒改
3. `PostController` 完全無感 → 依然正常

**只改：`src/Modules/User/Infrastructure/`**

---

## 📚 最佳實踐

### 1. 命名約定

```
Port:    I<Source>To<Consumer>Service
         (IUserToPostService、IOrderToInventoryService)

Adapter: <Source>To<Consumer>Adapter
         (UserToPostAdapter、OrderToInventoryAdapter)

DTO:     <Domain>DTO
         (AuthorDTO、ProductDTO)
```

### 2. 版本相容性

```typescript
// ✅ 如果 User 新增欄位，Adapter 可自動適配
const user = await this.userRepository.findById(id)
return {
  id: user.id,
  name: user.name,
  email: user.email,
  // 新欄位 `phone` 不會暴露給 Post
}

// ❌ 如果改變 User 的介面，Adapter 需要調整
// 但 Post 的 Application 層無需知道
```

### 3. 錯誤處理

```typescript
async findAuthor(authorId: string): Promise<AuthorDTO | null> {
  try {
    const user = await this.userRepository.findById(authorId)
    if (!user) return null
    return { /* ... */ }
  } catch (error) {
    // ✅ 在 ACL 層吸收來自 User 的錯誤
    console.error('Failed to fetch author:', error)
    return null
  }
}
```

---

## 🎓 學習資源

| 主題 | 參考 |
|------|------|
| 端口和適配器 | [Hexagonal Architecture](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)) |
| 防腐層 | [DDD: Anti-Corruption Layers](https://martinfowler.com/bliki/BoundedContext.html) |
| 模組解耦 | [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) |
| 依賴注入 | [DEPENDENCY_INJECTION_ARCHITECTURE.md](./DEPENDENCY_INJECTION_ARCHITECTURE.md) |

---

## 🔗 相關文檔

- [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) - 分層規則
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 整體架構
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 模組開發
- [WIRING_GUIDE.md](./WIRING_GUIDE.md) - 框架層組裝

---

**最後更新**: 2026-03-11
**示例模組**: Post 模組與 User 模組的 ACL 整合
