# ✅ DDD 實施檢查清單

確保所有新實施都符合 **Domain-Driven Design** 原則，同時避免過度設計。

---

## A. 功能規劃階段

### 需求分析

- [ ] 與業務人員溝通，確認核心業務邏輯
- [ ] 識別 **Bounded Context**（業務邊界）
  - 例：User 是獨立的 BC 嗎？還是 Account BC 的一部分？
- [ ] 識別 **Aggregates**（聚合）
  - 例：User 是聚合根嗎？Profile 是獨立的聚合嗎？
- [ ] 識別 **Entities 和 Value Objects**
  - 例：Email 是 Value Object（無身份、不可變）
  - 例：User 是 Entity（有唯一身份、可變）
- [ ] 識別 **Domain Events**（領域事件）
  - 例：UserCreatedEvent、PasswordChangedEvent

### 是否需要完整 DDD？

並非所有功能都需要完整 DDD。檢查：

- [ ] 功能是否有複雜的業務規則？
  - 是 → 完整 DDD
  - 否 → 簡化版（直接 Repository）
- [ ] 功能是否涉及多個聚合？
  - 是 → 需要 Domain Service、Port、或 Saga
  - 否 → 簡單的 Repository 模式即可
- [ ] 功能是否有狀態機遷移？
  - 是 → 考慮 Value Object 或 Domain Service
  - 否 → 簡單屬性即可

**範例決策**：
- ✅ User 認證 → 完整 DDD（複雜規則、領域事件）
- ✅ Post 文章 → 完整 DDD（聚合根、審計需求）
- ⚠️ Health Check → 簡化 DDD（無複雜邏輯）
- ⚠️ 檔案上傳 → 簡化 DDD（主要是技術細節）

---

## B. 架構設計階段

### 層級規劃

#### Domain 層 (src/Modules/<Module>/Domain/)

- [ ] **已識別聚合根**
  - 命名：`<EntityName>.ts`
  - 例：`User.ts`, `Post.ts`, `Order.ts`
  - [ ] 聚合根有唯一標識符（ID）
  - [ ] 聚合根封裝了業務規則（不是簡單的 getter/setter）

- [ ] **已定義 Value Objects**（如果有）
  - 命名：`<ValueName>.ts` 在 `ValueObjects/` 目錄
  - [ ] Value Object 是不可變的
  - [ ] Value Object 有 `equals()` 方法比較
  - [ ] Value Object 包含驗證邏輯
  - 例：`Email.ts`、`Money.ts`、`Status.ts`

- [ ] **已定義 Domain Services**（如果需要）
  - 命名：`<ServiceName>Service.ts` 在 `Services/` 目錄
  - [ ] Service 包含跨聚合的業務邏輯
  - [ ] Service 不直接修改數據（只決策）
  - 例：`AuthenticationService`、`PaymentService`

- [ ] **已定義 Domain Events**（如果有狀態變化）
  - 位置：`Events/`
  - 命名：`<EventName>Event.ts`
  - [ ] 事件名稱用過去式（UserCreatedEvent，不是UserCreate）
  - [ ] 事件包含重要資訊（userId、timestamp 等）

- [ ] **已定義 Repository 介面**
  - 位置：`Repositories/IXxxRepository.ts`
  - 命名：`I<EntityName>Repository`
  - [ ] 介面定義了業務查詢（findByEmail，不只 findById）
  - [ ] 介面不涉及 SQL（定義的是業務概念）
  - 例：`IUserRepository.findByEmail(email)` 不是 `query('select * where email = ?')`

**Domain 層禁止**：
- ❌ import 任何 ORM（Drizzle、Atlas、Prisma）
- ❌ import Gravito 框架的東西
- ❌ import Infrastructure 層的東西
- ❌ 直接修改數據庫（所有 I/O 透過 Repository）
- ❌ 業務邏輯分散在其他層

#### Application 層 (src/Modules/<Module>/Application/)

- [ ] **已定義 DTOs**
  - 位置：`DTOs/`
  - 命名：`<EntityName>DTO.ts`
  - [ ] DTO 只包含呈現所需的字段
  - [ ] DTO 有 `fromEntity()` 靜態方法（Domain → DTO 轉換）

- [ ] **已定義 Application Services**（如果有複雜流程）
  - 位置：`Services/`
  - 命名：`<UseCaseName>Service.ts` 或 `<CommandName>Handler.ts`
  - [ ] Service 協調 Domain Service、Repository、其他層
  - [ ] Service 只在 Application 層（不在 Domain）
  - 例：`CreateUserService`、`LoginService`

- [ ] **已定義 Port/Interface**（如果模組被其他模組使用）
  - 位置：`Ports/`
  - 命名：`I<ServiceName>.ts`
  - [ ] Port 由使用方定義（不是供應方定義）
  - [ ] Port 隱藏實現細節，只暴露業務接口
  - 例：Post 需要 User 資訊 → Post 定義 `IAuthorService` Port

**Application 層禁止**：
- ❌ import ORM 特定類型（Drizzle schema、Atlas table）
- ❌ 直接使用 ORM API
- ❌ 業務邏輯（應在 Domain）
- ❌ HTTP 相關代碼（屬於 Presentation）

#### Infrastructure 層 (src/Modules/<Module>/Infrastructure/)

- [ ] **已實現 Repository**
  - 位置：`Persistence/` 或 `Repositories/`
  - 命名：`<EntityName>Repository.ts`
  - [ ] 實現了 Domain 層定義的 `I<EntityName>Repository`
  - [ ] 依賴 `IDatabaseAccess`（ORM 無關）
  - [ ] 有 `toDomain()` 和 `toRow()` 轉換方法
  - [ ] 無業務邏輯（只是技術轉換）

- [ ] **已定義 Service Provider**
  - 位置：`Providers/<ModuleName>ServiceProvider.ts`
  - [ ] 註冊所有依賴（Repository、Service、Handler）
  - [ ] 用 `container.singleton()` 做單例
  - [ ] 用 `container.bind()` 做工廠

- [ ] **已定義 Repository Factory**（如果涉及 ORM 選擇）
  - 位置：`Providers/register<Module>Repositories.ts`
  - [ ] 根據 ORM env 選擇實現
  - [ ] 工廠返回 Repository 實例

**Infrastructure 層禁止**：
- ❌ 業務邏輯
- ❌ HTTP 路由邏輯
- ❌ 跨層直接調用（只透過 Port）

#### Presentation 層 (src/Modules/<Module>/Presentation/)

- [ ] **已定義 Controller**
  - 位置：`Controllers/<EntityName>Controller.ts`
  - [ ] 依賴注入所有服務（不 `new` 任何東西）
  - [ ] 方法返回 `Promise<Response>`
  - [ ] 驗證輸入並返回 400 Bad Request
  - [ ] 調用 Application Service 或 Repository
  - [ ] 捕獲異常並返回適當的 HTTP 狀態碼

- [ ] **已定義路由**
  - 位置：`Routes/<EntityName>.routes.ts`
  - [ ] 路由只是映射 HTTP → Controller 方法
  - [ ] 路由無業務邏輯

- [ ] **已定義 Resource**（如果有複雜的回應格式化）
  - 位置：`Resources/<EntityName>Resource.ts`
  - [ ] 將 DTO 轉換為 API 回應格式

**Presentation 層禁止**：
- ❌ 業務邏輯
- ❌ 直接數據庫訪問
- ❌ 複雜的條件邏輯（應在 Application 層）

---

## C. 實施階段

### 編碼規範

- [ ] **不可變性** - 使用 `readonly` 或對象擴展
  ```typescript
  // ✅ 正確
  return { ...user, name: newName }

  // ❌ 錯誤
  user.name = newName
  ```

- [ ] **值物件驗證** - 在構造函數中驗證
  ```typescript
  // ✅ 正確
  export class Email {
    constructor(value: string) {
      if (!value.includes('@')) throw new Error('Invalid email')
      this.value = value
    }
  }

  // ❌ 錯誤
  const email = { value: 'invalid' }  // 無驗證
  ```

- [ ] **聚合根工廠方法** - 使用 `static create()`
  ```typescript
  // ✅ 正確
  const user = User.create('John', 'john@example.com')

  // ❌ 錯誤
  const user = new User()  // 暴露構造函數
  user.name = 'John'
  ```

- [ ] **Repository 命名**
  - `findById(id)` - 按 ID 查詢
  - `findByEmail(email)` - 業務查詢（不是 SQL）
  - `findAll()` - 所有記錄
  - `save(entity)` - 新增或更新
  - `delete(id)` - 刪除
  - `count()` - 計數

- [ ] **異常命名** - 使用語義化命名
  ```typescript
  // ✅ 正確
  throw new UserAlreadyExistsException(email)
  throw new InvalidEmailFormatException(email)

  // ❌ 錯誤
  throw new Error('error')
  throw new Exception('User exists')
  ```

### 依賴方向

檢查沒有逆向依賴：

```
✅ 正確方向：
Presentation → Application → Domain
                              ↑
                        Infrastructure
                        (實現 Domain interfaces)

❌ 錯誤方向：
Domain → Application  ❌ Domain 不能依賴 Application
Domain → Presentation ❌ Domain 不能依賴 Presentation
Domain → ORM          ❌ Domain 不能依賴具體 ORM
```

驗證方法：
```bash
# 檢查 Domain 層 imports
grep -r "import.*from.*Application\|Infrastructure" src/Modules/<Module>/Domain/
# 應該無輸出
```

---

## D. 跨模組集成

### Port & Adapter（防腐層）

如果模組 A 需要使用模組 B：

- [ ] **在 A 中定義 Port**（不是使用 B 的介面）
  ```typescript
  // ✅ A/Domain/Services/IAuthorService.ts
  export interface IAuthorService {
    findAuthor(authorId: string): Promise<AuthorDTO>
  }

  // ❌ 不要直接用 B 的介面
  import { IUserRepository } from '@/Modules/User/...'
  ```

- [ ] **在 A 的 Infrastructure 中實現 Adapter**
  ```typescript
  // A/Infrastructure/Adapters/UserToAuthorAdapter.ts
  export class UserToAuthorAdapter implements IAuthorService {
    constructor(private userRepository: IUserRepository) {}

    async findAuthor(authorId: string): Promise<AuthorDTO> {
      const user = await this.userRepository.findById(authorId)
      return { id: user.id, name: user.name, email: user.email }
    }
  }
  ```

- [ ] **在 A 的 Controller 中使用 Port**
  ```typescript
  // A/Presentation/Controllers/AController.ts
  constructor(
    private repository: IARepository,
    private authorService: IAuthorService  // Port, 不是 IUserRepository
  ) {}
  ```

檢查清單：
- [ ] Port 由使用方（A）定義
- [ ] Adapter 轉換數據格式
- [ ] Application 層只知道 Port，不知道供應方實現
- [ ] 完全解耦 A 和 B

---

## E. 測試階段

### 單元測試（Domain 層）

- [ ] 測試 Aggregate 的業務邏輯
  ```typescript
  describe('User Aggregate', () => {
    it('should create user with valid email', () => {
      const user = User.create('John', 'john@example.com')
      expect(user.email).toBe('john@example.com')
    })

    it('should throw on invalid email', () => {
      expect(() => new Email('invalid')).toThrow()
    })
  })
  ```

- [ ] 測試 Value Objects
  ```typescript
  describe('Email Value Object', () => {
    it('should be equal if same value', () => {
      const email1 = new Email('john@example.com')
      const email2 = new Email('john@example.com')
      expect(email1.equals(email2)).toBe(true)
    })
  })
  ```

- [ ] 測試 Domain Services
  ```typescript
  describe('AuthenticationService', () => {
    it('should generate token for valid user', async () => {
      const token = await authService.authenticate(user, password)
      expect(token).toBeDefined()
    })
  })
  ```

### 整合測試（Application + Infrastructure）

- [ ] Repository 測試（使用 Memory 實現）
  ```typescript
  describe('UserRepository', () => {
    it('should save and retrieve user', async () => {
      const repo = new UserRepository(new MemoryDatabaseAccess())
      const user = User.create('John', 'john@example.com')

      await repo.save(user)
      const found = await repo.findById(user.id)

      expect(found?.email).toBe('john@example.com')
    })
  })
  ```

- [ ] Service 測試
  ```typescript
  describe('CreateUserService', () => {
    it('should create user and persist', async () => {
      const service = new CreateUserService(mockRepository)
      const result = await service.execute(...)
      expect(result.id).toBeDefined()
    })
  })
  ```

### E2E 測試（完整 API）

- [ ] HTTP 端點測試
  ```typescript
  describe('POST /api/users', () => {
    it('should create user via API', async () => {
      const response = await tester.post('/api/users', {
        name: 'John',
        email: 'john@example.com'
      })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBeDefined()
    })
  })
  ```

**測試覆蓋率目標**：
- Domain 層：80%+（核心邏輯）
- Application 層：60%+
- Infrastructure 層：50%+（技術細節）
- Presentation 層：40%+（路由映射）
- 整體：50%+

---

## F. 文檔階段

每個新功能都需要文檔：

- [ ] **API 文檔**
  ```markdown
  ### POST /api/users

  創建新用戶

  **Request**:
  ```json
  { "name": "string", "email": "string" }
  ```

  **Response** (201):
  ```json
  { "success": true, "data": { "id": "...", "name": "..." } }
  ```

  **Errors**:
  - 400: Missing fields
  - 409: User already exists
  ```

- [ ] **概念文檔**（如果是複雜功能）
  - 為什麼需要這個功能
  - 設計思路和決策
  - 未來擴展方向

- [ ] **使用示例**
  ```typescript
  // 示例代碼，展示如何使用
  const user = User.create('John', 'john@example.com')
  await userRepository.save(user)
  ```

- [ ] **架構圖**（如果有複雜的流程）
  ```
  Request → Controller → Service → Repository → DB
  ```

---

## G. 審視清單（Code Review）

在合併前，確保：

### DDD 合規性
- [ ] Domain 層無依賴（除了值物件）
- [ ] 所有業務邏輯都在 Domain 層
- [ ] Repository 介面在 Domain，實現在 Infrastructure
- [ ] 無逆向依賴（沒有 Domain → Infrastructure）
- [ ] 使用了 Port 如果有跨模組依賴

### 代碼質量
- [ ] 無 `any` 類型（除非不得已）
- [ ] 無未使用的依賴
- [ ] 函數長度 < 50 行
- [ ] 類別責任單一
- [ ] 命名清晰（类名、方法名、变量名）

### 測試
- [ ] Domain 層測試 ≥ 80%
- [ ] Application 層測試 ≥ 60%
- [ ] 所有 public 方法有測試
- [ ] 異常情況有測試

### 文檔
- [ ] API 文檔完整
- [ ] 複雜邏輯有註釋
- [ ] 無過時的註釋

---

## 常見錯誤與修正

### ❌ 錯誤 1：Domain 層依賴 ORM

```typescript
// ❌ 錯誤
// User.ts
import { drizzle } from 'drizzle-orm'
const db = drizzle()
const result = await db.select().from(users_table)

// ✅ 正確
// User.ts (Domain)
export class User {
  // 無依賴，純業務邏輯
}

// UserRepository.ts (Infrastructure)
export class UserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}
  // 使用 IDatabaseAccess，不知道是 Drizzle/Atlas
}
```

### ❌ 錯誤 2：Repository 有業務邏輯

```typescript
// ❌ 錯誤
async findValidUsers() {
  const users = await this.db.select().from('users')
  return users.filter(u => u.status === 'active' && u.age >= 18)
}

// ✅ 正確
// 業務邏輯應該在 Domain Service
async findValidUsers() {
  const users = await this.findAll()
  return users.filter(u => u.isActive()) // isActive() 在 User Domain
}
```

### ❌ 錯誤 3：Application Service 有 HTTP 邏輯

```typescript
// ❌ 錯誤
async createUser(req: Request) {
  const body = req.body
  // ... 建立用戶
  res.status(201).json({ data: user })
}

// ✅ 正確
// Service (Application)
async createUser(cmd: CreateUserCommand): Promise<UserDTO> {
  // 無 req/res，只處理業務邏輯
}

// Controller (Presentation)
async store(ctx: IHttpContext) {
  const body = await ctx.getJsonBody()
  const user = await this.createUserService.createUser(body)
  return ctx.json({ success: true, data: user }, 201)
}
```

### ❌ 錯誤 4：直接跨模組調用

```typescript
// ❌ 錯誤
// Post/Application/Services/PostService.ts
import { IUserRepository } from '@/Modules/User/...'

export class PostService {
  constructor(private userRepo: IUserRepository) {}
  // Post 直接知道 User 實現
}

// ✅ 正確
// Post/Domain/Services/IAuthorService.ts
export interface IAuthorService {
  findAuthor(id: string): Promise<AuthorDTO>
}

// Post/Infrastructure/Adapters/UserToPostAdapter.ts
export class UserToPostAdapter implements IAuthorService {
  // Adapter 隱藏 User 實現
}

// Post/Application/Services/PostService.ts
export class PostService {
  constructor(private authorService: IAuthorService) {}
  // Post 只知道 Port，不知道 User
}
```

---

## 自檢工具

### 快速檢查命令

```bash
# 1. 檢查 Domain 層是否有不當 imports
grep -r "import.*from.*Infrastructure\|Presentation\|ORM" src/Modules/*/Domain/

# 2. 檢查 Application 層是否有 ORM
grep -r "drizzle\|prisma\|atlas" src/Modules/*/Application/

# 3. 檢查 Repository 實現是否在 Infrastructure
find src/Modules/*/Domain/Repositories -name "*Repository.ts" | wc -l
# 應該是 0（只有介面）

# 4. 檢查 Repository 實現
find src/Modules/*/Infrastructure -name "*Repository.ts" | wc -l
# 應該有實現

# 5. 檢查測試覆蓋率
bun test --coverage
```

---

## 總結

DDD 實施不是看起來有多"完美"，而是：

✅ **Domain 層**：純業務邏輯，無依賴
✅ **Layers 明確**：清晰的分層責任
✅ **Repository 模式**：所有數據訪問透過介面
✅ **Port & Adapter**：跨模組完全解耦
✅ **測試覆蓋**：關鍵業務有測試
✅ **文檔清晰**：新人能快速理解

❌ **不要**：過度工程化、預先設計未來功能、複雜的設計模式堆砌

---

**使用此清單確保每個新功能都是高質量的 DDD 實現！**

最後更新：2026-03-11
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
src/
├── Shared/
│   └── Application/
│       └── DTOs/
│           └── AuthorDTO.ts              ← 跨 Domain 共享的 DTO
│
└── Modules/Post/
    ├── Domain/
    │   └── Services/
    │       └── IAuthorService.ts         ← Post Domain 定義的 Service（依賴 Shared）
    ├── Application/
    │   └── DTOs/
    │       └── PostWithAuthorDTO.ts      ← Post 的複合 DTO（依賴 Shared）
    ├── Infrastructure/
    │   └── Adapters/
    │       └── UserToPostAdapter.ts      ← ACL：實現 Service Interface（依賴 Shared）
    └── Presentation/
```

**關鍵設計原則**（符合 DDD 規範）：
- **Shared/Application/DTOs** - 跨 Domain 共享的數據結構
- **Domain/Services** - Domain 層定義的服務介面（導入自 Shared）
- **Infrastructure/Adapters** - Infrastructure 層實現 Service Interface（導入自 Shared）
- 依賴方向：清晰單向 → Shared → Domain → Infrastructure → Application（無循環）

---

## 📝 實施步驟

### 步驟 1：在 Domain 層定義 Service Interface（Post/Domain/Services/）

Domain 層定義它所依賴的服務介面（符合 DDD 規範）：

```typescript
// Post/Domain/Services/IAuthorService.ts

/**
 * Post 模組定義的作者服務介面（Domain Service）
 *
 * 設計重點（DDD 規範）：
 * - 位置：Domain/Services/（Domain 層的服務介面）
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
