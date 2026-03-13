# 適配器整合範例 (Integration Examples)

本文件提供實際的代碼範例，展示如何在模組中整合基礎設施適配器，並保持領域邏輯的純粹。

---

## 1. 整合資料庫與事件分發 (Repository)

這是最常見的整合場景。Repository 接收 `IDatabaseAccess` 與 `IEventDispatcher`。

**檔案**: `app/Modules/User/Infrastructure/Persistence/UserRepository.ts`

```typescript
export class UserRepository extends BaseEventSourcedRepository<User> implements IUserRepository {
  constructor(
    db: IDatabaseAccess,
    eventDispatcher?: IEventDispatcher
  ) {
    // 傳遞給基類，處理底層 I/O 與事件發送
    super(db, eventDispatcher)
  }

  async findByEmail(email: Email): Promise<User | null> {
    // 使用統一的流式 API
    const row = await this.db.table('users').where('email', '=', email.value).first()
    return row ? this.toDomain(row) : null
  }
}
```

---

## 2. 整合 Redis 與 Cache (Application Service)

應用層服務應依賴 Port 介面，而非具體實現。

**檔案**: `app/Modules/Auth/Application/Services/LoginService.ts`

```typescript
import type { IRedisService } from '@/Shared/Infrastructure/Ports/Messaging/IRedisService'

export class LoginService {
  constructor(
    private readonly redis: IRedisService
  ) {}

  async execute(email: string): Promise<void> {
    // 使用 Redis 適配器紀錄登入嘗試
    await this.redis.set(`login_attempt:${email}`, '1', 300)
  }
}
```

---

## 3. 在 ServiceProvider 中裝配 (Wiring)

這是將所有組件連接在一起的地方。

**檔案**: `app/Modules/User/Infrastructure/Providers/UserServiceProvider.ts`

```typescript
export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 1. 取得 Repository (自動選擇 Memory/DB 適配器)
    container.singleton('userRepository', () => {
      const orm = getCurrentORM()
      const db = getDatabaseAccess()
      return getRegistry().create('user', orm, db)
    })

    // 2. 注入 Repository 到應用服務
    container.singleton('userService', (c) => new UserService(c.make('userRepository')))
  }
}
```

---

## 💡 關鍵設計點

1.  **介面依賴**: 所有的建構子參數都使用 `type` 匯入的介面。
2.  **無感切換**: `getDatabaseAccess()` 在開發環境會回傳 `MemoryDatabaseAccess`，而在生產環境回傳 `Drizzle/Atlas` 適配器。
3.  **零分支**: 業務邏輯中不允許出現 `if (process.env.ORM === ...)`。

最後更新: 2026-03-13
