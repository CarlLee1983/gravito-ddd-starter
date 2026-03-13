# 測試指南 (Testing Guide)

完整的測試策略、框架使用和最佳實踐。

## 概述

本專案採用 **三層測試策略**:

1. **Unit Tests** - 單獨測試領域層邏輯 (Domain Layer)
2. **Integration Tests** - 測試層與層之間的互動
3. **Feature Tests** - 測試完整的 API 端點

**目標**: 80%+ 代碼覆蓋率

---

## 測試框架

### Bun Test

使用 Bun 原生測試框架 (類似 Node.js 的 test module):

```typescript
import { describe, it, expect } from 'bun:test'

describe('User', () => {
  it('should create a new user', () => {
    const user = new User('John')
    expect(user.name).toBe('John')
  })
})
```

### 運行測試

```bash
# 運行所有測試
bun test

# 運行特定目錄
bun test tests/Unit/

# 運行單個文件
bun test tests/Unit/User/User.test.ts

# 監視模式 (文件更改時自動運行)
bun test --watch

# 詳細輸出
bun test --verbose

# 過濾測試 (執行名稱匹配的測試)
bun test --filter "User"
```

### 測試文件位置

```
tests/
├── Unit/              # 單元測試 (Domain 層)
│   └── User/
│       ├── User.test.ts
│       ├── UserEmail.test.ts
│       └── UserRepository.test.ts
├── Integration/       # 集成測試 (多層互動)
│   └── User/
│       ├── CreateUserService.test.ts
│       └── UserRepository.test.ts
└── Feature/           # 功能測試 (API 端點)
    └── User/
        └── UserAPI.test.ts
```

---

## Unit Tests - 單元測試

測試 Domain 層的邏輯，**不依賴外部服務**。

### Value Object 測試

```typescript
// tests/Unit/User/UserEmail.test.ts
import { describe, it, expect } from 'bun:test'
import { UserEmail } from '../../../src/Modules/User/Domain/ValueObjects/UserEmail'

describe('UserEmail Value Object', () => {
  // ✅ 有效的電子郵件
  it('should create valid email', () => {
    const email = new UserEmail('john@example.com')
    expect(email.value).toBe('john@example.com')
  })

  // ✅ 拒絕無效格式
  it('should reject invalid email format', () => {
    expect(() => {
      new UserEmail('invalid-email')
    }).toThrow('Invalid email format')
  })

  // ✅ 拒絕空值
  it('should reject empty email', () => {
    expect(() => {
      new UserEmail('')
    }).toThrow('Email cannot be empty')
  })

  // ✅ 值相等性
  it('should consider equal emails as equal', () => {
    const email1 = new UserEmail('john@example.com')
    const email2 = new UserEmail('john@example.com')
    expect(email1.equals(email2)).toBe(true)
  })

  // ✅ 值不相等性
  it('should consider different emails as not equal', () => {
    const email1 = new UserEmail('john@example.com')
    const email2 = new UserEmail('jane@example.com')
    expect(email1.equals(email2)).toBe(false)
  })

  // ✅ 字符串轉換
  it('should convert to string', () => {
    const email = new UserEmail('john@example.com')
    expect(email.toString()).toBe('john@example.com')
  })
})
```

### Entity 測試

```typescript
// tests/Unit/User/User.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { User } from '../../../src/Modules/User/Domain/Entities/User'
import { UserEmail } from '../../../src/Modules/User/Domain/ValueObjects/UserEmail'
import { UserStatus } from '../../../src/Modules/User/Domain/ValueObjects/UserStatus'

describe('User Entity', () => {
  let user: User

  // ✅ 設置測試前置條件
  beforeEach(() => {
    user = User.create({
      name: 'John Doe',
      email: new UserEmail('john@example.com'),
      status: UserStatus.active()
    })
  })

  // ✅ 測試構造
  it('should create a new user with active status', () => {
    expect(user.name).toBe('John Doe')
    expect(user.email.value).toBe('john@example.com')
    expect(user.status.value).toBe('active')
    expect(user.id).toBeDefined()
    expect(user.createdAt).toBeDefined()
  })

  // ✅ 測試業務邏輯
  it('should deactivate user', () => {
    user.deactivate()
    expect(user.status.value).toBe('inactive')
  })

  // ✅ 測試驗證
  it('should not deactivate already inactive user', () => {
    user.deactivate()
    expect(() => {
      user.deactivate()
    }).toThrow('User is already inactive')
  })

  // ✅ 測試不可變性
  it('should not allow direct property mutation', () => {
    const originalEmail = user.email.value
    // ❌ 不應該能直接修改
    // user.email = new UserEmail('fake@example.com')
    // 而是應該通過方法
    user.changeEmail(new UserEmail('new@example.com'))
    expect(user.email.value).toBe('new@example.com')
    expect(user.email.value).not.toBe(originalEmail)
  })
})
```

### Domain Service 測試

```typescript
// tests/Unit/User/UserDomainService.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { UserDomainService } from '../../../src/Modules/User/Domain/Services/UserDomainService'
import { InMemoryUserRepository } from '../Mocks/InMemoryUserRepository'

describe('UserDomainService', () => {
  let service: UserDomainService
  let repository: InMemoryUserRepository

  beforeEach(() => {
    repository = new InMemoryUserRepository()
    service = new UserDomainService(repository)
  })

  // ✅ 測試跨多個聚合根的業務邏輯
  it('should find all active users', async () => {
    // 設置數據
    await repository.save(User.create({ name: 'John', status: 'active' }))
    await repository.save(User.create({ name: 'Jane', status: 'inactive' }))

    // 執行
    const activeUsers = await service.findActiveUsers()

    // 驗證
    expect(activeUsers).toHaveLength(1)
    expect(activeUsers[0].name).toBe('John')
  })

  // ✅ 測試錯誤情況
  it('should throw error when bulk updating with insufficient stock', async () => {
    // 設置
    const users = [user1, user2]

    // 執行並驗證
    expect(async () => {
      await service.bulkDeactivate(users.map(u => u.id))
    }).toThrow('Cannot bulk deactivate users')
  })
})
```

---

## Integration Tests - 集成測試

測試 Repository + Application Service + Domain 的互動。

### Repository 測試

```typescript
// tests/Integration/User/UserRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createApp } from '@/app'
import { PlanetCore } from '@gravito/core'
import { UserRepository } from '../../../src/Modules/User/Infrastructure/Repositories/UserRepository'
import { User } from '../../../src/Modules/User/Domain/Entities/User'
import { UserEmail } from '../../../src/Modules/User/Domain/ValueObjects/UserEmail'

describe('UserRepository Integration', () => {
  let core: PlanetCore
  let repository: UserRepository

  // ✅ 初始化測試環境
  beforeEach(async () => {
    core = await createApp()
    const db = core.get('db')
    repository = new UserRepository(db)
  })

  // ✅ 清理測試環境
  afterEach(async () => {
    // 清理測試數據
    const db = core.get('db')
    await db.table('users').truncate()
  })

  // ✅ 測試保存和檢索
  it('should save and retrieve user', async () => {
    const user = User.create({
      name: 'John Doe',
      email: new UserEmail('john@example.com'),
      status: UserStatus.active()
    })

    await repository.save(user)
    const retrieved = await repository.findById(user.id)

    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('John Doe')
    expect(retrieved?.email.value).toBe('john@example.com')
  })

  // ✅ 測試按郵件查找
  it('should find user by email', async () => {
    const user = User.create({
      name: 'John Doe',
      email: new UserEmail('john@example.com'),
      status: UserStatus.active()
    })

    await repository.save(user)
    const found = await repository.findByEmail(new UserEmail('john@example.com'))

    expect(found).toBeDefined()
    expect(found?.id).toBe(user.id)
  })

  // ✅ 測試更新
  it('should update user', async () => {
    const user = User.create({
      name: 'John Doe',
      email: new UserEmail('john@example.com'),
      status: UserStatus.active()
    })

    await repository.save(user)

    user.changeEmail(new UserEmail('newemail@example.com'))
    await repository.save(user)

    const updated = await repository.findById(user.id)
    expect(updated?.email.value).toBe('newemail@example.com')
  })

  // ✅ 測試刪除
  it('should delete user', async () => {
    const user = User.create({
      name: 'John Doe',
      email: new UserEmail('john@example.com'),
      status: UserStatus.active()
    })

    await repository.save(user)
    await repository.delete(user.id)

    const found = await repository.findById(user.id)
    expect(found).toBeNull()
  })

  // ✅ 測試列表
  it('should list all users', async () => {
    const user1 = User.create({ /* ... */ })
    const user2 = User.create({ /* ... */ })

    await repository.save(user1)
    await repository.save(user2)

    const users = await repository.findAll()
    expect(users).toHaveLength(2)
  })

  // ✅ 測試過濾
  it('should filter users by status', async () => {
    const activeUser = User.create({
      /* active */
    })
    const inactiveUser = User.create({
      /* inactive */
    })

    await repository.save(activeUser)
    await repository.save(inactiveUser)

    const active = await repository.findAll({ status: 'active' })
    expect(active).toHaveLength(1)
    expect(active[0].status.value).toBe('active')
  })
})
```

### Application Service 測試

```typescript
// tests/Integration/User/CreateUserService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createApp } from '@/app'
import { CreateUserService } from '../../../src/Modules/User/Application/Services/CreateUserService'
import { AppException } from '@/Shared/Application/AppException'

describe('CreateUserService Integration', () => {
  let core: PlanetCore
  let service: CreateUserService

  beforeEach(async () => {
    core = await createApp()
    service = new CreateUserService(core)
  })

  afterEach(async () => {
    // 清理
    const db = core.get('db')
    await db.table('users').truncate()
  })

  // ✅ 測試成功創建
  it('should create user successfully', async () => {
    const result = await service.execute({
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active'
    })

    expect(result.id).toBeDefined()
    expect(result.name).toBe('John Doe')
    expect(result.email).toBe('john@example.com')
    expect(result.status).toBe('active')
  })

  // ✅ 測試業務規則驗證
  it('should reject duplicate email', async () => {
    // 創建第一個用戶
    await service.execute({
      name: 'John Doe',
      email: 'john@example.com'
    })

    // 嘗試創建相同郵件的用戶
    expect(async () => {
      await service.execute({
        name: 'Jane Doe',
        email: 'john@example.com'
      })
    }).toThrow(AppException)
  })

  // ✅ 測試無效輸入
  it('should reject invalid email', async () => {
    expect(async () => {
      await service.execute({
        name: 'John Doe',
        email: 'invalid-email',
        status: 'active'
      })
    }).toThrow()
  })

  // ✅ 測試缺少必填字段
  it('should require name', async () => {
    expect(async () => {
      await service.execute({
        name: '',
        email: 'john@example.com'
      })
    }).toThrow()
  })
})
```

---

## Feature Tests - 功能測試

測試完整的 HTTP 端點，需要運行應用。

```typescript
// tests/Feature/User/UserAPI.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createApp } from '@/app'
import { PlanetCore } from '@gravito/core'

describe('User API Endpoints', () => {
  let core: PlanetCore
  const baseUrl = 'http://localhost:3000'

  beforeEach(async () => {
    core = await createApp()
    // 確保數據庫已初始化
  })

  afterEach(async () => {
    // 清理
  })

  // ✅ 測試創建用戶
  it('POST /api/users should create user', async () => {
    const response = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.id).toBeDefined()
  })

  // ✅ 測試獲取用戶列表
  it('GET /api/users should list users', async () => {
    const response = await fetch(`${baseUrl}/api/users`)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  // ✅ 測試獲取單個用戶
  it('GET /api/users/:id should get user', async () => {
    // 先創建用戶
    const createResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', email: 'john@example.com' })
    })
    const created = await createResponse.json()
    const userId = created.data.id

    // 然後檢索
    const response = await fetch(`${baseUrl}/api/users/${userId}`)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.id).toBe(userId)
  })

  // ✅ 測試 404
  it('GET /api/users/:id should return 404 for non-existent user', async () => {
    const response = await fetch(`${baseUrl}/api/users/non-existent-id`)
    expect(response.status).toBe(404)
  })

  // ✅ 測試更新
  it('PATCH /api/users/:id should update user', async () => {
    const createResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', email: 'john@example.com' })
    })
    const created = await createResponse.json()
    const userId = created.data.id

    const response = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane' })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.name).toBe('Jane')
  })

  // ✅ 測試刪除
  it('DELETE /api/users/:id should delete user', async () => {
    const createResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', email: 'john@example.com' })
    })
    const created = await createResponse.json()
    const userId = created.data.id

    const response = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(204)
  })
})
```

---

## Mock 和 Fixtures

### In-Memory Repository Mock

```typescript
// tests/Mocks/InMemoryUserRepository.ts
import { IUserRepository } from '../../../src/Modules/User/Domain/Repositories/IUserRepository'
import { User } from '../../../src/Modules/User/Domain/Entities/User'

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user)
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id)
  }
}
```

### Test Fixtures

```typescript
// tests/Fixtures/UserFixtures.ts
import { User } from '../../../src/Modules/User/Domain/Entities/User'
import { UserEmail } from '../../../src/Modules/User/Domain/ValueObjects/UserEmail'

export class UserFixtures {
  static createUser(overrides?: Partial<UserProps>): User {
    return User.create({
      name: 'John Doe',
      email: new UserEmail('john@example.com'),
      status: UserStatus.active(),
      ...overrides
    })
  }

  static createMultipleUsers(count: number): User[] {
    return Array.from({ length: count }, (_, i) =>
      this.createUser({
        name: `User ${i + 1}`,
        email: new UserEmail(`user${i + 1}@example.com`)
      })
    )
  }
}
```

---

## 測試覆蓋率

### 檢查覆蓋率

```bash
# Bun 有內置的覆蓋率支持
bun test --coverage

# 生成覆蓋率報告
bun test --coverage --coverage-reporter=lcov
```

### 覆蓋率目標

```
Domain Layer (業務邏輯):    100%
Application Layer:         85%+
Infrastructure Layer:      80%+
Presentation Layer:        70%+
整體:                      80%+
```

---

## 最佳實踐

### 1. 一個測試一個概念

```typescript
// ❌ 錯誤: 測試多個概念
it('should create user and validate email', () => {
  const user = User.create({ email: 'john@example.com' })
  expect(user.email.value).toBe('john@example.com')
  expect(user.email.isVerified).toBe(false)
})

// ✅ 正確: 分離測試
it('should create user with unverified email', () => {
  const user = User.create({ email: 'john@example.com' })
  expect(user.email.value).toBe('john@example.com')
})

it('should mark email as unverified by default', () => {
  const user = User.create({ email: 'john@example.com' })
  expect(user.email.isVerified).toBe(false)
})
```

### 2. 測試行為，不是實現

```typescript
// ❌ 錯誤: 測試實現細節
it('should have a _verified private field', () => {
  const email = new UserEmail('john@example.com')
  expect(email._verified).toBe(false)
})

// ✅ 正確: 測試行為
it('should not be verified on creation', () => {
  const email = new UserEmail('john@example.com')
  expect(email.isVerified()).toBe(false)
})
```

### 3. 清晰的測試名稱

```typescript
// ❌ 不清晰
it('should work', () => { })

// ✅ 清晰
it('should reject email if format is invalid', () => { })
it('should create user with active status', () => { })
it('should not allow deactivating already inactive user', () => { })
```

### 4. 使用 beforeEach 和 afterEach

```typescript
describe('UserRepository', () => {
  let repository: UserRepository

  // ✅ 每個測試前初始化
  beforeEach(async () => {
    repository = new UserRepository(db)
  })

  // ✅ 每個測試後清理
  afterEach(async () => {
    await db.table('users').truncate()
  })

  // 現在不用在每個測試中重複初始化
})
```

---

## 常見問題

**Q: Unit 測試需要數據庫嗎?**
A: 否。使用 Mock Repository。Database 是 Integration 測試的事。

**Q: Feature 測試是否必需?**
A: 建議，但不是強制。對於 API 項目，Feature 測試驗證端到端流程。

**Q: 如何處理異步代碼?**
A: 使用 `async/await`:

```typescript
it('should find user by email', async () => {
  const user = await repository.findByEmail('john@example.com')
  expect(user).toBeDefined()
})
```

---

## 相關資源

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統設計
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 模組創建

---

**測試是品質的保證。編寫好的測試，然後大膽重構！**
# API 設計規範 (API Guidelines)

遵循 REST 最佳實踐的 API 設計標準。

## 目錄

- [URL 和路由](#url-和路由)
- [HTTP 方法](#http-方法)
- [請求格式](#請求格式)
- [響應格式](#響應格式)
- [狀態碼](#狀態碼)
- [錯誤處理](#錯誤處理)
- [分頁](#分頁)
- [過濾和排序](#過濾和排序)
- [版本管理](#版本管理)
- [安全性](#安全性)
- [代碼範例](#代碼範例)

---

## URL 和路由

### 命名規範

所有 API 路由應以 `/api` 開頭，後跟資源名稱。

```
/api/<resource>           # 列表和創建
/api/<resource>/<id>      # 獲取、更新、刪除
/api/<resource>/<id>/<sub-resource>  # 子資源
```

### 資源名稱

使用 **複數的小寫名稱**，用連字符連接多個單詞：

```
✅ 正確
/api/users
/api/user-profiles
/api/product-categories
/api/payment-transactions

❌ 錯誤
/api/User
/api/user_profile
/api/UserProfile
/api/getUsers
```

### 完整 URL 範例

```
GET    /api/users                      # 列表所有用戶
POST   /api/users                      # 創建用戶
GET    /api/users/123                  # 獲取特定用戶
PATCH  /api/users/123                  # 更新用戶
DELETE /api/users/123                  # 刪除用戶
GET    /api/users/123/orders           # 用戶的訂單
POST   /api/users/123/orders           # 為用戶創建訂單
GET    /api/users/123/orders/456       # 特定用戶的特定訂單
```

---

## HTTP 方法

### 方法對應表

| 方法 | 用途 | 冪等性 | 安全 | 示例 |
|------|------|--------|------|------|
| GET | 檢索資源 | ✅ | ✅ | GET /api/users/123 |
| POST | 創建新資源 | ❌ | ❌ | POST /api/users |
| PATCH | 部分更新 | ❌ | ❌ | PATCH /api/users/123 |
| PUT | 完全替換 (不推薦) | ✅ | ❌ | PUT /api/users/123 |
| DELETE | 刪除資源 | ✅ | ❌ | DELETE /api/users/123 |
| HEAD | 如 GET，但無響應體 | ✅ | ✅ | HEAD /api/users |
| OPTIONS | 獲取允許的方法 | ✅ | ✅ | OPTIONS /api/users |

### 方法選擇指南

#### GET - 檢索

```
用途: 獲取單個資源或列表
特點: 冪等、安全、可緩存
範例:
  GET /api/users/123          # 獲取用戶
  GET /api/users?status=active # 列表並過濾
```

#### POST - 創建

```
用途: 創建新資源或執行動作
特點: 非冪等、不安全
規則:
  - 應返回 201 Created
  - 應在 Location 頭中返回新資源的 URL
  - 應返回創建的資源
範例:
  POST /api/users              # 創建用戶
  POST /api/users/123/verify  # 執行動作 (動詞可用於特殊動作)
```

#### PATCH - 部分更新

```
用途: 更新資源的某些字段
特點: 通常非冪等、不安全
規則:
  - 只更新提供的字段
  - 未提供的字段保持不變
  - 應返回 200 OK 或 204 No Content
範例:
  PATCH /api/users/123        # 更新用戶的部分字段
  Content-Type: application/json
  {
    "email": "new@example.com"
  }
```

#### DELETE - 刪除

```
用途: 刪除資源
特點: 冪等、不安全
規則:
  - 應返回 204 No Content (無響應體)
  - 或返回 200 OK 和成功訊息
  - 第二次刪除同一資源應返回 404
範例:
  DELETE /api/users/123       # 刪除用戶
```

---

## 請求格式

### 內容類型

所有請求應使用 JSON:

```
Content-Type: application/json
```

### 請求體 - 創建資源

```json
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active"
}
```

### 請求體 - 更新資源

```json
PATCH /api/users/123
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

### 查詢參數

```
GET /api/users?status=active&sort=-created_at&limit=10&page=2

查詢參數:
- status: 過濾參數
- sort: 排序 (- 表示降序)
- limit: 分頁大小
- page: 頁碼
```

### 命名規範

- **路徑參數**: 小寫，用連字符分隔
  ```
  /api/users/{user-id}
  /api/orders/{order-id}
  ```

- **查詢參數**: 駝峰式或小寫
  ```
  ?createdAfter=2024-01-01
  ?created_after=2024-01-01
  (保持一致)
  ```

- **JSON 鍵**: 駝峰式 (JavaScript 慣例)
  ```json
  {
    "userId": "123",
    "userName": "John",
    "createdAt": "2024-03-10T10:30:00Z"
  }
  ```

---

## 響應格式

### 成功響應

所有成功響應應遵循統一格式:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active",
    "createdAt": "2024-03-10T10:30:00Z",
    "updatedAt": "2024-03-10T10:30:00Z"
  }
}
```

### 列表響應

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "User 1",
      "email": "user1@example.com"
    },
    {
      "id": "2",
      "name": "User 2",
      "email": "user2@example.com"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 2,
    "totalPages": 50
  }
}
```

### 分頁元數據

```json
"meta": {
  "total": 1000,        // 總記錄數
  "page": 1,            // 當前頁
  "pageSize": 20,       // 每頁大小
  "totalPages": 50,     // 總頁數
  "hasNext": true,      // 是否有下一頁
  "hasPrev": false      // 是否有上一頁
}
```

### 日期格式

使用 ISO 8601 格式:

```json
{
  "createdAt": "2024-03-10T10:30:00Z",
  "updatedAt": "2024-03-10T10:30:00Z",
  "deletedAt": "2024-03-10T11:45:00Z"
}
```

### 空響應

```json
{
  "success": true,
  "data": null
}
```

---

## 狀態碼

### 成功 (2xx)

```
200 OK              # 一般成功響應，有響應體
201 Created         # 資源創建成功，應包含 Location 頭
204 No Content      # 成功，但無響應體 (DELETE, PATCH)
```

**使用範例**:

```typescript
// 201 Created
async create(ctx: any) {
  const user = await service.create(body)
  return ctx.json({ success: true, data: user }, { status: 201 })
}

// 204 No Content
async delete(ctx: any) {
  await service.delete(id)
  return ctx.json(null, { status: 204 })
}
```

### 客戶端錯誤 (4xx)

```
400 Bad Request           # 請求格式或內容錯誤
401 Unauthorized          # 缺少身份驗證
403 Forbidden             # 沒有權限
404 Not Found             # 資源不存在
409 Conflict              # 衝突 (如重複資源)
422 Unprocessable Entity  # 驗證失敗
429 Too Many Requests     # 速率限制
```

**使用範例**:

```typescript
// 400 Bad Request
if (!body.name) {
  return ctx.json(
    { success: false, error: 'Missing required field: name' },
    { status: 400 }
  )
}

// 404 Not Found
const user = await repository.findById(id)
if (!user) {
  return ctx.json(
    { success: false, error: 'User not found' },
    { status: 404 }
  )
}

// 422 Unprocessable Entity
try {
  const email = new Email(body.email)  // 驗證失敗
} catch (error) {
  return ctx.json(
    { success: false, error: 'Invalid email format' },
    { status: 422 }
  )
}
```

### 伺服器錯誤 (5xx)

```
500 Internal Server Error  # 未預期的伺服器錯誤
503 Service Unavailable    # 服務臨時不可用 (維護等)
```

**使用範例**:

```typescript
// 500 Internal Server Error
try {
  await riskyOperation()
} catch (error) {
  console.error('Unexpected error:', error)
  return ctx.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  )
}
```

---

## 錯誤處理

### 錯誤響應格式

```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND",
  "details": {
    "userId": "123",
    "context": "Additional debugging info"
  }
}
```

### 常見錯誤代碼

```
// 驗證錯誤
INVALID_INPUT
MISSING_REQUIRED_FIELD
INVALID_EMAIL_FORMAT

// 資源錯誤
RESOURCE_NOT_FOUND
RESOURCE_ALREADY_EXISTS
RESOURCE_IN_USE

// 業務邏輯錯誤
INSUFFICIENT_PERMISSIONS
INVALID_STATUS_TRANSITION
INSUFFICIENT_FUNDS

// 系統錯誤
INTERNAL_SERVER_ERROR
SERVICE_UNAVAILABLE
DATABASE_CONNECTION_ERROR
```

### 錯誤處理控制器

```typescript
export class BaseController {
  protected handleError(ctx: any, error: any) {
    console.error('Error:', error)

    // 應用異常
    if (error instanceof AppException) {
      return ctx.json(
        {
          success: false,
          error: error.message,
          code: error.code || 'APP_ERROR'
        },
        { status: error.statusCode || 400 }
      )
    }

    // 驗證錯誤
    if (error.name === 'ValidationError') {
      return ctx.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 422 }
      )
    }

    // 未知錯誤
    return ctx.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
```

---

## 分頁

### 查詢參數

```
GET /api/users?page=2&limit=20

參數:
- page: 頁碼 (預設: 1)
- limit: 每頁記錄數 (預設: 20, 最大: 100)
```

### 響應

```json
{
  "success": true,
  "data": [ /* 20 條記錄 */ ],
  "meta": {
    "total": 500,
    "page": 2,
    "pageSize": 20,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### 實現範例

```typescript
export class ListUsersService {
  async execute(page: number = 1, limit: number = 20) {
    // 驗證
    if (page < 1) page = 1
    if (limit < 1 || limit > 100) limit = 20

    // 計算偏移
    const offset = (page - 1) * limit

    // 查詢
    const [data, total] = await Promise.all([
      this.repository.find({ offset, limit }),
      this.repository.count()
    ])

    // 返回
    return {
      data: data.map(e => UserDTO.fromEntity(e)),
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }
}
```

---

## 過濾和排序

### 過濾查詢

```
GET /api/users?status=active&role=admin&createdAfter=2024-01-01

支援的操作:
- 相等: ?status=active
- 範圍: ?createdAfter=2024-01-01&createdBefore=2024-03-10
- 包含: ?tags=js,typescript
- 不相等: ?status!=inactive (可選)
```

### 排序查詢

```
GET /api/users?sort=name,-createdAt

規則:
- sort 參數包含字段名稱
- '-' 前綴表示降序
- 多個字段用逗號分隔
- 預設: 升序
```

### 實現範例

```typescript
interface QueryFilters {
  status?: string
  role?: string
  createdAfter?: string
  createdBefore?: string
  sort?: string
  page?: number
  limit?: number
}

export class ListUsersService {
  async execute(filters: QueryFilters) {
    let query = this.repository.query()

    // 應用過濾
    if (filters.status) {
      query = query.where('status', filters.status)
    }
    if (filters.role) {
      query = query.where('role', filters.role)
    }
    if (filters.createdAfter) {
      query = query.where('created_at', '>=', filters.createdAfter)
    }
    if (filters.createdBefore) {
      query = query.where('created_at', '<=', filters.createdBefore)
    }

    // 應用排序
    if (filters.sort) {
      const parts = filters.sort.split(',')
      for (const part of parts) {
        if (part.startsWith('-')) {
          query = query.orderBy(part.substring(1), 'desc')
        } else {
          query = query.orderBy(part, 'asc')
        }
      }
    }

    // 應用分頁
    const limit = Math.min(filters.limit || 20, 100)
    const page = Math.max(filters.page || 1, 1)
    const offset = (page - 1) * limit

    const data = await query.offset(offset).limit(limit).select()
    const total = await this.repository.count()

    return {
      data,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}
```

---

## 版本管理

### URL 版本化 (推薦)

```
/api/v1/users           # 版本 1
/api/v2/users           # 版本 2
```

### 頭部版本化 (可選)

```
GET /api/users
Accept-Version: 1
```

### 何時升版

- ✅ 添加新端點
- ✅ 添加可選參數
- ✅ 添加響應字段
- ❌ 刪除端點 (用廢棄)
- ❌ 更改現有字段的含義
- ❌ 更改響應格式

### 廢棄流程

```
1. 標記為廢棄 (新版本中)
   GET /api/users
   Deprecation: true

2. 提供遷移指南
   Documentation updated

3. 6 個月後移除
   端點完全刪除
```

---

## 安全性

### 速率限制

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1615000000
```

**實現**:

```typescript
// 中間件
app.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100,                  // 每個 IP 最多 100 個請求
  message: 'Too many requests, please try again later'
}))
```

### 驗證和授權

所有需要身份驗證的端點應要求 Bearer token:

```
GET /api/users
Authorization: Bearer <jwt-token>
```

### CORS

配置允許的來源:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  credentials: true
}))
```

### 輸入驗證

始終驗證和淨化用戶輸入:

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  status: z.enum(['active', 'inactive'])
})

const validated = createUserSchema.parse(body)
```

---

## 代碼範例

### 完整的 CRUD 端點

```typescript
import type { PlanetCore } from '@gravito/core'
import { UserController } from '../Controllers/UserController'

export async function registerUserRoutes(core: PlanetCore) {
  const controller = new UserController(core)

  // 列表
  core.router.get('/api/users', async (ctx) => {
    const page = parseInt(ctx.req.query.page || '1')
    const limit = parseInt(ctx.req.query.limit || '20')
    const status = ctx.req.query.status

    const result = await controller.list(ctx, { page, limit, status })
    return ctx.json(result)
  })

  // 創建
  core.router.post('/api/users', async (ctx) => {
    try {
      const body = await ctx.req.json()
      const result = await controller.create(ctx, body)
      return ctx.json(result, { status: 201 })
    } catch (error: any) {
      return ctx.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
  })

  // 獲取
  core.router.get('/api/users/:id', async (ctx) => {
    const result = await controller.show(ctx, ctx.req.param('id'))
    if (!result) {
      return ctx.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    return ctx.json(result)
  })

  // 更新
  core.router.patch('/api/users/:id', async (ctx) => {
    try {
      const body = await ctx.req.json()
      const result = await controller.update(ctx, ctx.req.param('id'), body)
      return ctx.json(result)
    } catch (error: any) {
      return ctx.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
  })

  // 刪除
  core.router.delete('/api/users/:id', async (ctx) => {
    await controller.delete(ctx, ctx.req.param('id'))
    return ctx.json(null, { status: 204 })
  })
}
```

### 控制器實現

```typescript
export class UserController {
  constructor(private core: PlanetCore) {}

  async list(ctx: any, filters: { page: number; limit: number; status?: string }) {
    const service = new ListUsersService(this.core)
    const { data, meta } = await service.execute(filters)

    return {
      success: true,
      data,
      meta
    }
  }

  async create(ctx: any, body: any) {
    const service = new CreateUserService(this.core)
    const user = await service.execute(body)

    return {
      success: true,
      data: user
    }
  }

  async show(ctx: any, id: string) {
    const repository = new UserRepository(this.core.get('db'))
    const user = await repository.findById(id)

    if (!user) return null

    return {
      success: true,
      data: UserDTO.fromEntity(user)
    }
  }

  async update(ctx: any, id: string, body: any) {
    const service = new UpdateUserService(this.core)
    const user = await service.execute(id, body)

    return {
      success: true,
      data: user
    }
  }

  async delete(ctx: any, id: string) {
    const repository = new UserRepository(this.core.get('db'))
    await repository.delete(id)
  }
}
```

---

## 相關文檔

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統架構
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 模組創建
- [SETUP.md](./SETUP.md) - 環境設置

---

**遵循這些指南，你的 API 會更一致、更易使用、更易維護。**
# OpenAPI / Swagger 文件指南

此文檔說明如何為 Gravito DDD Starter 應用程式整合 OpenAPI 規範。

## 目錄

- [概述](#概述)
- [方案 1：手動 OpenAPI 規範](#方案-1手動-openapi-規範)
- [方案 2：自動代碼生成](#方案-2自動代碼生成)
- [方案 3：動態 API 文件](#方案-3動態-api-文件)
- [測試 API](#測試-api)

---

## 概述

OpenAPI 規範提供了一個標準的方式來描述 REST API。它可以用於：

- 📖 自動生成 API 文件（Swagger UI）
- 🧪 API 測試工具整合（Postman、Insomnia）
- 🔧 程式碼生成（客戶端、伺服器）
- 📝 API 版本控制和文件化

---

## 方案 1：手動 OpenAPI 規範

適合：小型專案或對 API 變更不頻繁的專案

### 1.1 建立 OpenAPI 文件

**`docs/openapi.yaml`**

```yaml
openapi: 3.0.0
info:
  title: Gravito DDD Starter API
  description: |
    Gravito DDD Starter - 一個基於 Domain-Driven Design 的現代化 TypeScript API 框架。

    此 API 使用 RESTful 設計模式，遵循 DDD 原則組織業務邏輯。
  version: 1.0.0
  contact:
    name: API Support
    url: https://github.com/gravito-framework/gravito-ddd-starter
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000
    description: 本地開發環境
  - url: https://api.example.com
    description: 正式環境

tags:
  - name: Health
    description: 應用程式健康狀態檢查
  - name: Products
    description: 產品管理 API
  - name: BlogPosts
    description: 部落格文章管理 API

paths:
  /health:
    get:
      summary: 健康檢查
      description: 檢查應用程式的健康狀態
      operationId: getHealth
      tags:
        - Health
      responses:
        '200':
          description: 應用程式正常運行
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
                  timestamp:
                    type: string
                    format: date-time
                  uptime:
                    type: integer
                    description: 運行時間（秒）
                  environment:
                    type: string
                    example: development

  /api:
    get:
      summary: API 根端點
      description: 獲取可用的 API 端點清單
      operationId: getApiRoot
      tags:
        - Health
      responses:
        '200':
          description: API 端點清單
          content:
            application/json:
              schema:
                type: object
                properties:
                  endpoints:
                    type: array
                    items:
                      type: string

  /api/products:
    get:
      summary: 列出所有產品
      description: 獲取所有產品的清單
      operationId: listProducts
      tags:
        - Products
      parameters:
        - name: status
          in: query
          description: 按狀態過濾
          schema:
            type: string
            enum: [draft, published, archived]
        - name: limit
          in: query
          description: 結果限制
          schema:
            type: integer
            default: 10
        - name: offset
          in: query
          description: 分頁偏移
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: 產品清單
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      limit:
                        type: integer
                      offset:
                        type: integer

    post:
      summary: 建立新產品
      description: 建立一個新的產品
      operationId: createProduct
      tags:
        - Products
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: 產品建立成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      id:
                        type: string
                        format: uuid
                  message:
                    type: string
        '400':
          description: 無效的請求
          $ref: '#/components/responses/ValidationError'
        '422':
          description: 驗證失敗
          $ref: '#/components/responses/ValidationError'

  /api/products/{id}:
    get:
      summary: 獲取單個產品
      description: 根據 ID 獲取產品詳細資訊
      operationId: getProduct
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 產品詳細資訊
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/Product'
        '404':
          description: 產品不存在
          $ref: '#/components/responses/NotFound'

    patch:
      summary: 更新產品
      description: 更新產品資訊
      operationId: updateProduct
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                price:
                  type: number
                  minimum: 0
      responses:
        '200':
          description: 產品更新成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/Product'
        '404':
          description: 產品不存在
          $ref: '#/components/responses/NotFound'

    delete:
      summary: 刪除產品
      description: 刪除指定的產品
      operationId: deleteProduct
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 產品已刪除
        '404':
          description: 產品不存在
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    Product:
      type: object
      required:
        - id
        - name
        - description
        - price
        - status
        - sku
      properties:
        id:
          type: string
          format: uuid
          description: 產品唯一識別碼
        name:
          type: string
          minLength: 1
          maxLength: 255
          description: 產品名稱
        description:
          type: string
          description: 產品描述
        price:
          type: number
          minimum: 0
          description: 產品價格
        currency:
          type: string
          default: USD
          description: 貨幣代碼
        status:
          type: string
          enum: [draft, published, archived]
          description: 產品狀態
        sku:
          type: string
          description: 產品 SKU（庫存單位）
        createdAt:
          type: string
          format: date-time
          description: 建立時間
        updatedAt:
          type: string
          format: date-time
          description: 更新時間

    CreateProductRequest:
      type: object
      required:
        - name
        - description
        - price
        - sku
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
          example: iPhone 15 Pro
        description:
          type: string
          example: 最新的 iPhone 專業版本
        price:
          type: number
          minimum: 0.01
          example: 999.99
        currency:
          type: string
          default: USD
          example: USD
        sku:
          type: string
          example: IPHONE-15-PRO-256GB
        status:
          type: string
          enum: [draft, published]
          default: draft

    Error:
      type: object
      required:
        - success
        - error
      properties:
        success:
          type: boolean
          example: false
        error:
          type: string
          description: 錯誤訊息
        code:
          type: string
          description: 錯誤碼
        errors:
          type: object
          description: 欄位級別的驗證錯誤

  responses:
    ValidationError:
      description: 驗證錯誤
      content:
        application/json:
          schema:
            allOf:
              - $ref: '#/components/schemas/Error'
              - type: object
                properties:
                  errors:
                    type: object
                    additionalProperties:
                      type: string

    NotFound:
      description: 資源不存在
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    InternalServerError:
      description: 伺服器內部錯誤
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### 1.2 提供 Swagger UI

安裝 Swagger UI：

```bash
bun add swagger-ui-express
bun add -D @types/swagger-ui-express
```

在 `src/index.ts` 中整合：

```typescript
import swaggerUi from 'swagger-ui-express'
import yaml from 'yaml'
import { readFileSync } from 'fs'
import { join } from 'path'

async function bootstrap() {
  const core = await createApp()

  // 讀取 OpenAPI 規範
  const openapiPath = join(import.meta.dir, '../docs/openapi.yaml')
  const openapiFile = readFileSync(openapiPath, 'utf-8')
  const openapiSpec = yaml.parse(openapiFile)

  // 設定 Swagger UI
  core.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customCss: '.swagger-ui { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
      customSiteTitle: 'Gravito API Documentation'
    })
  )

  // ... 其他設定
}
```

訪問 `http://localhost:3000/api-docs` 查看文檔。

---

## 方案 2：自動代碼生成

適合：大型專案或 API 頻繁變更

### 2.1 使用 @gravito/swagger (假設支援)

```bash
bun add @gravito/swagger
```

在控制器中使用裝飾器：

```typescript
import { ApiOperation, ApiResponse } from '@gravito/swagger'

export class ProductController {
  @ApiOperation({
    summary: '建立產品',
    description: '建立一個新的產品'
  })
  @ApiResponse(201, Product)
  async create(request: Request) {
    // ...
  }
}
```

自動生成 OpenAPI 規範：

```bash
bun run generate:openapi
```

### 2.2 使用 Tsoa

如果需要更強大的功能，可以使用 Tsoa：

```bash
bun add -D tsoa
```

設定 `tsoa.json`：

```json
{
  "entryFile": "src/index.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "controllerPathGlobs": ["src/**/*Controller.ts"],
  "spec": {
    "outputDirectory": "docs",
    "specVersion": 3
  }
}
```

在路由中使用：

```typescript
import { route } from 'tsoa'

@route('products')
export class ProductController {
  /**
   * 建立產品
   */
  @post()
  @response(201, 'Product created')
  async create(@body() dto: CreateProductDTO) {
    // ...
  }
}
```

---

## 方案 3：動態 API 文件

適合：高度動態的 API

### 3.1 建立 API 文件生成器

**`src/Shared/Infrastructure/OpenAPIGenerator.ts`**

```typescript
import { Context } from '@gravito/core'

/**
 * 動態 OpenAPI 規範生成器
 */
export class OpenAPIGenerator {
  generate(context: Context) {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Gravito DDD Starter API',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: 'Development server'
        }
      ],
      paths: this.generatePaths(context),
      components: {
        schemas: this.generateSchemas()
      }
    }
  }

  private generatePaths(context: Context) {
    // 根據註冊的路由自動生成路徑
    const paths = {}
    // ... 實作邏輯
    return paths
  }

  private generateSchemas() {
    return {
      // ... 常見的 schema
    }
  }
}
```

---

## 測試 API

### 使用 Swagger UI

1. 啟動應用程式：
   ```bash
   bun run dev
   ```

2. 訪問 API 文檔：
   ```
   http://localhost:3000/api-docs
   ```

3. 在 Swagger UI 中測試端點

### 使用 Insomnia

1. 在 Insomnia 中導入 OpenAPI 規範：
   - Design → New Document → Paste OpenAPI Spec

2. 選擇環境設定：
   ```
   base_url: http://localhost:3000
   ```

3. 開始測試 API

### 使用 Postman

1. 建立新的 Postman Collection
2. 導入 OpenAPI 規範：
   File → Import → Choose `docs/openapi.yaml`

3. 在 Postman 中測試所有端點

---

## 最佳實踐

✅ **更新規範**
- 每次 API 變更時更新 OpenAPI 規範
- 將 OpenAPI 文件與程式碼一起版本控制

✅ **保持一致**
- 確保 OpenAPI 規範與實際 API 實作同步
- 自動測試可以驗證一致性

✅ **文件清晰**
- 為所有端點提供有意義的描述
- 包含請求和回應範例
- 列出所有可能的錯誤狀態碼

❌ **避免的錯誤**
- 不要讓 OpenAPI 文件過時
- 不要省略錯誤回應文檔
- 不要忽視安全性（驗證、授權）

---

## 相關資源

- 📖 [OpenAPI 3.0 規範](https://spec.openapis.org/oas/v3.0.0)
- 🛠️ [Swagger Editor](https://editor.swagger.io/)
- 📚 [API 文件最佳實踐](https://swagger.io/blog/)
- 🔗 [Insomnia 文檔](https://insomnia.rest/documentation)
