# 範例 3：可插拔模組設計 (Pluggable Modules Architecture)

此範例展示如何設計完全隔離、可插拔的模組，確保可以安全地替換或抽離模組，而不影響其他部分。

## 核心目標

```
構建模組的三個關鍵要素：

1. 隔離性 (Isolation)
   └─ 模組內部實作完全隱藏
   └─ 只透過介面暴露功能

2. 可替換性 (Replaceability)
   └─ 更換實作不影響上層代碼
   └─ 支援不同的資料庫、外部服務

3. 自動佈線整合 (Auto-Wiring Integration)
   └─ 透過 IModuleDefinition 宣告依賴
   └─ 啟動時自動掃描與註冊
```

---

## 完整實作案例：Shop Module

建立一個完整的購物模組，展示所有隔離設計原則。

### 1. 模組公開 API 與裝配定義

**`app/Modules/Shop/index.ts`** - 唯一的公開入口

```typescript
import { ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { ShopController } from './Presentation/Controllers/ShopController'
import { SqliteShopRepository } from './Infrastructure/Repositories/SqliteShopRepository'
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'

/**
 * Shop 模組服務提供者
 */
export class ShopServiceProvider extends ModuleServiceProvider {
  override register(container: any): void {
    console.log('[Shop] Provider registered')
  }
}

/**
 * 模組裝配定義 (符合 ModuleAutoWirer 規範)
 */
export const ShopModule: IModuleDefinition = {
  name: 'Shop',
  
  provider: ShopServiceProvider,

  registerRepositories(db, eventDispatcher) {
    // 策略：根據傳入的 db 適配器類型進行註冊
    // 這使得模組可以無痛切換 Atlas / Drizzle 或不同的資料庫驅動
    console.log(`[Shop] Registering repositories with ${db.constructor.name}`)
    
    // 在容器中註冊單例
    // container.singleton('ShopRepository', () => new SqliteShopRepository(db))
  },

  registerRoutes({ createModuleRouter }) {
    const router = createModuleRouter()
    
    router.post('/orders', ShopController, 'createOrder')
    router.get('/orders/:id', ShopController, 'showOrder')
  }
}

// ============ 公開介面與 DTOs（允許暴露） ============

export { IShopRepository } from './Domain/Repositories/IShopRepository'
export type { CreateOrderDTO, OrderResponseDTO } from './Application/DTOs/OrderDTOs'
```

---

### 2. 介面定義（核心契約）

**`app/Modules/Shop/Domain/Repositories/IShopRepository.ts`**

```typescript
import { Order } from '../Entities/Order'

/**
 * Shop 倉庫介面
 */
export interface IShopRepository {
  /**
   * 建立訂單
   */
  createOrder(data: any): Promise<Order>

  /**
   * 查找訂單
   */
  findOrderById(id: string): Promise<Order | null>
}
```

---

### 3. 領域層（完全隱藏）

**`app/Modules/Shop/Domain/Entities/Order.ts`**

```typescript
import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'

/**
 * 訂單聚合根
 */
export class Order extends AggregateRoot {
  private status: string = 'pending'

  constructor(
    id: string,
    readonly userId: string,
    readonly totalPrice: number,
    readonly shippingAddress: string,
    readonly createdAt: Date = new Date()
  ) {
    super(id)
    this.validate()
  }

  private validate(): void {
    if (this.totalPrice <= 0) {
      throw new Error('Order total must be greater than 0')
    }
  }

  toDTO() {
    return {
      id: this.id,
      userId: this.userId,
      status: this.status,
      totalPrice: this.totalPrice,
      shippingAddress: this.shippingAddress,
      createdAt: this.createdAt
    }
  }
}
```

---

### 4. 應用層（服務與 DTOs）

**`app/Modules/Shop/Application/Services/CreateOrderService.ts`**

```typescript
import { IShopRepository } from '../../Domain/Repositories/IShopRepository'
import { Order } from '../../Domain/Entities/Order'

/**
 * 建立訂單應用服務
 */
export class CreateOrderService {
  constructor(private repository: IShopRepository) {}

  async execute(dto: any): Promise<string> {
    const orderId = crypto.randomUUID()
    const order = new Order(
      orderId,
      dto.userId,
      dto.totalPrice,
      dto.shippingAddress
    )

    await this.repository.createOrder(order)
    return orderId
  }
}
```

---

### 5. 基礎設施層（完全可替換）

**`app/Modules/Shop/Infrastructure/Repositories/SqliteShopRepository.ts`**

```typescript
import { IShopRepository } from '../../Domain/Repositories/IShopRepository'
import { Order } from '../../Domain/Entities/Order'

/**
 * SQLite Shop 倉庫實作
 */
export class SqliteShopRepository implements IShopRepository {
  constructor(private db: any) {}

  async createOrder(order: Order): Promise<Order> {
    console.log('[ShopRepo] Saving to SQLite via Atlas/Drizzle...')
    return order
  }

  async findOrderById(id: string): Promise<Order | null> {
    return null
  }
}
```

---

### 6. 表現層（控制器）

**`app/Modules/Shop/Presentation/Controllers/ShopController.ts`**

```typescript
import { Context } from '@gravito/core'
import { CreateOrderService } from '../../Application/Services/CreateOrderService'
import { IShopRepository } from '../../Domain/Repositories/IShopRepository'

/**
 * Shop 控制器
 */
export class ShopController {
  private createOrderService: CreateOrderService

  constructor(private context: Context) {
    // 1. 從容器解析倉庫 (倉庫實作已被 ModuleAutoWirer 注入)
    const repository = context.container.make<IShopRepository>('ShopRepository')
    
    // 2. 初始化應用服務
    this.createOrderService = new CreateOrderService(repository)
  }

  async createOrder(request: Request): Promise<Response> {
    const body = await request.json()
    const orderId = await this.createOrderService.execute(body)

    return new Response(
      JSON.stringify({ success: true, data: { orderId } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

---

### 7. 自動裝配檢查

在 `app/bootstrap.ts` 中，`ModuleAutoWirer` 會自動完成以下工作：

```typescript
// bootstrap.ts 內部邏輯示意
await ModuleAutoWirer.wire(core, db) 
// 1. 掃描 app/Modules/Shop/index.ts
// 2. 註冊 ShopServiceProvider
// 3. 呼叫 ShopModule.registerRepositories(db, eventDispatcher)
// 4. 裝配 /orders 路由
```

這意味著你 **不需要** 手動在 `app.ts` 或 `routes.ts` 中寫任何關於 Shop 模組的代碼。

---

## 模組設計檢查清單

### 設計階段
- [ ] 建立 `app/Modules/Shop/index.ts` 作為唯一入口
- [ ] 實作 `IModuleDefinition` 介面
- [ ] 確保 `Domain` 層完全不依賴於外部框架

### 實作階段
- [ ] 透過 `registerRepositories` 注入 `db` 適配器
- [ ] 控制器只透過 `context.container.make()` 獲取服務
- [ ] 所有的數據轉換 (Domain -> DTO) 在聚合根內完成

### 測試階段
- [ ] 建立 Mock 倉庫實作進行單元測試
- [ ] 驗證模組可以被無痛替換或移除

---

## 快速參考

```typescript
// ✅ 完美隔離的模組入口模板

export const MyModule: IModuleDefinition = {
  name: 'MyModule',
  provider: MyServiceProvider,
  registerRepositories(db) {
    // 在這裡處理資料庫對接
  },
  registerRoutes({ createModuleRouter }) {
    // 在這裡定義 API 路由
  }
}
```

