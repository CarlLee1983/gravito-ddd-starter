# 範例 1：簡單 CRUD 模組 (Simple CRUD Module)

此範例展示如何建立一個簡單的產品 (Product) 模組，包含基本的 CRUD 操作。

## 完整實作

### 1. Domain Layer - 值物件 (Value Objects)

**`app/Modules/Product/Domain/ValueObjects/ProductStatus.ts`**

```typescript
import { ValueObject } from '@/Shared/Domain/ValueObject'

export type ProductStatusType = 'draft' | 'published' | 'archived'

/**
 * 產品狀態值物件
 * 使用受限的狀態集合確保資料一致性
 */
export class ProductStatus extends ValueObject {
  constructor(readonly value: ProductStatusType) {
    super()
    if (!['draft', 'published', 'archived'].includes(value)) {
      throw new Error(`Invalid product status: ${value}`)
    }
  }

  equals(other: any): boolean {
    return other instanceof ProductStatus && other.value === this.value
  }

  toString(): string {
    return this.value
  }

  static draft(): ProductStatus {
    return new ProductStatus('draft')
  }

  static published(): ProductStatus {
    return new ProductStatus('published')
  }

  static archived(): ProductStatus {
    return new ProductStatus('archived')
  }
}
```

**`app/Modules/Product/Domain/ValueObjects/ProductPrice.ts`**

```typescript
import { ValueObject } from '@/Shared/Domain/ValueObject'

/**
 * 產品價格值物件
 * 確保價格始終為正數
 */
export class ProductPrice extends ValueObject {
  constructor(readonly amount: number, readonly currency: string = 'USD') {
    super()
    if (amount <= 0) {
      throw new Error('Price must be greater than 0')
    }
  }

  equals(other: any): boolean {
    return (
      other instanceof ProductPrice &&
      other.amount === this.amount &&
      other.currency === this.currency
    )
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`
  }
}
```

### 2. Domain Layer - 聚合根 (Aggregate Root)

**`app/Modules/Product/Domain/Entities/Product.ts`**

```typescript
import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { ProductStatus } from '../ValueObjects/ProductStatus'
import { ProductPrice } from '../ValueObjects/ProductPrice'

/**
 * 產品聚合根
 * 代表業務領域中的一個產品
 */
export class Product extends AggregateRoot {
  constructor(
    id: string,
    readonly name: string,
    readonly description: string,
    readonly price: ProductPrice,
    readonly status: ProductStatus,
    readonly sku: string,
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date()
  ) {
    super(id)
  }

  /**
   * 發布產品
   */
  publish(): void {
    if (!this.status.equals(ProductStatus.draft())) {
      throw new Error('Only draft products can be published')
    }
    this.status = ProductStatus.published()
  }

  /**
   * 存檔產品
   */
  archive(): void {
    if (this.status.equals(ProductStatus.archived())) {
      throw new Error('Product is already archived')
    }
    this.status = ProductStatus.archived()
  }

  /**
   * 更新價格
   */
  updatePrice(newPrice: ProductPrice): void {
    if (newPrice.equals(this.price)) {
      throw new Error('New price must be different from current price')
    }
    this.price = newPrice
  }

  /**
   * 轉換為普通對象
   */
  toPlainObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price.toString(),
      status: this.status.toString(),
      sku: this.sku,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}
```

### 3. Domain Layer - 倉庫介面 (Repository Interface)

**`app/Modules/Product/Domain/Repositories/IProductRepository.ts`**

```typescript
import { Product, ProductStatusType } from '../Entities/Product'

/**
 * 產品倉庫介面
 * 定義資料存取操作的抽象
 */
export interface IProductRepository {
  /**
   * 根據 ID 查找產品
   */
  findById(id: string): Promise<Product | null>

  /**
   * 根據 SKU 查找產品
   */
  findBySku(sku: string): Promise<Product | null>

  /**
   * 查找所有產品
   */
  findAll(): Promise<Product[]>

  /**
   * 根據狀態查找產品
   */
  findByStatus(status: ProductStatusType): Promise<Product[]>

  /**
   * 保存產品
   */
  save(product: Product): Promise<void>

  /**
   * 刪除產品
   */
  delete(id: string): Promise<void>
}
```

### 4. Application Layer - DTO

**`app/Modules/Product/Application/DTOs/CreateProductDTO.ts`**

```typescript
/**
 * 建立產品 DTO
 * 定義建立產品所需的輸入資料
 */
export interface CreateProductDTO {
  name: string
  description: string
  price: number
  currency?: string
  sku: string
  status?: 'draft' | 'published'
}
```

### 5. Application Layer - 應用服務 (Application Service)

**`app/Modules/Product/Application/Services/CreateProductService.ts`**

```typescript
import { IProductRepository } from '../../Domain/Repositories/IProductRepository'
import { Product } from '../../Domain/Entities/Product'
import { ProductStatus } from '../../Domain/ValueObjects/ProductStatus'
import { ProductPrice } from '../../Domain/ValueObjects/ProductPrice'
import { CreateProductDTO } from '../DTOs/CreateProductDTO'

/**
 * 建立產品應用服務
 * 協調領域層的概念以執行業務邏輯
 */
export class CreateProductService {
  constructor(private repository: IProductRepository) {}

  async execute(dto: CreateProductDTO): Promise<string> {
    // 檢查 SKU 是否已存在
    const existing = await this.repository.findBySku(dto.sku)
    if (existing) {
      throw new Error(`Product with SKU ${dto.sku} already exists`)
    }

    // 建立值物件
    const price = new ProductPrice(dto.price, dto.currency || 'USD')
    const status = dto.status === 'published'
      ? ProductStatus.published()
      : ProductStatus.draft()

    // 建立聚合根
    const id = crypto.randomUUID()
    const product = new Product(
      id,
      dto.name,
      dto.description,
      price,
      status,
      dto.sku
    )

    // 保存到倉庫
    await this.repository.save(product)

    return id
  }
}
```

### 6. Presentation Layer - 控制器 (Controller)

**`app/Modules/Product/Presentation/Controllers/ProductController.ts`**

```typescript
import { Context } from '@gravito/core'
import { CreateProductService } from '../../Application/Services/CreateProductService'
import { IProductRepository } from '../../Domain/Repositories/IProductRepository'

/**
 * 產品控制器
 * 處理 HTTP 請求並調用應用服務
 */
export class ProductController {
  private createProductService: CreateProductService

  constructor(private context: Context) {
    // 使用容器解析依賴 (符合 PlanetCore 規範)
    const productRepository = context.container.make<IProductRepository>('ProductRepository')
    this.createProductService = new CreateProductService(productRepository)
  }

  /**
   * 建立產品
   * POST /api/products
   */
  async create(request: Request) {
    const body = await request.json()

    const productId = await this.createProductService.execute(body)

    return new Response(
      JSON.stringify({
        success: true,
        data: { id: productId },
        message: 'Product created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  /**
   * 獲取所有產品
   * GET /api/products
   */
  async list() {
    const repository = this.context.container.make<IProductRepository>('ProductRepository')
    const products = await repository.findAll()

    return new Response(
      JSON.stringify({
        success: true,
        data: products.map(p => p.toPlainObject())
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  /**
   * 獲取單個產品
   * GET /api/products/:id
   */
  async show(id: string) {
    const repository = this.context.container.make<IProductRepository>('ProductRepository')
    const product = await repository.findById(id)

    if (!product) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Product not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: product.toPlainObject()
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
```

### 7. Infrastructure Layer - 倉庫實作 (Repository Implementation)

**`app/Modules/Product/Infrastructure/Repositories/ProductRepository.ts`**

```typescript
import { IProductRepository } from '../../Domain/Repositories/IProductRepository'
import { Product } from '../../Domain/Entities/Product'
import { ProductStatusType } from '../../Domain/ValueObjects/ProductStatus'

/**
 * 產品倉庫實作
 */
export class ProductRepository implements IProductRepository {
  private products = new Map<string, Product>()

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null
  }

  async findBySku(sku: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.sku === sku) {
        return product
      }
    }
    return null
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values())
  }

  async findByStatus(status: ProductStatusType): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      p => p.status.value === status
    )
  }

  async save(product: Product): Promise<void> {
    this.products.set(product.id, product)
  }

  async delete(id: string): Promise<void> {
    this.products.delete(id)
  }
}
```

### 8. 模組公開 API 與 自動裝配 (IModuleDefinition)

**`app/Modules/Product/index.ts`**

```typescript
import { ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { ProductController } from './Presentation/Controllers/ProductController'
import { ProductRepository } from './Infrastructure/Repositories/ProductRepository'
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'

/**
 * 模組服務提供者
 */
export class ProductServiceProvider extends ModuleServiceProvider {
  override register(container: any): void {
    // 註冊模組專用服務
    console.log('[Product] Provider registered')
  }
}

/**
 * 符合 IModuleDefinition 的模組定義
 * 用於 ModuleAutoWirer 自動裝配
 */
export const ProductModule: IModuleDefinition = {
  name: 'Product',
  
  provider: ProductServiceProvider,

  registerRepositories(db, eventDispatcher) {
    // 註冊倉庫到全域 RepositoryRegistry (供工廠使用)
    // 並在容器中註冊單例
    console.log('[Product] Registering repositories...')
    // 在真實環境中，此處應使用 db 適配器
  },

  registerRoutes({ createModuleRouter }) {
    const router = createModuleRouter()
    
    router.post('/', ProductController, 'create')
    router.get('/', ProductController, 'list')
    router.get('/:id', ProductController, 'show')
  }
}
```

## 快速開始

### 1. 建立模組目錄結構

```bash
mkdir -p app/Modules/Product/{Domain/{Entities,ValueObjects,Repositories,Services,Events},Application/{Services,DTOs},Presentation/{Controllers,Resources,Routes},Infrastructure/{Repositories}}
```

### 2. 佈線機制 (Auto-Wiring)

得益於 `ModuleAutoWirer`，你**不需要**手動在 `app.ts` 或 `routes.ts` 中註冊。
只要 `app/Modules/Product/index.ts` 導出了符合 `IModuleDefinition` 的對象，系統啟動時會自動完成：
- 註冊 Service Provider
- 註冊 Repository 工廠
- 裝配 API 路由

## 測試範例

**`tests/Unit/Product/CreateProductService.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { CreateProductService } from '@/Modules/Product/Application/Services/CreateProductService'
import { ProductRepository } from '@/Modules/Product/Infrastructure/Repositories/ProductRepository'

describe('CreateProductService', () => {
  it('should create a product successfully', async () => {
    const repository = new ProductRepository()
    const service = new CreateProductService(repository)

    const dto = {
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      sku: 'TEST-001'
    }

    const id = await service.execute(dto)

    expect(id).toBeDefined()
    expect(typeof id).toBe('string')

    // 驗證產品已保存
    const saved = await repository.findById(id)
    expect(saved).toBeDefined()
    expect(saved?.name).toBe('Test Product')
  })
})
```

  it('should throw error if SKU already exists', async () => {
    const repository = new ProductRepository()
    const service = new CreateProductService(repository)

    const dto = {
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      sku: 'TEST-001'
    }

    await service.execute(dto)

    // 嘗試使用相同 SKU 建立第二個產品
    expect(service.execute(dto)).rejects.toThrow(
      /already exists/
    )
  })
})
```

## 關鍵重點

✅ **DDD 原則**
- Domain Layer 包含業務邏輯和規則
- Application Layer 協調領域物件
- Presentation Layer 處理 HTTP 交互

✅ **不可變性**
- 值物件是不可變的
- 聚合根通過專業方法修改狀態

✅ **驗證**
- 值物件在建構函式中驗證
- 倉庫實作檢查業務規則

✅ **可測試性**
- 依賴注入使單元測試變得簡單
- Domain Logic 不依賴框架
