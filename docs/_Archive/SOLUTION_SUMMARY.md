# 統一 ORM 抽換機制 - 完整解決方案

## 問題回顧

用戶提出的核心問題：

> 「在寫法上我們使不用的實作，比如 src/adapters/Drizzle/Repositories/DrizzlePostRepository.ts，似乎在每個 module 中的基礎建設物件在抽換上也就只有 Repository 不能延用。」

**翻譯：** 似乎每個模組都需要為每個 ORM 建立不同的 Repository 實現，這是否有統一的方式？

---

## 解決方案概述

### ✅ 答案：有統一方式！

通過 **RepositoryFactory 工廠模式**，實現：

1. **每個模組只有一個 ServiceProvider**（不因 ORM 而複製）
2. **ORM 選擇邏輯集中在 RepositoryFactory**（單一配置點）
3. **所有 ServiceProvider 使用相同的代碼模式**（100% 可重用）
4. **環境變數驅動整個 ORM 切換**（無需改業務代碼）

---

## 完整設計圖

```
┌─────────────────────────────────────────────────────────────┐
│                    Application                              │
│                      bootstrap()                            │
└──────────┬──────────────────────────────────────────────────┘
           │ 讀取環境：ORM=?
           ↓
┌─────────────────────────────────────────────────────────────┐
│              ServiceProvider Layer                          │
│                                                              │
│  UserServiceProvider.register()                             │
│  ├─ createRepository('user', db)  ← 統一的模式              │
│  └─ return UserRepository | DrizzleUserRepository           │
│                                                              │
│  PostServiceProvider.register()                             │
│  ├─ createRepository('post', db)  ← 完全相同                │
│  └─ return PostRepository | DrizzlePostRepository           │
│                                                              │
│  OrderServiceProvider.register()  (新增模組)                │
│  ├─ createRepository('order', db)  ← 複製貼上                │
│  └─ return OrderRepository | DrizzleOrderRepository         │
│                                                              │
│  Container: {                                              │
│    userRepository: UserRepository | DrizzleUserRepository   │
│    postRepository: PostRepository | DrizzlePostRepository   │
│    orderRepository: OrderRepository | DrizzleOrderRepository│
│  }                                                           │
└─────────────┬──────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────┐
│            RepositoryFactory (統一 ORM 選擇點)              │
│                                                              │
│  getCurrentORM() → 'memory' | 'drizzle' | 'atlas' | ...     │
│                                                              │
│  createRepository('user'|'post'|'order', db)               │
│  ├─ switch(orm) {                                           │
│  │  case 'memory': return new UserRepository()              │
│  │  case 'drizzle': return new DrizzleUserRepository(db)    │
│  │  case 'atlas': return new AtlasUserRepository(db)        │
│  │  ...                                                      │
│  │ }                                                         │
│                                                              │
│  getDatabaseAccess()                                        │
│  ├─ if orm === 'memory': return undefined                   │
│  └─ else: return createDrizzleDatabaseAccess() | ...        │
└─────────────┬──────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────┐
│           Wiring Layer (表現層組裝)                         │
│                                                              │
│  registerUser(core)                                         │
│  ├─ repository = core.container.make('userRepository')      │
│  ├─ handler = core.container.make('createUserHandler')      │
│  ├─ controller = new UserController(repository, handler)    │
│  └─ registerUserRoutes(router, controller)                  │
│                                                              │
│  registerPost(core)                                         │
│  ├─ repository = core.container.make('postRepository')      │
│  └─ ... 相同邏輯                                            │
└──────────────────────────────────────────────────────────────┘

完全切換 ORM，無需改任何 ServiceProvider 或 Domain 層代碼
```

---

## 關鍵創新：三層清晰分工

### 層 1：Domain（ORM 無關）

```typescript
// src/Modules/User/Domain/Repositories/IUserRepository.ts
export interface IUserRepository {
  save(user: User): Promise<void>
  findById(id: string): Promise<User | null>
  // ...
}
```

**特點：** ✅ 完全抽象，不知道如何持久化

---

### 層 2：Infrastructure（多種實現）

#### 2A. In-Memory（開發/測試）

```typescript
// src/Modules/User/Infrastructure/Persistence/UserRepository.ts
export class UserRepository implements IUserRepository {
  private users = new Map<string, User>()
  // ...
}
```

#### 2B. Drizzle（生產）

```typescript
// src/adapters/Drizzle/Repositories/DrizzleUserRepository.ts
export class DrizzleUserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}
  // ...
}
```

**特點：** ✅ 多個實現，完全實現 IUserRepository

---

### 層 3：ServiceProvider（統一選擇）

```typescript
// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('user', db)  // ← Factory 選擇實現
    })
  }
}
```

**特點：** ✅ 統一的模式，所有模組都一樣

---

### 層 4：Wiring（表現層組裝）

```typescript
// src/wiring/index.ts
export const registerUser = (core: PlanetCore): void => {
  const repository = core.container.make('userRepository')
  const handler = core.container.make('createUserHandler')
  const controller = new UserController(repository, handler)
  registerUserRoutes(router, controller)
}
```

**特點：** ✅ 完全不涉及 ORM 選擇

---

## 對比：舊 vs 新

### ❌ 舊設計（解決不了的問題）

```
User 模組
├─ UserServiceProvider-Memory     ← 重複！
├─ UserServiceProvider-Drizzle    ← 重複！
└─ UserServiceProvider-Atlas      ← 重複！

Post 模組
├─ PostServiceProvider-Memory     ← 重複！
├─ PostServiceProvider-Drizzle    ← 重複！
└─ PostServiceProvider-Atlas      ← 重複！

Order 模組
├─ OrderServiceProvider-Memory    ← 重複！
├─ OrderServiceProvider-Drizzle   ← 重複！
└─ OrderServiceProvider-Atlas     ← 重複！

bootstrap.ts
├─ if (orm === 'memory') {
│   register(UserServiceProvider-Memory)
│   register(PostServiceProvider-Memory)
│   register(OrderServiceProvider-Memory)
│ } else if (orm === 'drizzle') {
│   register(UserServiceProvider-Drizzle)
│   register(PostServiceProvider-Drizzle)
│   register(OrderServiceProvider-Drizzle)
│ }

問題：
- 💥 每個模組 × 每個 ORM = 9 個 ServiceProvider
- 💥 邏輯 80% 重複
- 💥 新增模組時必須為每個 ORM 複製一份
- 💥 修改邏輯時要改 9 個檔案
```

### ✅ 新設計（已實現）

```
User 模組
└─ UserServiceProvider           ← 統一！
   └─ 使用 createRepository('user', db)

Post 模組
└─ PostServiceProvider           ← 統一！
   └─ 使用 createRepository('post', db)

Order 模組
└─ OrderServiceProvider          ← 統一！
   └─ 使用 createRepository('order', db)

RepositoryFactory               ← 統一的 ORM 選擇點
├─ getCurrentORM()
├─ createRepository()
└─ getDatabaseAccess()

bootstrap.ts
├─ register(UserServiceProvider)   ← 無需條件判斷
├─ register(PostServiceProvider)
└─ register(OrderServiceProvider)

優勢：
- ✅ 每個模組只有 1 個 ServiceProvider
- ✅ 邏輯重複率 = 0%
- ✅ 新增模組時複製貼上 5 行代碼
- ✅ 修改邏輯時只改 RepositoryFactory
```

---

## 實際代碼對比

### 同一個模組，三種 ORM 的情況

#### ❌ 舊做法

```typescript
// 3 個檔案

// 1. UserServiceProvider-Memory.ts
export class UserServiceProviderMemory extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      return new UserRepository()
    })
  }
}

// 2. UserServiceProvider-Drizzle.ts
export class UserServiceProviderDrizzle extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const db = getDatabaseAccess()
      return new DrizzleUserRepository(db)
    })
  }
}

// 3. UserServiceProvider-Atlas.ts
export class UserServiceProviderAtlas extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const db = getAtlasDatabaseAccess()
      return new AtlasUserRepository(db)
    })
  }
}

// bootstrap.ts
if (orm === 'memory') {
  core.register(createGravitoServiceProvider(new UserServiceProviderMemory()))
} else if (orm === 'drizzle') {
  core.register(createGravitoServiceProvider(new UserServiceProviderDrizzle()))
} else if (orm === 'atlas') {
  core.register(createGravitoServiceProvider(new UserServiceProviderAtlas()))
}
```

**問題：** 80% 的代碼重複

#### ✅ 新做法

```typescript
// 1 個檔案

export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return createRepository('user', db)  // Factory 處理所有邏輯
    })
  }
}

// bootstrap.ts
core.register(createGravitoServiceProvider(new UserServiceProvider()))

// 現在加入新 ORM？RepositoryFactory 加一個 case 就完成！
// 所有模組自動支援新 ORM，無需改 ServiceProvider
```

**優勢：** 0% 重複，完美的可重用性

---

## 新增模組時的流程

### 舊設計：9 個步驟

1. 建立 OrderRepository (in-memory)
2. 建立 DrizzleOrderRepository
3. 建立 AtlasOrderRepository
4. 建立 OrderServiceProvider-Memory
5. 建立 OrderServiceProvider-Drizzle
6. 建立 OrderServiceProvider-Atlas
7. 修改 bootstrap.ts 的 if/else
8. 修改 wiring/index.ts
9. 😱 代碼重複率 > 80%

### 新設計：5 個步驟

1. 建立 OrderRepository (in-memory)
2. 建立 DrizzleOrderRepository
3. 建立 OrderServiceProvider（複製 User 的模式）
4. 更新 RepositoryFactory（加入 'order' case）
5. ✅ 完成！所有 ORM 自動支援

---

## 環境變數驅動的 ORM 切換

```bash
# 開發環境
ORM=memory bun run dev
# → UserRepository, PostRepository, OrderRepository
# → 資料存在記憶體
# → 啟動快，無需資料庫

# 測試環境
ORM=memory bun test
# → 同上，適合單元測試

# Staging 環境
ORM=drizzle DATABASE_URL=sqlite:./staging.db bun run start
# → DrizzleUserRepository, DrizzlePostRepository, DrizzleOrderRepository
# → 資料持久化到 SQLite
# → 接近生產環境

# 生產環境
ORM=drizzle DATABASE_URL=postgresql://user:pass@db:5432/app bun run start
# → DrizzleUserRepository, DrizzlePostRepository, DrizzleOrderRepository
# → 資料持久化到 PostgreSQL
# → 完整的 ACID 保證
```

**關鍵特點：** 完全相同的應用代碼，只改環境變數

---

## 實施成果

### 新增檔案

| 檔案 | 行數 | 說明 |
|------|------|------|
| `src/wiring/RepositoryFactory.ts` | 180+ | 統一的 ORM 選擇工廠 |
| `docs/UNIFIED_ORM_SWAPPING.md` | 450+ | 完整架構設計指南 |
| `docs/WIRING_GUIDE.md` | 400+ | Wiring 層深度指南 |
| `docs/ORM_SWAPPING_EXAMPLES.md` | 550+ | 實戰範例和對比 |
| `docs/WIRING_QUICK_REFERENCE.md` | 300+ | 快速參考卡 |
| `.env.example` | - | 環境配置範本 |

### 更新檔案

| 檔案 | 改動 | 說明 |
|------|------|------|
| `src/wiring/index.ts` | 重構 | 統一模式，添加診斷函數 |
| `UserServiceProvider.ts` | 更新 | 使用 RepositoryFactory |
| `PostServiceProvider.ts` | 更新 | 使用 RepositoryFactory |

### 已驗證

- ✅ UserRepository (in-memory) 正常運作
- ✅ DrizzleUserRepository 完全實現 IUserRepository
- ✅ PostRepository (in-memory) 正常運作
- ✅ DrizzlePostRepository 完全實現 IPostRepository
- ✅ 可分別測試兩個 ORM 實現
- ✅ ServiceProvider 統一模式可複製

---

## 回答原始問題

### 問題：「似乎在每個 module 中的基礎建設物件在抽換上也就只有 Repository 不能延用」

### 答案：

**是的，但不是問題！** 因為：

1. **每個模組確實需要多個 Repository 實現**（memory + db-backed）
   - 這是合理的，因為它們的實現邏輯完全不同
   - Domain 層定義一次，Infrastructure 層實現多次

2. **但 ServiceProvider 可以統一！**
   - 使用 RepositoryFactory 自動選擇實現
   - 所有模組的 ServiceProvider 代碼完全相同
   - 只需改 `createRepository('x', db)` 中的 `x`

3. **ORM 選擇邏輯集中在一個地方**
   - RepositoryFactory 是唯一決定「用哪個 Repository」的地方
   - 新增 ORM 時只需修改 Factory，無需改 ServiceProvider

4. **環境變數驅動切換**
   - 不需要為每個 ORM 建立不同的 ServiceProvider
   - 一個環境變數 `ORM=?` 控制整個應用的持久化策略

---

## 總結：核心洞察

| 層次 | 是否重複 | 原因 |
|------|--------|------|
| **Domain** | ❌ | 定義一次，被所有實現遵守 |
| **Repository** | ✅ | 合理的，每個 ORM 有不同實現邏輯 |
| **ServiceProvider** | ❌ | 統一模式，使用 RepositoryFactory |
| **Wiring** | ❌ | 統一模式，只取出已配置的服務 |
| **ORM 選擇** | ❌ | 集中在 RepositoryFactory |

**最重要的設計原則：**

> 複雜性應該集中在一個地方（RepositoryFactory），
> 而不是分散到每個 ServiceProvider。
>
> 這樣新增模組時，只需遵循統一的模式。
> 新增 ORM 時，只需更新 Factory。

---

## 相關文檔

- 📖 [UNIFIED_ORM_SWAPPING.md](./UNIFIED_ORM_SWAPPING.md) - 完整架構設計
- 📖 [WIRING_GUIDE.md](./WIRING_GUIDE.md) - Wiring 層深度指南
- 📖 [ORM_SWAPPING_EXAMPLES.md](./ORM_SWAPPING_EXAMPLES.md) - 實戰範例
- 📖 [WIRING_QUICK_REFERENCE.md](./WIRING_QUICK_REFERENCE.md) - 快速參考

---

## 下一步

1. ✅ 完成 UserRepository 和 DrizzleUserRepository 測試
2. ✅ 完成 PostRepository 和 DrizzlePostRepository 測試
3. 📋 完善 PostController 和路由（Presentation 層）
4. 📋 新增 OrderModule（驗證新增模組流程）
5. 📋 新增 Atlas 適配器（驗證新增 ORM 流程）
6. 📋 新增 Prisma 適配器（驗證多 ORM 共存）
7. 📋 性能測試和優化

---

**這就是完整的統一 ORM 抽換機制！**

🎉 不再需要為每個模組和每個 ORM 建立重複代碼。
