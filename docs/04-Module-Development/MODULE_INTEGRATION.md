# 模組集成與隔離設計指南 (Module Integration & Isolation)

此指南定義了如何以可插拔、無依賴的方式集成和使用模組，確保模組可以被安全地抽離或替換。

## 核心設計原則

### 1. **依賴反轉原則 (Dependency Inversion Principle)**

```
❌ 錯誤：使用模組依賴實作細節
Controller → ProductService → MySQLRepository

✅ 正確：使用模組透過介面
Controller → IProductRepository (Interface)
         ↓
      ProductRepository (Implementation)
```

### 2. **模組自包含性**

```
每個模組 = 獨立的有限上下文 (Bounded Context)

模組內部：
  - 可以使用任何技術棧
  - 可以選擇任何資料庫
  - 可以選擇任何外部服務

模組外部：
  - 只透過公開介面暴露
  - 只使用定義好的 DTOs
  - 只透過事件或方法簽名通訊
```

### 3. **可替換性**

```
今天使用 PostgreSQL →
明天換 MongoDB
只需更換 Repository 實作，
控制器、應用服務無需改動
```

---

## 模組結構與介面規範

### 模組公開介面

每個模組必須有 `index.ts` 定義其公開 API：

**`src/Modules/Product/index.ts`**

```typescript
/**
 * Product Module - 公開 API
 *
 * 此模組提供產品管理功能。
 * 使用時只需依賴此介面，無需關心實作細節。
 */

// ============== Domain Layer (已抽象) ==============
export { IProductRepository } from './Domain/Repositories/IProductRepository'
export type { ProductStatusType } from './Domain/ValueObjects/ProductStatus'

// ============== Application Layer (服務) ==============
export { CreateProductService } from './Application/Services/CreateProductService'
export { ListProductsService } from './Application/Services/ListProductsService'
export type { CreateProductDTO } from './Application/DTOs/CreateProductDTO'

// ============== Module Registration ==============
/**
 * 模組初始化配置
 * 使用 DI 容器在 app.ts 中註冊此模組
 */
export interface ProductModuleConfig {
  // 倉庫實作（允許注入不同實作）
  repository: IProductRepository
}

/**
 * 初始化 Product 模組
 * @param config 模組配置
 * @returns 模組應用服務
 */
export function initProductModule(config: ProductModuleConfig) {
  return {
    createProductService: new CreateProductService(config.repository),
    listProductsService: new ListProductsService(config.repository)
  }
}

// ============== Presentation Layer (不暴露) ==============
// ❌ 不暴露控制器實作細節
// export { ProductController } - 控制器是使用方的責任
```

---

## DI 容器與模組註冊

### 統一的 DI 設定模式

**`src/app.ts`**

```typescript
import { Context } from '@gravito/core'
import { initProductModule, ProductModuleConfig } from './Modules/Product'
import { ProductRepository } from './Modules/Product/Infrastructure/Repositories/ProductRepository'

/**
 * 應用程式初始化
 *
 * 責任：
 * 1. 建立 DI 容器
 * 2. 註冊所有模組
 * 3. 配置全域中介軟體
 */
export async function createApp() {
  const core = await new Application().bootstrap()
  const container = core.container

  // ========== 模組註冊開始 ==========

  // ─── Product Module ───
  {
    // 1. 註冊倉庫實作
    container.singleton('ProductRepository', () => {
      return new ProductRepository()
    })

    // 2. 初始化模組
    const productRepository = container.get('ProductRepository')
    const productModule = initProductModule({
      repository: productRepository
    })

    // 3. 註冊模組服務到容器
    container.singleton('CreateProductService', () => productModule.createProductService)
    container.singleton('ListProductsService', () => productModule.listProductsService)
  }

  // ─── Order Module ───
  {
    container.singleton('OrderRepository', () => {
      return new OrderRepository()
    })

    const orderRepository = container.get('OrderRepository')
    const orderModule = initOrderModule({
      repository: orderRepository
    })

    container.singleton('CreateOrderService', () => orderModule.createOrderService)
  }

  // ========== 模組註冊結束 ==========

  return core
}
```

### 環境特定的實作

根據環境選擇不同的實作：

**`src/Infrastructure/Repositories/Factory.ts`**

```typescript
import { IProductRepository } from '@/Modules/Product'

/**
 * 倉庫工廠
 * 根據環境選擇合適的實作
 */
export class RepositoryFactory {
  static createProductRepository(): IProductRepository {
    const driver = process.env.DB_DRIVER || 'sqlite'

    switch (driver) {
      case 'postgres':
        return new PostgresProductRepository()
      case 'mongodb':
        return new MongoProductRepository()
      case 'sqlite':
      default:
        return new SqliteProductRepository()
    }
  }

  static createOrderRepository() {
    // ... 類似的工廠模式
  }
}
```

在 `app.ts` 中使用：

```typescript
import { RepositoryFactory } from './Infrastructure/Repositories/Factory'

container.singleton('ProductRepository', () => {
  return RepositoryFactory.createProductRepository()
})
```

---

## 模組間通訊

### 方式 1：事件驅動（推薦）

最鬆耦合的方式，模組間完全獨立：

**Product 模組發佈事件**

```typescript
// src/Modules/Product/Domain/Events/ProductCreatedEvent.ts
export class ProductCreatedEvent extends DomainEvent {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly price: number
  ) {
    super('Product.Created', id)
  }
}
```

**Inventory 模組監聽事件**

```typescript
// src/Modules/Inventory/Application/Subscribers/ProductCreatedSubscriber.ts
export class ProductCreatedSubscriber {
  constructor(private inventoryService: InventoryService) {}

  async onProductCreated(event: ProductCreatedEvent) {
    // 當產品建立時，自動初始化庫存
    await this.inventoryService.initializeInventory(
      event.id,
      event.name,
      0 // 初始庫存為 0
    )
  }
}
```

**在 `app.ts` 中註冊訂閱者**

```typescript
import { EventEmitter } from '@gravito/core'
import { ProductCreatedSubscriber } from './Modules/Inventory/Application/Subscribers/ProductCreatedSubscriber'

const eventEmitter = core.eventEmitter
const productRepository = container.get('ProductRepository')

const productCreatedSubscriber = new ProductCreatedSubscriber(
  container.get('InventoryService')
)

eventEmitter.subscribe(
  'Product.Created',
  (event) => productCreatedSubscriber.onProductCreated(event)
)
```

### 方式 2：共享介面（謹慎使用）

當需要同步調用時：

```typescript
// 定義共享介面（放在兩個模組都能訪問的地方）
export interface IProductService {
  getProductById(id: string): Promise<Product | null>
  listProducts(filters?: any): Promise<Product[]>
}

// Product 模組提供實作
export class ProductService implements IProductService {
  constructor(private repository: IProductRepository) {}

  async getProductById(id: string) {
    return this.repository.findById(id)
  }

  async listProducts(filters?: any) {
    return this.repository.findAll(filters)
  }
}

// 其他模組透過介面使用
export class OrderService {
  constructor(private productService: IProductService) {}

  async createOrder(items: OrderItem[]) {
    // 驗證產品存在
    for (const item of items) {
      const product = await this.productService.getProductById(item.productId)
      if (!product) throw new Error('Product not found')
    }
    // ... 建立訂單
  }
}

// 在 app.ts 中註冊
container.singleton('ProductService', () => {
  return new ProductService(container.get('ProductRepository'))
})

container.singleton('OrderService', () => {
  return new OrderService(container.get('ProductService'))
})
```

---

## 在 Controller 中使用模組

**`src/Modules/Product/Presentation/Controllers/ProductController.ts`**

```typescript
import { Context } from '@gravito/core'
import { CreateProductService, ListProductsService } from '../../index'

/**
 * 控制器只負責 HTTP 處理
 * 所有業務邏輯委派給應用服務
 */
export class ProductController {
  private createProductService: CreateProductService
  private listProductsService: ListProductsService

  constructor(private context: Context) {
    // 從容器中解析服務（介面綁定）
    this.createProductService = context.get('CreateProductService')
    this.listProductsService = context.get('ListProductsService')
  }

  async create(request: Request) {
    try {
      const body = await request.json()
      const id = await this.createProductService.execute(body)

      return new Response(
        JSON.stringify({ success: true, data: { id } }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  async list() {
    const products = await this.listProductsService.execute()
    return new Response(
      JSON.stringify({ success: true, data: products }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  private handleError(error: unknown) {
    // ... 錯誤處理邏輯
  }
}
```

在路由中使用：

```typescript
// src/routes.ts
import { ProductController } from './Modules/Product/Presentation/Controllers/ProductController'

export function setupRoutes(app: Application) {
  const productController = new ProductController(app.context)

  app.post('/api/products', (req) => productController.create(req))
  app.get('/api/products', () => productController.list())
}
```

---

## 測試模組隔離性

### 單元測試：Mock 倉庫

```typescript
import { describe, it, expect } from 'bun:test'
import { CreateProductService } from '@/Modules/Product/Application/Services/CreateProductService'
import { IProductRepository } from '@/Modules/Product'

describe('CreateProductService - 隔離測試', () => {
  it('should work with any repository implementation', async () => {
    // 建立 Mock 倉庫（不依賴真實資料庫）
    const mockRepository: IProductRepository = {
      findById: async () => null,
      findBySku: async () => null,
      save: async () => {},
      findAll: async () => [],
      delete: async () => {}
    }

    const service = new CreateProductService(mockRepository)

    const id = await service.execute({
      name: 'Test Product',
      description: 'Test',
      price: 100,
      sku: 'TEST-001'
    })

    expect(id).toBeDefined()
  })

  it('should work with different repository implementation', async () => {
    // 可以輕易切換成不同的倉庫實作
    const mongoRepository = new MongoProductRepository()
    const service = new CreateProductService(mongoRepository)

    // 完全相同的測試邏輯
    const id = await service.execute({
      name: 'Test Product',
      description: 'Test',
      price: 100,
      sku: 'TEST-002'
    })

    expect(id).toBeDefined()
  })
})
```

### 整合測試：驗證模組互動

```typescript
describe('Product 和 Order 模組互動', () => {
  it('should create order when product exists', async () => {
    // 1. 初始化模組
    const productModule = initProductModule({
      repository: new ProductRepository()
    })

    const orderModule = initOrderModule({
      repository: new OrderRepository(),
      productService: productModule.getProductService() // 透過介面注入
    })

    // 2. 建立產品
    const productId = await productModule.createProductService.execute({
      name: 'Laptop',
      price: 999.99,
      sku: 'LAPTOP-001'
    })

    // 3. 建立訂單
    const orderId = await orderModule.createOrderService.execute({
      items: [{ productId, quantity: 1 }]
    })

    expect(orderId).toBeDefined()
  })
})
```

---

## 模組抽離檢查清單

當你想抽離一個模組時，確認以下項目：

### 依賴檢查

- [ ] 模組只依賴注入的介面
- [ ] 沒有硬編碼的 import 路徑（除了自己的模組）
- [ ] 所有外部依賴都透過 DI 注入
- [ ] 沒有全域單例（除了框架提供的）

### 介面檢查

- [ ] 模組有清晰的公開 API（index.ts）
- [ ] 所有公開服務都有介面定義
- [ ] 私有實作完全隱藏
- [ ] DTOs 都在 Application 層且可重用

### 通訊檢查

- [ ] 模組間通訊使用事件或介面
- [ ] 沒有直接的循環依賴
- [ ] 事件名稱遵循 `ModuleName.EventType` 格式
- [ ] 沒有隱藏的共享狀態

### 配置檢查

```typescript
// ✅ 可抽離的模組配置
export interface ProductModuleConfig {
  repository: IProductRepository
  cache?: ICacheService // 可選
}

export function initProductModule(config: ProductModuleConfig) {
  return {
    createService: new CreateProductService(config.repository, config.cache),
    listService: new ListProductsService(config.repository)
  }
}
```

### 替換檢查

- [ ] 替換倉庫實作而不改動任何其他代碼
- [ ] 替換快取實作而不改動任何其他代碼
- [ ] 移除模組而不產生編譯錯誤

```bash
# 替換檢查命令
1. 編輯 src/app.ts，更改倉庫實作
2. 運行 bun run typecheck
3. 運行 bun test
4. 如果都通過 → 模組隔離良好 ✅
```

---

## 實際案例：模組替換示例

### 原始配置（使用 SQLite）

**`src/app.ts`**

```typescript
import { SqliteProductRepository } from './Modules/Product/Infrastructure/Repositories/SqliteProductRepository'

container.singleton('ProductRepository', () => {
  return new SqliteProductRepository()
})
```

### 替換為 MongoDB（無其他改動）

```typescript
import { MongoProductRepository } from './Modules/Product/Infrastructure/Repositories/MongoProductRepository'

container.singleton('ProductRepository', () => {
  return new MongoProductRepository()
})
```

**結果**：
- ✅ 所有控制器無需改動
- ✅ 所有應用服務無需改動
- ✅ 所有測試無需改動
- ✅ 型別檢查通過
- ✅ 所有測試通過

---

## 最佳實踐總結

### ✅ 做這些

```typescript
// 1. 依賴注入
export class Service {
  constructor(private repository: IRepository) {} // ✅ 依賴介面
}

// 2. 公開 API
export interface IProductService { /* ... */ } // ✅ 介面
export { type CreateProductDTO } from './DTOs' // ✅ 類型

// 3. 事件驅動
this.eventEmitter.emit('Product.Created', event) // ✅ 解耦

// 4. 配置函數
export function initProductModule(config: Config) {} // ✅ 可配置
```

### ❌ 避免這些

```typescript
// 1. 直接依賴實作
import { ProductRepository } from '...' // ❌ 硬依賴

// 2. 暴露內部細節
export { ProductRepository } // ❌ 實作細節外洩

// 3. 直接呼叫
new ProductService() // ❌ 硬編碼建立

// 4. 全域狀態
export const productService = new ProductService() // ❌ 全域單例
```

---

## 命名規範

```
介面           IProductRepository, IProductService
實作           ProductRepository, ProductService
DTOs          CreateProductDTO, ProductDTO
事件           ProductCreatedEvent, ProductPublishedEvent
服務           ProductService, CreateProductService
控制器         ProductController

事件名稱       'Product.Created', 'Product.Updated'
容器 key       'ProductRepository', 'CreateProductService'
```

---

## 相關資源

- 📖 [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- 🏛️ [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- 📚 [Domain-Driven Design](https://domaindriven.org)
- 🔗 [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
