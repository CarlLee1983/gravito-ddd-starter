# 架構設計指南 (Architecture Guide)

## 概述

Gravito DDD Starter 遵循 **Domain-Driven Design (DDD) + DCI (Data, Context, Interaction)** 四層架構，實現清晰的責任分離和可測試性。

## 四層架構 (Four-Layer Architecture)

```
┌─────────────────────────────────────────────────┐
│    Presentation Layer (HTTP Routes, Controllers) │
│         ↓ DTO (Data Transfer Objects)            │
├─────────────────────────────────────────────────┤
│ Application Layer (Use Cases, Services)          │
│   ↓ Domain Model + DCI Contexts                  │
├─────────────────────────────────────────────────┤
│ Domain Layer (Aggregates, Entities, Services)    │
│  - Business logic (核心商業邏輯)                 │
│  - No external dependencies (無外部依賴)         │
│     ↓ Interfaces                                 │
├─────────────────────────────────────────────────┤
│ Infrastructure Layer (Repositories, ORM)         │
│   - Database, Cache, External Services           │
└─────────────────────────────────────────────────┘
```

## 層級責任詳解

### 1. Presentation Layer (表現層)

**責任**:
- 處理 HTTP 請求/響應
- 驗證用戶輸入
- 呼叫應用服務
- 格式化響應數據

**文件位置**: `src/Modules/<Module>/Presentation/`

```
Presentation/
├── Controllers/        # HTTP 請求處理器
│   └── UserController.ts
├── Resources/         # 響應格式化器
│   └── UserResource.ts
└── Routes/           # 路由定義
    └── user.routes.ts
```

**範例控制器**:
```typescript
export class UserController {
  constructor(private core: PlanetCore) {}

  async list(ctx: any) {
    const service = new ListUsersService(this.core)
    const users = await service.execute()
    return ctx.json({ success: true, data: users })
  }

  async create(ctx: any) {
    const body = await ctx.req.json()
    const service = new CreateUserService(this.core)
    const user = await service.execute(body)
    return ctx.json({ success: true, data: user }, { status: 201 })
  }
}
```

### 2. Application Layer (應用層)

**責任**:
- 實現使用案例 (Use Cases)
- 協調領域層和基礎設施層
- DTO 轉換和映射
- 事務管理

**文件位置**: `src/Modules/<Module>/Application/`

```
Application/
├── Services/         # 應用服務 (Use Cases)
│   ├── CreateUserService.ts
│   └── ListUsersService.ts
└── DTOs/            # 數據傳輸對象
    └── UserDTO.ts
```

**範例應用服務**:
```typescript
export class CreateUserService {
  private userRepository: IUserRepository

  constructor(private core: PlanetCore) {
    this.userRepository = new UserRepository(core.get('db'))
  }

  async execute(input: CreateUserInput): Promise<UserDTO> {
    // 驗證業務規則
    const existingUser = await this.userRepository.findByEmail(input.email)
    if (existingUser) {
      throw new AppException('User already exists')
    }

    // 創建領域實體
    const user = User.create({
      name: input.name,
      email: input.email,
      status: new UserStatus('active')
    })

    // 持久化
    await this.userRepository.save(user)

    // 轉換為 DTO
    return UserDTO.fromEntity(user)
  }
}
```

### 3. Domain Layer (領域層)

**責任**:
- 核心業務邏輯
- 領域模型 (Entities, Aggregates, Value Objects)
- 領域事件
- 業務規則驗證

**檔案位置**: `src/Modules/<Module>/Domain/`

```
Domain/
├── Entities/          # 實體類
│   └── User.ts
├── ValueObjects/      # 值物件
│   ├── UserStatus.ts
│   └── UserEmail.ts
├── Repositories/      # Repository 介面
│   └── IUserRepository.ts
└── Services/         # 領域服務
    └── UserDomainService.ts
```

**實體 (Entity) - 有身份識別**:
```typescript
import { BaseEntity } from '@/Shared/Domain/BaseEntity'
import { UserStatus } from './ValueObjects/UserStatus'

export class User extends BaseEntity {
  name: string
  email: string
  status: UserStatus

  static create(data: {
    name: string
    email: string
    status: UserStatus
  }): User {
    const user = new User()
    user.name = data.name
    user.email = data.email
    user.status = data.status
    return user
  }

  deactivate(): void {
    if (this.status.value === 'active') {
      this.status = new UserStatus('inactive')
    }
  }
}
```

**值物件 (Value Object) - 無身份，不可變**:
```typescript
import { ValueObject } from '@/Shared/Domain/ValueObject'

export class UserStatus extends ValueObject {
  readonly value: 'active' | 'inactive'

  constructor(value: 'active' | 'inactive') {
    super()
    if (!['active', 'inactive'].includes(value)) {
      throw new Error('Invalid user status')
    }
    this.value = value
  }

  equals(other: any): boolean {
    return other instanceof UserStatus && other.value === this.value
  }

  toString(): string {
    return this.value
  }
}
```

**Repository 介面 (倒依賴)**:
```typescript
import { User } from '../Entities/User'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findAll(): Promise<User[]>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}
```

### 4. Infrastructure Layer (基礎設施層)

**責任**:
- 實現 Repository 介面
- 數據庫操作
- 外部服務整合
- 快取管理

**檔案位置**: `src/Modules/<Module>/Infrastructure/`

```
Infrastructure/
└── Repositories/      # Repository 實現
    └── UserRepository.ts
```

**Repository 實現**:
```typescript
import { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { User } from '../../Domain/Entities/User'

export class UserRepository implements IUserRepository {
  constructor(private db: any) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').find(id)
    return row ? User.fromDatabase(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .table('users')
      .where('email', email)
      .first()
    return row ? User.fromDatabase(row) : null
  }

  async save(user: User): Promise<void> {
    await this.db.table('users').insert({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status.value,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    })
  }

  async delete(id: string): Promise<void> {
    await this.db.table('users').where('id', id).delete()
  }
}
```

## 依賴方向 (Dependency Direction)

```
Presentation → Application → Domain ← Infrastructure
                              ↑
                          (Interfaces)
```

**重要原則**:
- Domain 層不依賴其他層 (完全獨立)
- Infrastructure 實現 Domain 接口
- Application 層協調各層
- Presentation 層只調用 Application 層

## 數據流 (Data Flow)

### 讀取流程 (Read)

```
1. HTTP Request
   ↓
2. Controller (驗證請求參數)
   ↓
3. Application Service (使用案例邏輯)
   ↓
4. Domain Service (業務規則檢查)
   ↓
5. Repository (從數據庫讀取)
   ↓
6. DTO 轉換 (Domain Model → DTO)
   ↓
7. HTTP Response
```

### 寫入流程 (Write)

```
1. HTTP Request
   ↓
2. Controller (驗證請求)
   ↓
3. Application Service (創建領域對象)
   ↓
4. Domain Model (驗證業務規則)
   ↓
5. Repository (保存到數據庫)
   ↓
6. DTO 轉換 (返回給客戶端)
   ↓
7. HTTP Response
```

## 模組結構 (Module Structure)

每個模組都是自包含的有限上下文 (Bounded Context):

```
src/Modules/User/
├── Domain/                # 業務邏輯 (完全獨立)
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Repositories/
│   └── Services/
├── Application/           # 使用案例 (協調層)
│   ├── Services/
│   └── DTOs/
├── Presentation/         # HTTP 端點 (表現層)
│   ├── Controllers/
│   ├── Resources/
│   └── Routes/
├── Infrastructure/       # 持久化 (實現層)
│   └── Repositories/
└── index.ts             # 公開 API
```

**模組 index.ts**:
```typescript
// 只暴露 public API
export { User } from './Domain/Entities/User'
export { UserStatus } from './Domain/ValueObjects/UserStatus'
export { UserDTO } from './Application/DTOs/UserDTO'
export { IUserRepository } from './Domain/Repositories/IUserRepository'
export { registerUserRoutes } from './Presentation/Routes/user.routes'
```

## 共享層 (Shared Layer)

所有模組繼承的基礎類別和介面:

```
src/Shared/
├── Domain/
│   ├── BaseEntity.ts              # 實體基類
│   ├── AggregateRoot.ts           # 聚合根基類
│   ├── ValueObject.ts             # 值物件基類
│   ├── DomainEvent.ts             # 領域事件基類
│   └── IRepository.ts             # Repository 介面
├── Application/
│   ├── BaseDTO.ts                 # DTO 基類
│   └── AppException.ts            # 應用異常基類
└── Infrastructure/
    ├── ICacheService.ts
    ├── IRedisService.ts
    └── IDatabaseAccess.ts
```

## 軌道系統 (Orbits)

Gravito 使用 Orbits (軌道) 系統來管理基礎設施和服務:

```
應用啟動順序:
1. Prism       (視圖/模板)
2. OrbitAtlas  (數據庫)
3. OrbitPlasma (Redis)
4. OrbitStasis (快取)
5. OrbitSignal (事件/郵件)
```

**在 config/orbits.ts 中配置**:
```typescript
export const buildOrbits = (config: AppConfig) => [
  AtlasOrbit.create(config.database),    // 條件化: ENABLE_DB
  PlasmaOrbit.create(config.redis),      // Redis 客戶端
  StasisOrbit.create(config.cache),      // 快取管理
  SignalOrbit.create(config.signal),     // 事件系統
]
```

在控制器中使用:
```typescript
export class UserController {
  async list(ctx: any) {
    const db = ctx.get('db')           // OrbitAtlas
    const cache = ctx.get('cache')     // OrbitStasis
    const redis = ctx.get('redis')     // OrbitPlasma
    // ...
  }
}
```

## 設計模式 (Design Patterns)

### Repository 模式
- 抽象數據存取層
- Domain 層定義介面，Infrastructure 實現

### Factory 模式
- 複雜對象創建
- 例: UserFactory.create()

### Value Object 模式
- 不可變的概念對象
- 例: UserStatus, Email

### Aggregate 模式
- 實體和值物件的集合
- 統一的一致性邊界

### DCI 模式
- Data: 簡單的數據對象 (領域模型)
- Context: 業務場景 (應用服務)
- Interaction: 物件間的互動 (方法調用)

## 最佳實踐 (Best Practices)

1. **不可變性 (Immutability)**
   ```typescript
   // ❌ 錯誤
   user.name = 'John'

   // ✅ 正確
   user = User.updateName(user, 'John')
   ```

2. **驗證分層**
   ```typescript
   // Presentation: 格式驗證
   if (!isEmail(input.email)) throw new ValidationError()

   // Domain: 業務規則驗證
   if (await userRepository.findByEmail(email)) throw new DuplicateUserError()
   ```

3. **依賴注入**
   ```typescript
   export class CreateUserService {
     constructor(private repository: IUserRepository) {}
     // 注入依賴，便於測試
   }
   ```

4. **小型聚合根**
   - 一個聚合根包含一個實體
   - 通過 Repository 加載整個聚合
   - 保持聚合簡單和可測試

## 常見問題 (FAQ)

**Q: 何時創建新的 Value Object?**
A: 當概念具有業務含義且需要驗證時。例如: Email、Status、Money

**Q: Repository 中能否進行業務邏輯計算?**
A: 否。Repository 只負責數據存取。業務邏輯屬於 Domain Service 或 Application Service。

**Q: DTO 何時轉換?**
A: 在層邊界處轉換 (Presentation ↔ Application, Application ↔ Domain)

**Q: 是否能跳過某一層?**
A: 否。四層架構強制分離，保證可測試和可維護。

## 跨模組整合（ACL 防腐層）

當多個模組需要協作時，使用 **Anti-Corruption Layer (ACL)** 來隔離它們，防止一個模組污染另一個。

### 原則

1. **ACL 屬於使用方** — 如果 Post 需要 User 資訊，ACL 在 Post 模組內
2. **Port 由使用方定義** — Post 定義 `IAuthorService`（Port），而不是被迫使用 User 的介面
3. **Adapter 實現 Port** — ACL 實現 Port，轉換供應方的語言

### 範例：Post 獲取 Author 資訊

```
User 模組（供應方）
  └─ IUserRepository.findById()

Post 模組（使用方）
  ├─ Application/Ports/IAuthorService  ← Post 定義
  │   └─ findAuthor(authorId): AuthorDTO
  │
  └─ Infrastructure/Adapters/
      └─ UserToPostAdapter  ← ACL 實現
          └─ 呼叫 userRepository
             轉換為 AuthorDTO { id, name, email }
```

### 好處

- ✅ **完全解耦** — Post 不知道 User 的實現
- ✅ **ORM 無關** — 改變 User 的 ORM 不影響 Post
- ✅ **易於測試** — 可輕鬆 mock IAuthorService
- ✅ **易於替換** — 改變作者來源（API/DB），只改 Adapter

詳見 [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md)

## 相關文檔

- [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) - 分層規則與 ACL 原則
- [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md) - ACL 設計詳細指南
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 如何創建新模組
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 常見問題和解決方案
- [../README.md](../README.md) - 專案概況

---

**遵循這些架構原則，你的代碼將易於測試、維護和擴展。**
