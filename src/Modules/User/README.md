# User Module

用戶管理模組 - 完整的 DDD 實現與正確的依賴注入。

## 概述

User 模組是一個完整的 Domain-Driven Design 實現，展示：

- ✅ Aggregate Root (User)
- ✅ Repository Pattern (IUserRepository)
- ✅ Application Commands/Handlers (CreateUserHandler)
- ✅ DTOs (UserDTO)
- ✅ **Proper Dependency Injection** ⭐ (ServiceProvider 配置)
- ✅ Controllers (UserController)
- ✅ Routes (api.routes.ts)

## 功能

### API 端點

#### 列出所有用戶
```
GET /api/users

回應:
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-03-10T10:30:00Z"
    }
  ]
}
```

#### 創建用戶
```
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}

回應:
{
  "success": true,
  "message": "User created successfully",
  "data": { /* user */ }
}
```

#### 獲取特定用戶
```
GET /api/users/:id

回應:
{
  "success": true,
  "data": { /* user */ }
}
```

## 架構結構

```
User/
├── Domain/
│   ├── Aggregates/
│   │   └── User.ts               # 聚合根
│   └── Repositories/
│       └── IUserRepository.ts    # 倒依賴接口
├── Application/
│   ├── Commands/
│   │   └── CreateUser/
│   │       └── CreateUserHandler.ts  # 應用服務
│   └── DTOs/
│       └── UserDTO.ts            # 數據傳輸物件
├── Infrastructure/
│   ├── Persistence/
│   │   └── UserRepository.ts     # Repository 實現
│   └── Providers/
│       └── UserServiceProvider.ts # DI 配置
├── Presentation/
│   ├── Controllers/
│   │   └── UserController.ts     # HTTP 處理
│   └── Routes/
│       └── api.ts                # 路由定義
├── tests/
│   ├── UserRepository.test.ts
│   └── UserModule.test.ts
├── index.ts                      # 公開 API
└── README.md
```

## 正確的依賴注入模式 ⭐

### 1. 在 ServiceProvider 中註冊所有依賴

```typescript
// UserServiceProvider.ts
export class UserServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 1. Repository (單例)
    container.singleton('userRepository', () => {
      return new UserRepository()
    })

    // 2. Application Service (工廠)
    container.factory('createUserHandler', (c: Container) => {
      const repository = c.make('userRepository')
      return new CreateUserHandler(repository)
    })

    // 3. Controller (工廠) - 依賴 Repository 和 Handler
    container.factory('userController', (c: Container) => {
      const repository = c.make('userRepository')
      const createUserHandler = c.make('createUserHandler')
      return new UserController(repository, createUserHandler)
    })
  }
}
```

### 2. Controller 通過構造函數接收依賴

```typescript
// UserController.ts
export class UserController {
  // ✅ 依賴注入：不直接創建，而是接收
  constructor(
    private repository: IUserRepository,
    private createUserHandler: CreateUserHandler
  ) {}

  async index(ctx: GravitoContext) {
    // ✅ 使用注入的依賴
    const users = await this.repository.list()
    return ctx.json({ success: true, data: users })
  }
}
```

### 3. Routes 從容器獲取 Controller

```typescript
// api.ts
export async function registerUserRoutes(core: PlanetCore) {
  // ✅ 中間件：每次請求都從容器獲取依賴注入的 controller
  const getController = (ctx: GravitoContext): UserController => {
    return ctx.get('core').container.make('userController') as UserController
  }

  // ✅ 使用中間件
  core.router.get('/api/users', (ctx: GravitoContext) => {
    const controller = getController(ctx)
    return controller.index(ctx)
  })
}
```

## 對比：不正確 vs 正確

### ❌ 不正確的模式

```typescript
// Routes
export async function registerUserRoutes(core: PlanetCore) {
  // ❌ 直接創建，沒有依賴注入
  const controller = new UserController()
  core.router.get('/api/users', (ctx) => controller.index(ctx))
}

// Controller
export class UserController {
  async index(ctx: GravitoContext) {
    // ❌ 在控制器中直接從容器獲取依賴
    const core = ctx.get('core') as PlanetCore
    const repository = core.container.make('userRepository')
    const users = await repository.list()
  }
}
```

**問題**:
- Controller 與容器耦合
- Controller 的依賴不清楚（隱藏在方法內）
- 難以測試（無法注入 mock）
- 違反依賴倒轉原則

### ✅ 正確的模式

```typescript
// Routes
export async function registerUserRoutes(core: PlanetCore) {
  // ✅ 從容器獲取依賴注入的 controller
  const getController = (ctx: GravitoContext) =>
    ctx.get('core').container.make('userController')

  core.router.get('/api/users', (ctx) =>
    getController(ctx).index(ctx)
  )
}

// Controller
export class UserController {
  // ✅ 明確的依賴聲明
  constructor(
    private repository: IUserRepository,
    private createUserHandler: CreateUserHandler
  ) {}

  async index(ctx: GravitoContext) {
    // ✅ 直接使用注入的依賴
    const users = await this.repository.list()
  }
}
```

**優點**:
- Controller 與容器解耦
- 依賴明確清晰
- 易於單元測試
- 遵循依賴倒轉原則
- 清晰的責任分離

## 依賴流向圖

```
ServiceProvider (配置)
    ↓
Container (管理)
    ↓
Routes (獲取)
    ↓
Controller (使用)
    ↓
  Methods
```

## 單元測試（不需要容器）

```typescript
import { UserController } from './UserController'
import { InMemoryUserRepository } from '../Mocks/InMemoryUserRepository'
import { MockCreateUserHandler } from '../Mocks/MockCreateUserHandler'

describe('UserController', () => {
  let controller: UserController
  let repository: InMemoryUserRepository

  beforeEach(() => {
    repository = new InMemoryUserRepository()
    const handler = new MockCreateUserHandler()

    // ✅ 注入 mock 依賴
    controller = new UserController(repository, handler)
  })

  it('should list users', async () => {
    const ctx = createMockContext()
    const result = await controller.index(ctx)

    expect(result).toEqual({ success: true, data: [] })
  })
})
```

## 最佳實踐

### ✅ DO

1. **在 ServiceProvider 中配置所有依賴**
   - Container 是單一的配置入點

2. **通過構造函數注入依賴**
   - 明確的依賴聲明
   - 易於測試

3. **使用中間件從容器獲取**
   - Routes 層負責容器交互
   - Controllers 層保持純淨

4. **實現接口，注入接口**
   - `IUserRepository` 而不是 `UserRepository`
   - 便於交換實現

5. **單例用於無狀態的依賴**
   - Repository, Handlers (狀態在數據庫中)

6. **工廠用於有狀態的依賴**
   - Controllers (每次請求新實例)

### ❌ DON'T

1. ❌ 在 Routes 中直接創建 Controller
2. ❌ 在 Controller 方法中訪問容器
3. ❌ Controller 與容器耦合
4. ❌ 隱藏依賴（在方法內創建）
5. ❌ 混合 DI 和直接實例化

## 擴展範例

### 添加新的應用服務

```typescript
// 1. 在 ServiceProvider 註冊
container.factory('updateUserHandler', (c: Container) => {
  const repository = c.make('userRepository')
  return new UpdateUserHandler(repository)
})

// 2. 注入到 Controller
export class UserController {
  constructor(
    private repository: IUserRepository,
    private createUserHandler: CreateUserHandler,
    private updateUserHandler: UpdateUserHandler  // ← 新的
  ) {}
}

// 3. 在 Routes 中使用
core.router.patch('/api/users/:id', (ctx) => {
  const controller = getController(ctx)
  return controller.update(ctx)
})
```

### 使用不同的 Repository 實現

```typescript
// 開發環境
if (process.env.APP_ENV === 'development') {
  container.singleton('userRepository', () => new InMemoryUserRepository())
}

// 生產環境
if (process.env.APP_ENV === 'production') {
  container.singleton('userRepository', () => new DatabaseUserRepository())
}
```

## 與 Health 模組的對比

User 和 Health 模組現在都遵循相同的 DI 模式：

| 層級 | User | Health |
|------|------|--------|
| Domain | User, IUserRepository | HealthCheck, IHealthCheckRepository |
| Application | CreateUserHandler | PerformHealthCheckService |
| Infrastructure | UserRepository, UserServiceProvider | MemoryHealthCheckRepository, HealthServiceProvider |
| Presentation | UserController | HealthController |
| Routes | 從容器注入 | 從容器注入 |

---

**User 模組現在是依賴注入的完美範例。** 🎯
