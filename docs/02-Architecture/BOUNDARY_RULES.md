# 架構邊界規則

本文檔定義了 gravito-ddd 模組間的邊界規則，確保清晰的依賴關係，防止架構衰退。

> **要點**: 架構邊界由自動化工具 `bun run boundaries` 強制執行。

---

## 📋 6 條核心規則

### RULE-1: Domain 層禁止 import 任何他 Module

**規則說明**:
- Domain 層是業務邏輯的核心，應完全獨立
- 不允許對他模組的任何依賴，即使是相同的 ValueObject 也應本地定義

**❌ 錯誤**:
```typescript
// ❌ User Domain 禁止 import Post Domain
import type { PostId } from '@/Modules/Post/Domain'

export class User {
  favoritePostIds: PostId[] // 違規
}
```

**✅ 正確**:
```typescript
// ✅ User Domain 僅定義自己的概念
export class User {
  favoritePostIds: string[] // Post ID 用字串表示
}
```

### RULE-2: Application 層禁止 import 任何他 Module（含 DTOs）

**規則說明**:
- Application 層的 Service 和 DTO 應獨立於他模組
- 跨模組通訊應透過 Port/Adapter（基礎設施層）進行

**❌ 錯誤**:
```typescript
// ❌ Post Application 禁止 import User DTOs
import type { AuthorDTO } from '@/Modules/User'

export class GetPostService {
  async execute(postId: string): Promise<PostWithAuthorDTO> {
    const author = await this.authorService.findById(post.authorId)
    // 直接使用 User 的 AuthorDTO → 違規
    return { ...post, author }
  }
}
```

**✅ 正確**:
```typescript
// ✅ Post Application 定義自己的 DTO
export interface PostAuthorDTO {
  id: string
  name: string
  email: string
}

export class GetPostService {
  async execute(postId: string): Promise<PostWithAuthorDTO> {
    const authorData = await this.authorService.findById(post.authorId)
    // 轉換為本地 DTO
    return {
      ...post,
      author: {
        id: authorData.id,
        name: authorData.name,
        email: authorData.email,
      }
    }
  }
}
```

### RULE-3: 任何層禁止 import 他 Module 的 Presentation

**規則說明**:
- Presentation 層（Controller、Routes）是對外介面，不應被他模組直接依賴
- 需要跨模組通訊應使用 Application Service 或 Port

**❌ 錯誤**:
```typescript
// ❌ 禁止 import 他模組的 Controller
import { UserController } from '@/Modules/User/Presentation/Controllers/UserController'
```

**✅ 正確**:
```typescript
// ✅ 使用 Application Service 或 Port
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'
```

### RULE-4: 任何層禁止 import 他 Module 的 Infrastructure（非 Adapters）

**規則說明**:
- Infrastructure 層（Repository 實現、Providers）是具體實現細節，應隱藏
- 他模組只應看到 Port 介面或 Adapter
- **例外**: Adapters 可被他模組 import（ACL 模式）

**❌ 錯誤**:
```typescript
// ❌ 禁止 import 他模組的 Repository 實現
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'

// ❌ 禁止 import 他模組的 ServiceProvider
import { UserServiceProvider } from '@/Modules/User/Infrastructure/Providers/UserServiceProvider'
```

**✅ 正確**:
```typescript
// ✅ 使用 Port 介面
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'

// ✅ 在 Adapter 中實現跨模組邏輯
import { UserToPostAdapter } from '@/Modules/User/Infrastructure/Adapters/UserToPostAdapter'
```

### RULE-5: Infrastructure（非 Adapters）禁止 import 他 Module Domain

**規則說明**:
- Infrastructure 層（Repository、Provider）應依賴於自己的 Domain 層
- 不允許依賴他模組的業務邏輯

**❌ 錯誤**:
```typescript
// ❌ User Repository 禁止 import Post Domain
import type { Post } from '@/Modules/Post/Domain/Aggregates/Post'

export class UserRepository {
  async findUserWithPosts() {
    // 違規：直接依賴 Post Domain
  }
}
```

**✅ 正確**:
```typescript
// ✅ 使用 Port 介面或通用型別
export class UserRepository {
  async findUserWithPostIds(): Promise<{ userId: string; postIds: string[] }> {
    // Post 只表示為字串 ID
  }
}
```

### RULE-6: Health 模組禁止 import 任何業務模組

**規則說明**:
- Health 是跨切面關注（Cross-Cutting Concern），應完全獨立
- 不允許依賴 User、Post、Session、Order、Product、Cart 等業務模組

**❌ 錯誤**:
```typescript
// ❌ Health 禁止 import 業務模組
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'

export class HealthService {
  async check(): Promise<HealthStatus> {
    const userCount = await this.userRepository.count() // 違規
  }
}
```

**✅ 正確**:
```typescript
// ✅ Health 使用通用 Port（如 IHealthCheck）
import type { IHealthCheck } from '@/Shared/Infrastructure/Ports/Core/IHealthCheck'

export class HealthService {
  constructor(private healthChecks: IHealthCheck[]) {}

  async check(): Promise<HealthStatus> {
    // 執行各個 HealthCheck（由業務模組實現）
  }
}
```

---

## 🎯 白名單與例外

### ACL 模式 - Adapters 可被他模組 import

**場景**: 模組 A 需要使用模組 B 的資料進行轉換

**允許**:
```typescript
// ✅ 允許 import 他模組的 Adapter（ACL 實現）
import { UserToPostAdapter } from '@/Modules/User/Infrastructure/Adapters/UserToPostAdapter'
```

**原因**: Adapters 是為跨模組通訊設計的防腐層，明確表示跨模組依賴。

---

## 🔍 自動化檢查

### 運行邊界檢查

```bash
# 檢查所有邊界違規
bun run boundaries

# 檢查前進行所有驗證（typecheck + lint + boundaries + test）
bun run check
```

### 輸出示例

```
❌ 發現 2 個邊界違規：

📄 app/Modules/Session/Presentation/Controllers/AuthController.ts
   12:0 【RULE-2】Session Application 層禁止 import User Module
   └─ 不應 import 他 Module：@/Modules/User/Domain/Repositories/IUserRepository

📄 app/Modules/Post/Application/DTOs/PostWithAuthorDTO.ts
   7:0 【RULE-2】Post Application 層禁止 import User Module
   └─ 不應 import 他 Module：@/Modules/User
```

### Pre-commit Hook

邊界檢查已整合到 Git pre-commit hook。提交時自動執行：

```bash
git add .
git commit -m "feat: update user service"
# 自動檢查：format → lint → type → boundary → test
```

如果有邊界違規，提交會被拒絕：

```
🔍 Running pre-commit checks...
  → Running format check... ✓
  → Running lint check... ✓
  → Running type check... ✓
  → Running boundary check... ❌
  ❌ Boundary check failed!
  💡 Check your module imports
```

---

## 📚 常見問題與解決方案

### Q: 我需要在 Post 模組中查詢用戶資料怎麼辦？

**A**: 使用 Port/Adapter 模式

```typescript
// ✅ 定義 Port（在 Shared/Infrastructure/Ports）
export interface IAuthorService {
  findById(userId: string): Promise<AuthorInfo | null>
}

// ✅ User 模組實現 Adapter
export class UserToPostAdapter implements IAuthorService {
  constructor(private userRepository: IUserRepository) {}

  async findById(userId: string): Promise<AuthorInfo | null> {
    const user = await this.userRepository.findById(userId)
    return user ? { id: user.id, name: user.name.value } : null
  }
}

// ✅ Post 模組注入使用
export class GetPostService {
  constructor(private authorService: IAuthorService) {}

  async execute(postId: string) {
    // 不知道 User 模組實現，只用 Port 介面
    const author = await this.authorService.findById(post.authorId)
  }
}
```

### Q: Application 層不能 import 他模組的 DTO，那我怎麼回傳複合資料？

**A**: 在本地定義相同結構的 DTO（概念型態複製）

```typescript
// ✅ Post 模組本地定義 PostAuthorDTO
export interface PostAuthorDTO {
  id: string
  name: string
  email: string
}

export interface PostWithAuthorDTO {
  id: string
  title: string
  author: PostAuthorDTO | null
}

// ✅ 在 Service 中進行轉換
export class GetPostService {
  async execute(postId: string): Promise<PostWithAuthorDTO> {
    const post = await this.postRepository.findById(postId)
    const authorData = await this.authorService.findById(post.authorId)

    return {
      id: post.id,
      title: post.title,
      author: authorData ? {
        id: authorData.id,
        name: authorData.name,
        email: authorData.email
      } : null
    }
  }
}
```

### Q: 為什麼 Domain 層需要完全獨立？

**A**: 確保業務邏輯的可重用性和可測試性

1. **獨立演進**: 各模組的 Domain 可獨立改進，不受他模組影響
2. **易於測試**: Domain 實體和值物件無外部依賴，單元測試簡單
3. **跨平台移植**: 相同的 Domain 邏輯可用於 Web、API、CLI 等不同平台
4. **清晰責任**: Domain 層只關注業務規則，不知道持久化、通訊等

---

## 🛠️ 修復已違規的模組

如果發現現有代碼違反邊界規則，修復步驟：

1. **確定違規類型** - 運行 `bun run boundaries` 識別規則
2. **選擇修復模式** - Port/Adapter 或概念型態複製
3. **實現修復** - 按上述範例進行重構
4. **驗證** - 運行 `bun run check` 確認修復成功

### 修復範例：Session 模組 AuthController

**問題**: AuthController 直接 import `IUserRepository`

```typescript
// ❌ 違反 RULE-3（import 他模組 Domain）
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
```

**修復步驟**:

1. 新建 Port 介面 `IUserProfileService`
```typescript
export interface IUserProfileService {
  findById(userId: string): Promise<UserProfileResult | null>
}
```

2. User 模組實現 Adapter
```typescript
export class UserProfileAdapter implements IUserProfileService {
  constructor(private userRepository: IUserRepository) {}

  async findById(userId: string): Promise<UserProfileResult | null> {
    const user = await this.userRepository.findById(userId)
    return user ? { id: user.id, name: user.name.value, email: user.email.value } : null
  }
}
```

3. Session 模組改用 Port
```typescript
// ✅ 改為依賴 Port
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'

export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private userProfileService: IUserProfileService  // 改為 Port
  ) {}

  async me(ctx: IHttpContext) {
    const userProfile = await this.userProfileService.findById(userId)
    return ctx.json({ success: true, data: userProfile })
  }
}
```

---

## 📖 相關文檔

- [模組開發指南](./MODULE_GUIDE.md)
- [抽象化規則](./ABSTRACTION_RULES.md)
- [Port/Adapter 設計](../06-Adapters-Wiring/ADAPTERS_AND_EXTENSIONS.md)
- [DDD 架構](./ARCHITECTURE.md)
