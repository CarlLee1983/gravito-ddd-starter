# ORM 抽換實戰範例 (ORM Swapping Examples)

本文件透過實際場景展示「ORM 透明設計」的威力。在 Gravito DDD 中，切換持久化技術（如從開發用的 Memory 換成生產用的 PostgreSQL）只需要更改環境變數，**完全不需要修改任何 Repository 或 Service 代碼**。

---

## 🚀 快速開始：零代碼切換

### 範例：從 Memory 切換到 Drizzle (SQLite)

**只需更改環境變數：**

```bash
# 開發環境 (使用 MemoryDatabaseAccess)
ORM=memory bun run dev

# 切換到輕量生產環境 (使用 DrizzleDatabaseAccess)
ORM=drizzle DATABASE_URL=file:./data.db bun run start
```

**就這樣！** 應用程式會自動將對應的資料庫驅動注入到同一個 `UserRepository` 中。

---

## 📊 詳細流程對比

### 場景 A：開發環境 (ORM=memory)

在此模式下，`DatabaseAccessBuilder` 提供一個在記憶體中運行的資料庫模擬器。

```
┌─────────────────────────────────────────────┐
│ bootstrap(port=3000)                        │
│ 讀取環境：ORM=memory                        │
└──────────┬──────────────────────────────────┘
           │
           ├─► DatabaseAccessBuilder 建立 db 實例
           │   └─► 實例化 MemoryDatabaseAccess (implements IDatabaseAccess)
           │
           ├─► UserServiceProvider.register(db)
           │   └─► new UserRepository(db)  ◄─── 注入 Memory 驅動
           │
           └─► 應用啟動，資料存在 JS Map 物件中
```

**輸出結果：**
```text
📦 已選擇 ORM: memory
👤 [User] Module loaded (Using MemoryDatabaseAccess)
```

---

### 場景 B：生產環境 (ORM=drizzle)

在此模式下，同樣的 `UserRepository` 會收到一個連接到 SQLite 的 Drizzle 驅動。

```
┌─────────────────────────────────────────────┐
│ bootstrap(port=3000)                        │
│ 讀取環境：ORM=drizzle                       │
└──────────┬──────────────────────────────────┘
           │
           ├─► DatabaseAccessBuilder 建立 db 實例
           │   └─► 實例化 DrizzleDatabaseAccess (implements IDatabaseAccess)
           │
           ├─► UserServiceProvider.register(db)
           │   └─► new UserRepository(db)  ◄─── 注入 Drizzle 驅動
           │
           └─► 應用啟動，資料持久化於 SQLite 檔案
```

**輸出結果：**
```text
📦 已選擇 ORM: drizzle
👤 [User] Module loaded (Using DrizzleDatabaseAccess)
```

---

## 💡 代碼層級的一致性

### 統一的 Repository 實作

不論底層技術如何，`UserRepository` 的代碼永遠保持不變：

```typescript
// app/Modules/User/Infrastructure/Repositories/UserRepository.ts

export class UserRepository implements IUserRepository {
  // 核心：注入抽像介面，不感知具體 ORM
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<User | null> {
    // 統一的流式查詢 API，由注入的驅動決定如何執行
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }
}
```

---

## 🛠️ 實戰演練：新增一個模組

假設我們要新增 `Order` 模組，並確保它天生支援所有 ORM 切換。

### Step 1：定義 Domain 介面
```typescript
// app/Modules/Order/Domain/Repositories/IOrderRepository.ts
export interface IOrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
}
```

### Step 2：建立唯一的 Repository 實作
```typescript
// app/Modules/Order/Infrastructure/Repositories/OrderRepository.ts
export class OrderRepository implements IOrderRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string) {
    const row = await this.db.table('orders').where('id', '=', id).first()
    return row ? Order.fromDatabase(row) : null
  }
  
  async save(order: Order) {
    await this.db.table('orders').insert(order.toRow())
  }
}
```

### Step 3：在 ServiceProvider 中完成裝配
```typescript
// app/Modules/Order/Infrastructure/Providers/OrderServiceProvider.ts
export class OrderServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('orderRepository', (c) => {
      // 從容器取得已根據環境變數初始化好的 databaseAccess
      const db = c.make('databaseAccess') 
      return new OrderRepository(db)
    })
  }
}
```

---

## 🔄 優勢總結

| 比較維度 | 傳統做法 (舊設計) | Gravito DDD (新設計) |
| :--- | :--- | :--- |
| **類別數量** | 每種 ORM 一個類別 (`DrizzleUserRepo`...) | 永遠只有一個 `UserRepository` |
| **代碼重複** | 不同驅動間有 80% 邏輯重複 | **0% 重複**，邏輯完全統一 |
| **切換成本** | 需要修改注入配置或 ServiceProvider | **零成本**，改環境變數即可 |
| **測試速度** | 需啟動真實 DB 或複雜的 Mock | 直接注入 `MemoryDatabaseAccess` (極速) |

**設計洞察：**
> ORM 的技術複雜性被完整隔離在 `Adapters` 層與 `DatabaseAccessBuilder` 中。
> 對於業務開發者來說，持久化層就像一個「即插即用」的黑盒子。

最後更新: 2026-03-13
