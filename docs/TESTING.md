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
