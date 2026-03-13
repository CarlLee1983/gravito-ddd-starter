# Wiring 層快速參考 (Quick Reference)

## 核心裝配流程

```text
1. 定義 Domain Port (介面)
2. 實作單一 ORM 無關的 Infrastructure Repository (繼承 BaseEventSourcedRepository)
3. 註冊 Repository 工廠 (於 registerXxxRepositories.ts)
4. 在 ServiceProvider 綁定單例
5. 在 index.ts 導出 Module 契約
```

---

## 1. 註冊 Repository 工廠

**檔案**: `Infrastructure/Providers/registerXxxRepositories.ts`

在最新的架構中，我們使用**單一且 ORM 無關**的 Repository。技術差異（Memory vs DB）已由上層注入的 `IDatabaseAccess` 適配器處理。

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import { UserRepository } from '../Persistence/UserRepository'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function registerUserRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher): void {
  // 註冊一個簡單的工廠，直接實例化唯一的 UserRepository
  const factory = () => new UserRepository(db, eventDispatcher)

  getRegistry().register('user', factory)
}
```

---

## 2. 服務提供者 (ServiceProvider)

**檔案**: `Infrastructure/Providers/XxxServiceProvider.ts`

```typescript
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 1. 從 Registry 解析已註冊的 Repository
    container.singleton('userRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = getDatabaseAccess()
      return registry.create('user', orm, db)
    })

    // 2. 註冊應用服務
    container.singleton('userService', (c) => new UserService(c.make('userRepository')))
    
    // 3. 註冊控制器
    container.singleton('userController', (c) => new UserController(c.make('userService')))
  }
}
```

---

## 3. 模組入口點 (index.ts)

**檔案**: `app/Modules/Xxx/index.ts`

```typescript
export const UserModule: IModuleDefinition = {
  name: 'User',
  provider: UserServiceProvider,
  registerRepositories: registerUserRepositories, // 由 AutoWirer 調用並傳入 db
  registerRoutes: (ctx) => {
    const controller = ctx.container.make('userController')
    const router = ctx.createModuleRouter()
    router.get('/users', (c) => controller.index(c))
  }
}
```

---

## 常用指令

| 任務 | 指令 |
| :--- | :--- |
| **開發模式 (Memory)** | `ORM=memory bun run dev` |
| **輕量模式 (SQLite)** | `ORM=drizzle bun run start` |
| **生產模式 (Atlas)** | `ORM=atlas bun run start` |
| **列出所有路由** | `bun run route:list` |

最後更新: 2026-03-13
