# 💎 領域設計詳解 (Domain Design Guide)

本指南深入探討 Domain 層的核心組件設計規範與最佳實踐。

---

## 1. 聚合根 (Aggregates) 與實體 (Entities)

實體是具有唯一身份識別 (Identity) 的對象，而聚合根是聚合的入口點，負責維護內部的一致性。

### 設計規範
- **位置**: `src/Modules/<Module>/Domain/` 下的專屬類別。
- **命名**: 使用名詞，如 `User.ts`, `Order.ts`.
- **規則**:
  - 必須有唯一識別符 (`id`)。
  - 封裝業務規則，禁止外部直接修改內部狀態。
  - 使用 `static create()` 方法作為工廠入口。

```typescript
export class User extends BaseEntity {
  name: string
  status: UserStatus

  static create(data: { name: string; email: string }): User {
    const user = new User()
    user.name = data.name
    user.status = new UserStatus('active')
    // 記錄領域事件
    user.record(new UserCreatedEvent(user.id, data.email))
    return user
  }

  deactivate(): void {
    this.status = new UserStatus('inactive')
  }
}
```

---

## 2. 值物件 (Value Objects)

值物件沒有身份識別，僅由其屬性定義。它們是不可變的 (Immutable)。

### 設計規範
- **位置**: `src/Modules/<Module>/Domain/ValueObjects/`.
- **規則**:
  - 構造函數中執行驗證。
  - 屬性設為 `readonly`.
  - 提供 `equals()` 方法進行值比較。

```typescript
export class Email extends ValueObject {
  readonly value: string

  constructor(value: string) {
    super()
    if (!value.includes('@')) throw new Error('Invalid email format')
    this.value = value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
```

---

## 3. 領域事件 (Domain Events)

領域事件表示業務中發生的重要事情，通常命名為過去分詞。

### 設計規範
- **位置**: `src/Modules/<Module>/Domain/Events/`.
- **規則**:
  - 名稱應反映業務變更 (如 `OrderPaidEvent`)。
  - 包含事件發生時的所有關鍵上下文數據。

```typescript
export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date = new Date()
  ) {
    super()
  }
}
```

---

## 4. 領域服務 (Domain Services)

當業務邏輯不自然地屬於任何單一實體或值物件時，應使用領域服務。

### 設計規範
- **位置**: `src/Modules/<Module>/Domain/Services/`.
- **用途**:
  - 涉及多個聚合的計算或操作。
  - 需要外部 Port (介面) 的協調。

---

## 5. Repository 介面 (Port)

定義領域層對持久化的需求，但不涉及技術實現。

### 設計規範
- **位置**: `src/Modules/<Module>/Domain/Repositories/`.
- **規則**:
  - 僅定義方法簽名。
  - 使用業務術語而非資料庫術語 (使用 `save` 而非 `insert/update`)。

```typescript
export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<void>
}
```

最後更新: 2026-03-13
