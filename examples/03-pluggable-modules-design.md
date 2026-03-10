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

3. 無依賴集成 (Dependency-Free Integration)
   └─ 透過 DI 容器管理依賴
   └─ 零硬編碼依賴
```

---

## 完整實作案例：Shop Module

建立一個完整的購物模組，展示所有隔離設計原則。

### 1. 模組公開 API 定義

**`src/Modules/Shop/index.ts`** - 唯一的公開入口

```typescript
/**
 * Shop Module - 購物模組
 *
 * 此模組提供購物車和訂單管理功能。
 * 只透過此公開 API 使用本模組。
 */

// ============ 公開介面（允許暴露） ============

export { IShopRepository } from './Domain/Repositories/IShopRepository'
export { IOrderService } from './Application/Contracts/IOrderService'

// ============ 公開 DTOs（允許暴露） ============

export type {
  CreateOrderDTO,
  OrderItemDTO,
  OrderResponseDTO
} from './Application/DTOs/OrderDTOs'

export type {
  CreateCartDTO,
  AddToCartDTO,
  CartResponseDTO
} from './Application/DTOs/CartDTOs'

// ============ 模組服務（應用層） ============

export { CreateOrderService } from './Application/Services/CreateOrderService'
export { CartService } from './Application/Services/CartService'

// ============ 模組配置 ============

/**
 * Shop 模組配置介面
 * 使用方提供這些依賴，模組就能正常工作
 */
export interface ShopModuleConfig {
  // 必須的依賴
  orderRepository: IShopRepository

  // 可選的依賴（提供增強功能）
  cache?: {
    get(key: string): Promise<any>
    set(key: string, value: any, ttl?: number): Promise<void>
  }

  logger?: {
    info(message: string, meta?: any): void
    error(message: string, error?: Error): void
  }
}

/**
 * 初始化 Shop 模組
 *
 * @param config 模組配置
 * @returns 模組服務集合
 *
 * @example
 * ```typescript
 * const shopModule = initShopModule({
 *   orderRepository: new SqliteShopRepository(),
 *   cache: new RedisCache()
 * })
 * ```
 */
export function initShopModule(config: ShopModuleConfig) {
  return {
    createOrderService: new CreateOrderService(config.orderRepository),
    cartService: new CartService(config.orderRepository, config.cache)
  }
}

// ============ 不暴露以下內容 ============
// ❌ export { ShopController } - 控制器是使用方的責任
// ❌ export { SqliteShopRepository } - 實作細節隱藏
// ❌ export { Order } - 領域實體隱藏
```

---

### 2. 介面定義（核心契約）

**`src/Modules/Shop/Domain/Repositories/IShopRepository.ts`**

```typescript
/**
 * Shop 倉庫介面
 *
 * 此介面定義了所有操作，實現類必須遵循此契約。
 * 任何資料庫實作都必須實現此介面。
 */
export interface IShopRepository {
  // ===== Order Operations =====

  /**
   * 建立訂單
   */
  createOrder(orderData: CreateOrderData): Promise<Order>

  /**
   * 查找訂單
   */
  findOrderById(id: string): Promise<Order | null>

  /**
   * 列出使用者的訂單
   */
  listUserOrders(userId: string): Promise<Order[]>

  /**
   * 更新訂單狀態
   */
  updateOrderStatus(id: string, status: OrderStatus): Promise<void>

  // ===== Cart Operations =====

  /**
   * 取得購物車
   */
  getCart(userId: string): Promise<Cart | null>

  /**
   * 建立購物車
   */
  createCart(userId: string): Promise<Cart>

  /**
   * 更新購物車項目
   */
  updateCartItems(userId: string, items: CartItem[]): Promise<void>

  /**
   * 清空購物車
   */
  clearCart(userId: string): Promise<void>
}

interface CreateOrderData {
  userId: string
  items: { productId: string; quantity: number }[]
  totalPrice: number
  shippingAddress: string
}

interface Order {
  id: string
  userId: string
  items: CartItem[]
  status: OrderStatus
  totalPrice: number
  createdAt: Date
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

interface Cart {
  userId: string
  items: CartItem[]
  totalPrice: number
  updatedAt: Date
}

interface CartItem {
  productId: string
  quantity: number
  price: number
}
```

**`src/Modules/Shop/Application/Contracts/IOrderService.ts`**

```typescript
/**
 * Order 服務公開介面
 * 其他模組可透過此介面與 Shop 模組通訊
 */
export interface IOrderService {
  createOrder(data: CreateOrderData): Promise<Order>
  getOrder(id: string): Promise<Order | null>
  getOrderStatus(id: string): Promise<OrderStatus>
}
```

---

### 3. 領域層（完全隱藏）

**`src/Modules/Shop/Domain/Entities/Order.ts`**

```typescript
import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { CartItem } from '../ValueObjects/CartItem'

/**
 * 訂單聚合根
 *
 * 設計考量：
 * - 狀態機制：嚴格控制狀態轉移
 * - 不可變性：訂單建立後只能轉移狀態，不能修改項目
 * - 驗證：所有業務規則在領域層實施
 */
export class Order extends AggregateRoot {
  private status: OrderStatus = 'pending'

  constructor(
    id: string,
    readonly userId: string,
    readonly items: CartItem[],
    readonly shippingAddress: string,
    readonly totalPrice: number,
    readonly createdAt: Date = new Date()
  ) {
    super(id)
    this.validate()
  }

  private validate(): void {
    if (this.items.length === 0) {
      throw new Error('Order must have at least one item')
    }

    if (this.totalPrice <= 0) {
      throw new Error('Order total must be greater than 0')
    }
  }

  /**
   * 確認訂單
   */
  confirm(): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot confirm order with status "${this.status}"`)
    }
    this.status = 'confirmed'
  }

  /**
   * 發貨
   */
  ship(): void {
    if (this.status !== 'confirmed') {
      throw new Error(`Cannot ship order with status "${this.status}"`)
    }
    this.status = 'shipped'
  }

  /**
   * 配送完成
   */
  deliver(): void {
    if (this.status !== 'shipped') {
      throw new Error(`Cannot deliver order with status "${this.status}"`)
    }
    this.status = 'delivered'
  }

  /**
   * 取消訂單
   */
  cancel(): void {
    if (['delivered', 'cancelled'].includes(this.status)) {
      throw new Error(`Cannot cancel order with status "${this.status}"`)
    }
    this.status = 'cancelled'
  }

  /**
   * 取得訂單狀態
   */
  getStatus(): OrderStatus {
    return this.status
  }

  /**
   * 轉換為 DTO（用於回應）
   */
  toDTO(): OrderResponseDTO {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      status: this.status,
      totalPrice: this.totalPrice,
      shippingAddress: this.shippingAddress,
      createdAt: this.createdAt
    }
  }
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export type OrderResponseDTO = Omit<Order, 'validate' | 'confirm' | 'ship' | 'deliver' | 'cancel' | 'getStatus'>
```

---

### 4. 應用層（服務與 DTOs）

**`src/Modules/Shop/Application/DTOs/OrderDTOs.ts`**

```typescript
import { z } from 'zod'

/**
 * DTO 驗證結構
 * 注意：DTO 在應用層定義，可以被其他模組使用
 */

export const createOrderSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  items: z.array(
    z.object({
      productId: z.string().uuid('Invalid product ID'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1')
    })
  ).min(1, 'Order must have at least one item'),
  shippingAddress: z.string().min(10, 'Shipping address too short'),
  totalPrice: z.number().positive('Total price must be positive')
})

export type CreateOrderDTO = z.infer<typeof createOrderSchema>

export interface OrderResponseDTO {
  id: string
  userId: string
  status: string
  totalPrice: number
  items: any[]
  shippingAddress: string
  createdAt: Date
}
```

**`src/Modules/Shop/Application/Services/CreateOrderService.ts`**

```typescript
import { IShopRepository } from '../../Domain/Repositories/IShopRepository'
import { Order } from '../../Domain/Entities/Order'
import { CreateOrderDTO, createOrderSchema } from '../DTOs/OrderDTOs'

/**
 * 建立訂單應用服務
 *
 * 此服務協調領域層和基礎設施層
 * 注意：構造函數只依賴介面，不依賴具體實作
 */
export class CreateOrderService {
  constructor(
    private repository: IShopRepository // 只依賴介面
  ) {}

  async execute(input: unknown): Promise<string> {
    // 驗證輸入
    const result = createOrderSchema.safeParse(input)
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(result.error.flatten())}`)
    }

    const dto = result.data

    // 建立領域物件
    const order = new Order(
      crypto.randomUUID(),
      dto.userId,
      dto.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })) as any[],
      dto.shippingAddress,
      dto.totalPrice
    )

    // 持久化（透過介面）
    const created = await this.repository.createOrder({
      userId: order.userId,
      items: order.items,
      totalPrice: order.totalPrice,
      shippingAddress: order.shippingAddress
    })

    return created.id
  }
}
```

---

### 5. 基礎設施層（完全可替換）

**`src/Modules/Shop/Infrastructure/Repositories/SqliteShopRepository.ts`**

```typescript
import { IShopRepository } from '../../Domain/Repositories/IShopRepository'
import { Order } from '../../Domain/Entities/Order'

/**
 * SQLite Shop 倉庫實作
 *
 * 可以完全替換為 MongoShopRepository 或 PostgresShopRepository
 * 只要實現 IShopRepository 介面即可
 */
export class SqliteShopRepository implements IShopRepository {
  // 在實際應用中，使用真實的資料庫連接
  private orders = new Map<string, Order>()
  private carts = new Map<string, Cart>()

  async createOrder(data: CreateOrderData): Promise<Order> {
    const order = new Order(
      crypto.randomUUID(),
      data.userId,
      data.items,
      data.shippingAddress,
      data.totalPrice
    )
    this.orders.set(order.id, order)
    return order
  }

  async findOrderById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null
  }

  async listUserOrders(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.userId === userId)
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
    const order = this.orders.get(id)
    if (!order) throw new Error('Order not found')

    switch (status) {
      case 'confirmed':
        order.confirm()
        break
      case 'shipped':
        order.ship()
        break
      case 'delivered':
        order.deliver()
        break
      case 'cancelled':
        order.cancel()
        break
    }
  }

  async getCart(userId: string): Promise<Cart | null> {
    return this.carts.get(userId) || null
  }

  async createCart(userId: string): Promise<Cart> {
    const cart = { userId, items: [], totalPrice: 0, updatedAt: new Date() }
    this.carts.set(userId, cart)
    return cart
  }

  async updateCartItems(userId: string, items: CartItem[]): Promise<void> {
    const cart = await this.getCart(userId)
    if (!cart) {
      await this.createCart(userId)
    }
    const updated = this.carts.get(userId)!
    updated.items = items
    updated.totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    updated.updatedAt = new Date()
  }

  async clearCart(userId: string): Promise<void> {
    this.carts.delete(userId)
  }
}
```

**`src/Modules/Shop/Infrastructure/Repositories/MongoShopRepository.ts`**

```typescript
import { IShopRepository } from '../../Domain/Repositories/IShopRepository'

/**
 * MongoDB Shop 倉庫實作
 *
 * 與 SqliteShopRepository 實現完全相同的介面
 * 使用者無需知道實作細節，可以自由切換
 */
export class MongoShopRepository implements IShopRepository {
  constructor(private mongoClient: any) {}

  async createOrder(data: CreateOrderData): Promise<Order> {
    // MongoDB 實作
    const result = await this.mongoClient.db('shop').collection('orders').insertOne({
      userId: data.userId,
      items: data.items,
      status: 'pending',
      totalPrice: data.totalPrice,
      shippingAddress: data.shippingAddress,
      createdAt: new Date()
    })

    return new Order(
      result.insertedId.toString(),
      data.userId,
      data.items,
      data.shippingAddress,
      data.totalPrice
    )
  }

  // ... 其他方法的 MongoDB 實作
}
```

---

### 6. 模組集成到應用程式

**`src/app.ts`** - 統一的 DI 配置

```typescript
import { Application } from '@gravito/core'
import {
  initShopModule,
  ShopModuleConfig
} from './Modules/Shop'

import {
  SqliteShopRepository
} from './Modules/Shop/Infrastructure/Repositories/SqliteShopRepository'

export async function createApp() {
  const core = await new Application().bootstrap()
  const container = core.container

  // ========== 選擇實作方式 ==========

  // 方式 1：使用工廠方法（環境感知）
  const repositoryDriver = process.env.DB_DRIVER || 'sqlite'
  let shopRepository

  switch (repositoryDriver) {
    case 'mongodb':
      shopRepository = new MongoShopRepository(mongoClient)
      break
    case 'postgres':
      shopRepository = new PostgresShopRepository(pgPool)
      break
    case 'sqlite':
    default:
      shopRepository = new SqliteShopRepository()
  }

  // ========== 初始化模組 ==========

  const shopModuleConfig: ShopModuleConfig = {
    orderRepository: shopRepository,
    cache: redisCache, // 可選
    logger: logger      // 可選
  }

  const shopModule = initShopModule(shopModuleConfig)

  // ========== 在容器中註冊 ==========

  container.singleton('OrderRepository', () => shopRepository)
  container.singleton('CreateOrderService', () => shopModule.createOrderService)
  container.singleton('CartService', () => shopModule.cartService)

  return core
}
```

---

### 7. 在控制器中使用

**`src/Modules/Shop/Presentation/Controllers/OrderController.ts`**

```typescript
import { Context } from '@gravito/core'
import {
  CreateOrderService,
  CreateOrderDTO,
  OrderResponseDTO
} from '../../index' // 只導入公開 API

/**
 * Order 控制器
 *
 * 注意：此控制器對實作細節一無所知
 * 它只知道介面，所以任何實作切換都不會影響它
 */
export class OrderController {
  private createOrderService: CreateOrderService

  constructor(context: Context) {
    // 從容器中解析服務
    this.createOrderService = context.get('CreateOrderService')
  }

  async create(request: Request): Promise<Response> {
    try {
      const body = await request.json()

      // 呼叫服務（倉庫是什麼實作？不知道，不在乎）
      const orderId = await this.createOrderService.execute(body)

      return new Response(
        JSON.stringify({
          success: true,
          data: { orderId }
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  private handleError(error: unknown): Response {
    console.error(error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

在路由中：

```typescript
import { OrderController } from './Modules/Shop/Presentation/Controllers/OrderController'

export function setupRoutes(app: Application) {
  const orderController = new OrderController(app.context)

  app.post('/api/orders', (req) => orderController.create(req))
}
```

---

### 8. 模組隔離性測試

**`tests/Unit/Shop/CreateOrderService.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { CreateOrderService } from '@/Modules/Shop/Application/Services/CreateOrderService'
import { IShopRepository } from '@/Modules/Shop'

describe('CreateOrderService - 完全隔離', () => {
  it('should work with any repository implementation', async () => {
    // Mock 倉庫（不依賴真實資料庫）
    const mockRepository: IShopRepository = {
      createOrder: async (data) => ({
        id: crypto.randomUUID(),
        ...data,
        status: 'pending',
        createdAt: new Date()
      }),
      findOrderById: async () => null,
      listUserOrders: async () => [],
      updateOrderStatus: async () => {},
      getCart: async () => null,
      createCart: async () => ({ userId: '', items: [], totalPrice: 0, updatedAt: new Date() }),
      updateCartItems: async () => {},
      clearCart: async () => {}
    }

    const service = new CreateOrderService(mockRepository)

    const orderId = await service.execute({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 }],
      shippingAddress: '123 Main Street, City, Country 12345',
      totalPrice: 299.98
    })

    expect(orderId).toBeDefined()
    expect(typeof orderId).toBe('string')
  })

  it('should work with different repository without code change', async () => {
    // 切換到不同的倉庫實作
    const mongoRepository = new MongoShopRepository(mongoClient)
    const service = new CreateOrderService(mongoRepository)

    // 完全相同的測試邏輯，服務不需改動
    const orderId = await service.execute({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 }],
      shippingAddress: '123 Main Street, City, Country 12345',
      totalPrice: 299.98
    })

    expect(orderId).toBeDefined()
  })
})
```

---

### 9. 完整替換檢查

```bash
# 步驟 1：編輯 app.ts，替換倉庫實作
# 從 SqliteShopRepository 改為 MongoShopRepository

# 步驟 2：型別檢查
bun run typecheck
# 預期：✅ 通過（因為都實現 IShopRepository）

# 步驟 3：執行所有測試
bun test
# 預期：✅ 所有測試通過

# 步驟 4：執行應用程式
bun run dev
# 預期：✅ 應用程式正常啟動，API 工作正常

# 結論：🎉 模組完全隔離，可以安全替換！
```

---

## 模組設計檢查清單

### 設計階段

- [ ] 定義公開 API（介面 + DTO）
- [ ] 建立 `index.ts` 作為唯一入口
- [ ] 設計 `ModuleConfig` 介面以定義依賴
- [ ] 建立 `initModule()` 函數以初始化模組
- [ ] 定義領域層的所有介面

### 實作階段

- [ ] 領域層使用值物件和聚合根
- [ ] 應用層使用 DTO 和驗證
- [ ] 基礎設施層實現介面
- [ ] 沒有直接的 `import` 跨模組（除了公開 API）
- [ ] 所有依賴都透過建構函數注入

### 整合階段

- [ ] 在 `app.ts` 中集中配置 DI
- [ ] 控制器只依賴公開 API
- [ ] 所有倉庫都實現相同的介面
- [ ] 支援環境特定的實作選擇

### 測試階段

- [ ] 單元測試使用 Mock 倉庫
- [ ] 整合測試驗證真實倉庫
- [ ] 驗證可以無痛替換倉庫實作
- [ ] 測試涵蓋所有業務邏輯

---

## 快速參考

```typescript
// ✅ 模組設計模板

// 1. 公開 API
export interface IMyRepository { /* ... */ }
export type MyDTO = { /* ... */ }
export interface MyModuleConfig {
  repository: IMyRepository
}
export function initMyModule(config: MyModuleConfig) { /* ... */ }

// 2. 應用服務（只依賴介面）
export class MyService {
  constructor(private repo: IMyRepository) {}
}

// 3. 多個倉庫實作
class SqliteMyRepository implements IMyRepository { }
class MongoMyRepository implements IMyRepository { }
class PostgresMyRepository implements IMyRepository { }

// 4. 在 app.ts 中選擇實作
const repo = process.env.DB === 'mongo'
  ? new MongoMyRepository()
  : new SqliteMyRepository()

const module = initMyModule({ repository: repo })
container.singleton('MyService', () => module.service)

// 就這麼簡單！🎉
```
