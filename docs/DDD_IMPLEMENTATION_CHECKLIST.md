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
