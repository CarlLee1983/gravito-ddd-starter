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

詳見 [DCI_PATTERN.md](./DCI_PATTERN.md) 了解具體實作範例。

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

**Q: 何時需要使用 CQRS 或 Event Sourcing?**
A: 本樣版使用 **簡單模式**（直接 Repository）以保持架構清晰。當以下場景出現時，再考慮進階模式：
- **CQRS**：讀寫不對稱（讀多寫少）或需要複雜查詢優化時
- **Event Sourcing**：需要完整變更歷史或事件回放時
- **Saga Pattern**：跨多個聚合的長流程事務時

詳見 [ARCHITECTURE_PATTERNS.md](./ARCHITECTURE_PATTERNS.md) 中的進階模式案例。

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

- [ARCHITECTURE_PATTERNS.md](./ARCHITECTURE_PATTERNS.md) - 進階模式（CQRS、Event Sourcing、Saga）
- [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) - 分層規則與 ACL 原則
- [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md) - ACL 設計詳細指南
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 如何創建新模組
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 常見問題和解決方案
- [../README.md](../README.md) - 專案概況

---

**遵循這些架構原則，你的代碼將易於測試、維護和擴展。**
# 🏗️ 進階架構模式指南

本文檔說明何時引入 **CQRS**、**Event Sourcing**、**Saga Pattern** 等進階模式。

## 概述

**原則**：**簡單優先** — Gravito DDD Starter 採用基礎四層架構 + Repository 模式。只有當業務需求確實需要時，才引入進階模式。

### 當前架構（樣版）

```
User 模組（簡單）
├── Presentation/
├── Application/      ← 直接調用 Repository，無 Handler/Service 複雜度
├── Domain/
└── Infrastructure/
    └── Repository   ← 唯一的數據存取抽象
```

**優點**：
- ✅ 代碼簡潔（無 boilerplate）
- ✅ 易於理解（新開發者快速上手）
- ✅ 易於維護（變更影響小）
- ✅ 易於測試（依賴簡單）

---

### 1. CQRS（命令查詢責任分離）

### 何時使用？

| 場景 | 指標 | 例子 |
|------|------|------|
| **讀多寫少** | 讀寫比 > 10:1 | 部落格文章（讀 100 次 vs 寫 1 次） |
| **複雜查詢** | 查詢需要多表 JOIN、聚合、投影 | 統計面板（需要 10+ 種不同查詢） |
| **查詢性能** | 簡單索引無法滿足（需要特殊優化） | 搜尋、分頁、排序組合爆炸 |
| **不同讀模型** | 不同場景需要不同數據結構 | APP 版本 vs Web 版本要不同字段 |

### 🚀 讀取側最佳化實踐 (Optimization)

在實作 CQRS 讀側（如 `ProductQueryService`）時，應遵循以下優化準則：

1. **強制投影 (Projection)**: 始終使用 `select(['col1', 'col2'])` 取代 `select()`。避免 `SELECT *` 造成的 I/O 與記憶體浪費。
2. **繞過聚合 (Bypass Aggregates)**: 讀取側應直接存取 `IDatabaseAccess` 並回傳 DTO，無需轉換為重量級的 Domain Entity。
3. **資料預聚合**: 對於複雜統計，可透過事件監聽同步更新專用的「唯讀資料表」。

### 不使用 CQRS 的場景

❌ **User 模組**（本樣版）
- 查詢簡單：只有 findById、findByEmail、list
- 讀寫平衡：創建、查詢、更新頻率相近
- 無複雜投影：返回數據結構就是 User 實體

### 架構範例

```typescript
// Command 處理寫入
export class CreatePostHandler {
  async execute(cmd: CreatePostCommand): Promise<void> {
    // 業務驗證 → 創建聚合 → 保存 → 發布事件
  }
}

// Query 處理讀取
export class GetPostsByUserQuery {
  async execute(query: GetPostsByUserQuery): Promise<PostDTO[]> {
    // 直接查詢優化過的讀模型（可能是特殊投影表）
  }
}
```

### 實施步驟

1. 建立 `Application/Commands/` 和 `Application/Queries/` 目錄
2. 為每個寫操作建立 Command + Handler
3. 為每個複雜查詢建立 Query + Handler
4. 建立讀模型（可選 SQL 視圖或專用投影表）

詳見案例：`examples/CQRS_Example/` （待實作）

---

## 2. Event Sourcing（事件溯源）

### 何時使用？

| 場景 | 指標 | 例子 |
|------|------|------|
| **完整審計** | 需要記錄所有變更 | 財務系統、法規遵循、醫療紀錄 |
| **事件回放** | 需要重現過去的狀態 | 訂單歷史、用戶操作追蹤 |
| **時間旅行** | "2024-03-10 的用戶余額是多少?" | 支付系統、版本控制 |
| **複雜業務邏輯** | 状態機遷移複雜，容易出錯 | 訂單生命週期、工作流引擎 |

### 不使用 Event Sourcing 的場景

❌ **User 模組**（本樣版）
- 無審計需求：只需記錄最終狀態
- 無複雜狀態機：只有 active/inactive
- 可覆蓋更新：不需要完整歷史

### 架構範例

```typescript
// 事件定義
export class UserCreatedEvent extends DomainEvent {
  constructor(public userId: string, public email: string) {
    super()
  }
}

// 聚合發布事件
export class User extends Aggregate {
  static create(id: string, email: string): User {
    const user = new User()
    user.apply(new UserCreatedEvent(id, email))
    return user
  }

  private onUserCreated(event: UserCreatedEvent): void {
    this.id = event.userId
    this.email = event.email
    this.createdAt = new Date()
  }
}

// 事件儲存
export class EventSourcingUserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    const events = user.getDomainEvents()
    await this.eventStore.saveEvents(user.id, events)
  }

  async findById(id: string): Promise<User | null> {
    const events = await this.eventStore.getEvents(id)
    return User.fromEvents(events) // 從事件重建狀態
  }
}
```

### 實施步驟

1. 建立 `Domain/Events/` 目錄，定義領域事件
2. 修改 Aggregate，使其聲明和應用事件
3. 建立 `EventStore` 基礎設施（可用 EventStoreDB 等）
4. 建立新的 Repository 實現（基於事件重建）
5. 建立投影層（可選，用於查詢優化）

詳見案例：`examples/EventSourcing_Example/` （待實作）

---

## 3. Saga Pattern（長流程協調）

### 何時使用？

| 場景 | 指標 | 例子 |
|------|------|------|
| **跨聚合事務** | 涉及多個不同聚合的操作 | 訂單 → 庫存 → 支付的一致性 |
| **補償邏輯** | 操作失敗需要回滾多個步驟 | 轉帳失敗需要撤銷兩邊操作 |
| **異步協調** | 步驟無法在同一事務中完成 | 第三方 API 調用（支付網關） |
| **長期流程** | 流程跨越秒級以上 | 訂單履行、核准流程 |

### 不使用 Saga 的場景

❌ **User 模組**（本樣版）
- 單聚合操作：User 本身的創建
- 無跨模組事務：不涉及其他聚合
- 同步完成：操作瞬間完成

### 架構範例

```typescript
// Saga 定義（協調器）
export class OrderFulfillmentSaga {
  async execute(orderId: string): Promise<void> {
    try {
      // Step 1: 預留庫存
      const reservationId = await this.inventoryService.reserve(orderId)

      // Step 2: 處理支付
      const paymentId = await this.paymentService.charge(orderId)

      // Step 3: 發送訂單
      await this.shippingService.ship(orderId, reservationId)

    } catch (error) {
      // 補償：反向操作
      await this.inventoryService.cancelReservation(reservationId)
      await this.paymentService.refund(paymentId)
      throw new SagaException('Order fulfillment failed')
    }
  }
}
```

### 實施步驟

1. 建立 `Application/Sagas/` 目錄
2. 定義 Saga 類別，實現協調邏輯
3. 定義 Port（Service 介面）給其他模組
4. 建立 Adapter 實現，調用各模組 Repository
5. 處理失敗和補償邏輯

詳見案例：`examples/Saga_Example/` （待實作）

---

## 決策樹

```
你的功能有以下特徵嗎？

是否需要複雜查詢優化或讀多寫少？
  ├─ 是 → 使用 CQRS
  └─ 否 → 繼續

是否需要完整變更歷史和事件重放？
  ├─ 是 → 使用 Event Sourcing
  └─ 否 → 繼續

是否涉及跨多個聚合的協調？
  ├─ 是 → 使用 Saga Pattern
  └─ 否 → 繼續

✅ 使用基礎四層架構 + Repository 模式
```

---

## 漸進式實施策略

### Phase 1：基礎（現在）

```
User、Post、Health 模組
↓
直接 Repository 模式
↓
簡單、易懂、易測試
```

### Phase 2：需要時引入 CQRS

```
Payment、Analytics 模組（讀多寫少）
↓
Command/Query Handler
↓
讀寫分離、查詢優化
```

### Phase 3：進階需求

```
Order、Wallet 模組（複雜流程 + 審計）
↓
Event Sourcing + Saga
↓
完整歷史 + 長流程協調
```

---

## 相關資源

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 四層架構基礎
- [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) - 層級分離規則
- [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md) - 防腐層設計

### 外部參考

- Martin Fowler - CQRS: https://martinfowler.com/bliki/CQRS.html
- Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- Saga Pattern: https://microservices.io/patterns/data/saga.html

---

## 案例計畫（待實作）

- ✅ 基礎四層架構（User 模組）
- ⏳ CQRS 案例（Payment 模組）
- ⏳ Event Sourcing 案例（Wallet 模組）
- ⏳ Saga Pattern 案例（Order 模組）

每個案例都會包含：
- 完整代碼實現
- 測試（單元、整合、E2E）
- 遷移指南（從簡單模式升級）
- 性能對比

---

**最後更新**：2026-03-11
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
// src/Modules/Post/Domain/Services/IAuthorService.ts
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
# 依賴注入架構 - ORM 透明抽換

## 概述

這個架構實現了**上層注入，下層透明**的設計原則：
- ✅ **模組對 ORM 實現完全無感知**
- ✅ **所有 ORM 選擇決策在 bootstrap.ts 中集中控制**
- ✅ **Memory 實現只在開發/測試時被注入，生產環境由上層決定**
- ✅ **新增 ORM 時只改 FactoryMapBuilder，無需改動模組**

---

## 架構設計

### 之前：硬編碼的工廠映射 ❌

```typescript
// registerUserRepositories.ts - 每個模組都硬編碼實現映射
const factory = createRepositoryFactory({
  memory: () => new UserRepository(),           // ← 硬編碼
  drizzle: (db) => new DrizzleUserRepository(), // ← 硬編碼
})
```

**問題：**
- 模組知道自己要使用哪些 ORM 實現
- Memory 實現被當作預設值，無法只在開發時使用
- 每個模組都重複定義映射

### 之後：上層注入 ✅

```typescript
// bootstrap.ts - 唯一決定 ORM 的地方
const orm = getCurrentORM()
const db = orm !== 'memory' ? getDatabaseAccess() : undefined
const factoryBuilder = new FactoryMapBuilder(orm, db)

registerUserRepositories(factoryBuilder.build('user'))

// registerUserRepositories.ts - 模組完全無感知
export function registerUserRepositories(factoryMap: RepositoryFactoryMap): void {
  const factory = createRepositoryFactory(factoryMap)
  getRegistry().register('user', factory)
}
```

**優勢：**
- ✅ 模組不知道 ORM 細節，只負責註冊
- ✅ ORM 選擇完全由上層控制
- ✅ Memory 實現由上層決定何時使用

---

## 核心概念

### 1. FactoryMapBuilder（工廠映射構建器）

**職責：** 根據 ORM 類型和模組名稱，動態構建 Repository 工廠映射

```typescript
// src/wiring/FactoryMapBuilder.ts
const builder = new FactoryMapBuilder('drizzle', databaseAccess)
const userFactoryMap = builder.build('user')
```

**關鍵特性：**
- 集中管理所有模組的 Repository 實現
- 支援 memory、drizzle、atlas、prisma
- 新增模組時只需在 FactoryMapBuilder 中加一個定義

### 2. registerXRepositories（模組註冊函數）

**職責：** 接受上層注入的工廠映射，註冊到全局 Registry

```typescript
// src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
export function registerUserRepositories(
  factoryMap: RepositoryFactoryMap
): void {
  const registry = getRegistry()
  const factory = createRepositoryFactory(factoryMap)
  registry.register('user', factory)
}
```

**改變：** 從硬編碼映射 → 接受參數

### 3. bootstrap.ts（應用啟動）

**職責：** 唯一決定 ORM 選擇的地方，協調所有模組

```typescript
// src/bootstrap.ts - Step 3
const orm = getCurrentORM()
const db = orm !== 'memory' ? getDatabaseAccess() : undefined
const factoryBuilder = new FactoryMapBuilder(orm, db)

registerUserRepositories(factoryBuilder.build('user'))
registerPostRepositories(factoryBuilder.build('post'))
```

---

## 完整流程

### 步驟 1：環境決策（bootstrap.ts）

```typescript
// 根據環境變數決定使用哪個 ORM
const orm = getCurrentORM()  // 'memory' | 'drizzle' | 'atlas' | 'prisma'
const db = orm !== 'memory' ? getDatabaseAccess() : undefined

console.log(`📦 已選擇 ORM: ${orm}`)
```

### 步驟 2：工廠映射構建（FactoryMapBuilder）

```typescript
// 根據 ORM 類型，為每個模組構建映射
const factoryBuilder = new FactoryMapBuilder(orm, db)

// 對 User 模組：
//   - ORM=memory  → memory() 函數
//   - ORM=drizzle → drizzle() 函數
//   - ...
const userFactoryMap = factoryBuilder.build('user')

// 對 Post 模組：
const postFactoryMap = factoryBuilder.build('post')
```

### 步驟 3：工廠註冊（各模組）

```typescript
// User 模組接收映射並註冊
registerUserRepositories(userFactoryMap)
// RepositoryRegistry 中：
//   'user' → (orm, db) => {
//     if (orm === 'memory') return new UserRepository()
//     if (orm === 'drizzle') return new DrizzleUserRepository(db)
//   }

// Post 模組接收映射並註冊
registerPostRepositories(postFactoryMap)
```

### 步驟 4：創建 Repository（ServiceProvider）

```typescript
// User ServiceProvider
override register(container: IContainer): void {
  container.singleton('userRepository', () => {
    const registry = getRegistry()
    const orm = getCurrentORM()
    const db = orm !== 'memory' ? getDatabaseAccess() : undefined
    return registry.create('user', orm, db)  // ← 自動選擇實現
  })
}

// 運行時行為：
// ORM=memory  → new UserRepository()
// ORM=drizzle → new DrizzleUserRepository(db)
```

---

## 實際範例

### 場景：切換 ORM

#### 方式 1：ORM=memory（開發/測試）

```bash
# 使用 memory 實現
export ORM=memory
bun run dev

# 所有模組使用 in-memory Repository
User Module:   UserRepository
Post Module:   PostRepository
Order Module:  OrderRepository (未來)
```

#### 方式 2：ORM=drizzle（開發/測試/生產）

```bash
# 使用 Drizzle 實現
export ORM=drizzle
export DATABASE_URL=...
bun run dev

# 所有模組使用 Drizzle Repository
User Module:   DrizzleUserRepository
Post Module:   DrizzlePostRepository
Order Module:  DrizzleOrderRepository (未來)
```

#### 方式 3：ORM=prisma（未來）

```bash
# 使用 Prisma 實現
export ORM=prisma
export DATABASE_URL=...
bun run dev

# 所有模組使用 Prisma Repository
User Module:   PrismaUserRepository
Post Module:   PrismaPostRepository
Order Module:  PrismaOrderRepository (未來)
```

### 切換 ORM 時無需改動任何模組代碼！

```typescript
// src/Modules/User/... - 完全不變
export function registerUserRepositories(factoryMap: RepositoryFactoryMap): void {
  // 完全相同的代碼
}

// src/Modules/Post/... - 完全不變
export function registerPostRepositories(factoryMap: RepositoryFactoryMap): void {
  // 完全相同的代碼
}
```

---

## 新增模組的流程

假設要新增 Order 模組：

### 步驟 1：在 FactoryMapBuilder 中定義映射

```typescript
// src/wiring/FactoryMapBuilder.ts
private getModuleDefinition(moduleName: string): Record<string, any> {
  const definitions = {
    // ... 現有模組 ...
    order: {  // ← 新增
      memory: () => new OrderRepository(),
      drizzle: (db) => new DrizzleOrderRepository(db!),
      atlas: undefined,
      prisma: undefined,
    },
  }
}
```

### 步驟 2：建立 registerOrderRepositories 函數

```typescript
// src/Modules/Order/Infrastructure/Providers/registerOrderRepositories.ts
import type { RepositoryFactoryMap } from '@wiring/RepositoryFactoryGenerator'
import { createRepositoryFactory } from '@wiring/RepositoryFactoryGenerator'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function registerOrderRepositories(
  factoryMap: RepositoryFactoryMap
): void {
  const registry = getRegistry()
  const factory = createRepositoryFactory(factoryMap)
  registry.register('order', factory)
  console.log('✅ [Order] Repository 工廠已註冊')
}
```

### 步驟 3：在 bootstrap.ts 中註冊

```typescript
// src/bootstrap.ts
const factoryBuilder = new FactoryMapBuilder(orm, db)

registerUserRepositories(factoryBuilder.build('user'))
registerPostRepositories(factoryBuilder.build('post'))
registerOrderRepositories(factoryBuilder.build('order'))  // ← 新增
```

**完成！** Order 模組現在支援所有 ORM，無需為每個 ORM 改動代碼。

---

## 設計原則

### 1. 單一責任原則

| 組件 | 責任 |
|------|------|
| **bootstrap.ts** | 決定使用哪個 ORM |
| **FactoryMapBuilder** | 根據 ORM 選擇和模組名稱，提供對應的工廠映射 |
| **registerXRepositories** | 接受映射，註冊到 Registry |
| **ServiceProvider** | 從 Registry 建立 Repository 實例 |
| **模組** | 完全無感知 ORM 實現 |

### 2. 開放封閉原則

- **對擴展開放：** 新增模組時只改 FactoryMapBuilder
- **對修改封閉：** 現有代碼無需改動

### 3. 依賴反轉原則

- **高層（bootstrap）** 決定使用哪個實現
- **低層（模組）** 接受決策，無需知道細節
- **中層（FactoryMapBuilder）** 橋接高層決策到低層實現

### 4. 關注點分離

```
環境決策層   ← bootstrap.ts（決定 ORM）
    ↓
映射構建層   ← FactoryMapBuilder（提供映射）
    ↓
註冊層       ← registerXRepositories（註冊工廠）
    ↓
創建層       ← Registry.create()（創建實例）
    ↓
模組層       ← 各模組完全無感知
```

---

## 對比：舊 vs 新

| 指標 | 舊（硬編碼） | 新（注入） |
|------|----------|---------|
| **ORM 決策點** | 分散在每個模組 | 集中在 bootstrap.ts |
| **模組對 ORM 感知** | ✅ 感知 | ❌ 無感知 |
| **新增模組步數** | 為每個 ORM 實現 | 只改 FactoryMapBuilder |
| **新增 ORM 步數** | 修改所有模組 | 修改 FactoryMapBuilder |
| **Memory 實現** | 當作預設值 | 由上層控制何時使用 |
| **切換 ORM 難度** | 高（需改模組邏輯） | 低（只改環境變數） |
| **測試環境** | 難以模擬不同 ORM | 容易注入模擬實現 |

---

## 測試與模擬

### 單元測試：注入模擬工廠映射

```typescript
import { registerUserRepositories } from '@/Modules/User/Infrastructure/Providers/registerUserRepositories'
import { initializeRegistry } from '@wiring/RepositoryRegistry'

test('UserServiceProvider 應使用 mock Repository', () => {
  initializeRegistry()

  // 注入模擬工廠映射
  const mockFactoryMap = {
    memory: () => mockUserRepository,
  }

  registerUserRepositories(mockFactoryMap)

  // 測試 UserServiceProvider
  const provider = new UserServiceProvider()
  // ...
})
```

### 集成測試：測試不同 ORM

```typescript
test('ORM=memory → 使用 UserRepository', () => {
  process.env.ORM = 'memory'
  // bootstrap()...
  // 驗證 memory 實現
})

test('ORM=drizzle → 使用 DrizzleUserRepository', () => {
  process.env.ORM = 'drizzle'
  // bootstrap()...
  // 驗證 drizzle 實現
})
```

---

## 最佳實踐

### ✅ DO

```typescript
// 1. 在 bootstrap.ts 集中決定 ORM
const orm = getCurrentORM()
const db = orm !== 'memory' ? getDatabaseAccess() : undefined
const builder = new FactoryMapBuilder(orm, db)

// 2. 模組接受工廠映射參數
export function registerUserRepositories(
  factoryMap: RepositoryFactoryMap
): void { ... }

// 3. 在 FactoryMapBuilder 集中管理所有模組映射
class FactoryMapBuilder {
  build(moduleName: string): RepositoryFactoryMap { ... }
}

// 4. ServiceProvider 從 Registry 取得 Repository
const repo = registry.create('user', orm, db)
```

### ❌ DON'T

```typescript
// 1. 不要在模組中硬編碼 ORM 映射
const factory = createRepositoryFactory({
  memory: () => new UserRepository(),
  drizzle: (db) => new DrizzleUserRepository(),
})  // ❌ 硬編碼！

// 2. 不要在模組中決定使用哪個 ORM
if (process.env.ORM === 'memory') {
  return new UserRepository()
} else {
  return new DrizzleUserRepository()
}  // ❌ 模組感知 ORM！

// 3. 不要在多個地方複製 ORM 選擇邏輯
// registerUserRepositories.ts 中決定
// registerPostRepositories.ts 中也決定
// 重複！ ❌

// 4. 不要在 bootstrap 以外的地方改變 ORM 選擇
// 應該統一在 bootstrap.ts 中
```

---

## 常見問題

### Q：为什麼不直接在 FactoryMapBuilder 中初始化 db？

**A：** 保持單一責任。bootstrap.ts 負責決定何時需要 db（基於 ORM 類型），FactoryMapBuilder 只負責提供映射。這樣測試時更容易模擬。

### Q：新增第三方 ORM（如 TypeORM）時怎麼辦？

**A：** 三步驟：
1. 在 RepositoryFactory.ts 中加入 typeorm 適配器初始化
2. 在 FactoryMapBuilder 中為所有模組加入 typeorm 映射
3. 完成！所有模組自動支援

### Q：能否為不同模組使用不同 ORM？

**A：** 當前設計是全局一個 ORM。如果需要混合使用，可以擴展 FactoryMapBuilder 接受模組特定的 ORM 參數，但這會增加複雜度，不推薦。

### Q：Memory 實現何時使用？

**A：**
- **開發環境：** `export ORM=memory`
- **單元測試：** 注入 memory 工廠映射
- **集成測試：** 需要數據庫時使用真實 ORM
- **生產環境：** 使用真實 ORM（drizzle/prisma/atlas）

---

## 總結

這個架構實現了真正的**ORM 無關性**：

```
環境變數 (ORM=xxx)
         ↓
    bootstrap.ts
         ↓
  FactoryMapBuilder
         ↓
  registerXRepositories
         ↓
   RepositoryRegistry
         ↓
   ServiceProviders
         ↓
   模組（完全無感知 ORM）
```

**核心優勢：**
- 所有 ORM 選擇决策集中在一個地方（bootstrap.ts）
- 模組完全無感知實現細節
- 新增 ORM 時只改一個文件
- Memory 實現只在需要時注入
- 遵循所有 SOLID 原則

**這就是企業級 DDD 架構應該的樣子！** 🏗️✨
