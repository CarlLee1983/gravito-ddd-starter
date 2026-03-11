> **Tier: 1 - 必需** | 預計 15 分鐘 | 建立業務模組 | ⭐⭐⭐

# 模組創建指南 (Module Creation Guide)

## 概述

本指南說明如何創建新的 DDD 模組。模組是自包含的有限上下文 (Bounded Context)，擁有獨立的業務邏輯和數據模型。

## 快速開始

### 使用 CLI 自動生成 (推薦)

```bash
# 安裝 CLI
bun add -D @gravito/pulse

# 生成簡單 CRUD 模組
bun gravito module generate Product --ddd-type simple

# 生成帶事件溯源的進階模組
bun gravito module generate Order --ddd-type advanced
```

### 手動創建 (完全控制)

如果你想完全控制模組創建過程，按照下面的步驟操作。

## 模組結構 (Module Structure)

```
src/Modules/Product/
├── Domain/
│   ├── Entities/
│   │   └── Product.ts              # 聚合根
│   ├── ValueObjects/
│   │   ├── ProductStatus.ts
│   │   ├── ProductPrice.ts
│   │   └── ProductSku.ts
│   ├── Repositories/
│   │   └── IProductRepository.ts
│   ├── Services/
│   │   └── ProductDomainService.ts
│   └── Events/                     # (選項) 事件溯源
│       └── ProductCreatedEvent.ts
├── Application/
│   ├── Services/
│   │   ├── CreateProductService.ts
│   │   ├── UpdateProductService.ts
│   │   └── ListProductsService.ts
│   └── DTOs/
│       └── ProductDTO.ts
├── Presentation/
│   ├── Controllers/
│   │   └── ProductController.ts
│   ├── Resources/
│   │   └── ProductResource.ts
│   └── Routes/
│       └── product.routes.ts
├── Infrastructure/
│   └── Repositories/
│       └── ProductRepository.ts
└── index.ts                        # 公開 API
```

## 第 1 步: 創建 Domain Layer

### 1.1 值物件 (Value Objects)

值物件代表不可變的概念值。範例: Status, Price, SKU

```typescript
// src/Modules/Product/Domain/ValueObjects/ProductStatus.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export type ProductStatusType = 'draft' | 'published' | 'archived'

export class ProductStatus extends ValueObject {
  readonly value: ProductStatusType

  constructor(value: ProductStatusType) {
    super()
    if (!['draft', 'published', 'archived'].includes(value)) {
      throw new Error(`Invalid product status: ${value}`)
    }
    this.value = value
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
}
```

```typescript
// src/Modules/Product/Domain/ValueObjects/ProductPrice.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export class ProductPrice extends ValueObject {
  readonly currency: string
  readonly amount: number

  constructor(amount: number, currency: string = 'USD') {
    super()
    if (amount < 0) {
      throw new Error('Price cannot be negative')
    }
    if (!['USD', 'TWD', 'EUR', 'JPY'].includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}`)
    }
    this.amount = amount
    this.currency = currency
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

  add(other: ProductPrice): ProductPrice {
    if (other.currency !== this.currency) {
      throw new Error('Cannot add prices in different currencies')
    }
    return new ProductPrice(this.amount + other.amount, this.currency)
  }
}
```

### 1.2 聚合根 (Aggregate Root)

聚合根是領域模型的入口點，代表一致性邊界。

```typescript
// src/Modules/Product/Domain/Entities/Product.ts
import { BaseEntity } from '@/Shared/Domain/BaseEntity'
import { ProductStatus } from '../ValueObjects/ProductStatus'
import { ProductPrice } from '../ValueObjects/ProductPrice'
import { ProductSku } from '../ValueObjects/ProductSku'

export interface ProductProps {
  name: string
  description: string
  sku: ProductSku
  price: ProductPrice
  status: ProductStatus
  stock: number
}

export class Product extends BaseEntity {
  name: string
  description: string
  sku: ProductSku
  price: ProductPrice
  status: ProductStatus
  stock: number

  private constructor(props: ProductProps) {
    super()
    this.name = props.name
    this.description = props.description
    this.sku = props.sku
    this.price = props.price
    this.status = props.status
    this.stock = props.stock
  }

  /**
   * 工廠方法: 創建新產品
   */
  static create(props: Omit<ProductProps, 'status'>): Product {
    const product = new Product({
      ...props,
      status: ProductStatus.draft()
    })
    return product
  }

  /**
   * 從數據庫行重構產品
   */
  static fromDatabase(row: any): Product {
    const product = new Product({
      name: row.name,
      description: row.description,
      sku: new ProductSku(row.sku),
      price: new ProductPrice(row.price, row.currency),
      status: new ProductStatus(row.status),
      stock: row.stock
    })
    product.id = row.id
    product.createdAt = new Date(row.created_at)
    product.updatedAt = new Date(row.updated_at)
    return product
  }

  /**
   * 業務邏輯: 發佈產品
   */
  publish(): void {
    if (this.status.value === 'published') {
      throw new Error('Product is already published')
    }
    if (this.stock <= 0) {
      throw new Error('Cannot publish product with zero stock')
    }
    this.status = new ProductStatus('published')
    this.updatedAt = new Date()
  }

  /**
   * 業務邏輯: 更新庫存
   */
  updateStock(newStock: number): void {
    if (newStock < 0) {
      throw new Error('Stock cannot be negative')
    }
    this.stock = newStock
    this.updatedAt = new Date()
  }

  /**
   * 業務邏輯: 減少庫存
   */
  decreaseStock(quantity: number): void {
    const newStock = this.stock - quantity
    if (newStock < 0) {
      throw new Error(`Insufficient stock (have ${this.stock}, need ${quantity})`)
    }
    this.stock = newStock
    this.updatedAt = new Date()
  }

  /**
   * 轉換為數據庫格式
   */
  toDatabaseRow(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      sku: this.sku.value,
      price: this.price.amount,
      currency: this.price.currency,
      status: this.status.value,
      stock: this.stock,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    }
  }
}
```

### 1.3 Repository 介面

Repository 介面定義在 Domain 層，由 Infrastructure 層實現。

```typescript
// src/Modules/Product/Domain/Repositories/IProductRepository.ts
import { Product } from '../Entities/Product'
import { ProductSku } from '../ValueObjects/ProductSku'

export interface IProductRepository {
  /**
   * 根據 ID 查找產品
   */
  findById(id: string): Promise<Product | null>

  /**
   * 根據 SKU 查找產品
   */
  findBySku(sku: ProductSku): Promise<Product | null>

  /**
   * 獲取所有產品
   */
  findAll(filters?: {
    status?: string
    minStock?: number
  }): Promise<Product[]>

  /**
   * 保存產品 (新建或更新)
   */
  save(product: Product): Promise<void>

  /**
   * 刪除產品
   */
  delete(id: string): Promise<void>
}
```

### 1.4 Domain Service (選項)

當業務邏輯涉及多個聚合根時，使用 Domain Service。

```typescript
// src/Modules/Product/Domain/Services/ProductDomainService.ts
import { Product } from '../Entities/Product'
import { IProductRepository } from '../Repositories/IProductRepository'

/**
 * 跨多個產品的業務邏輯
 */
export class ProductDomainService {
  constructor(private repository: IProductRepository) {}

  /**
   * 檢查是否可以進行批量庫存調整
   */
  async canBulkUpdateStock(
    productIds: string[],
    adjustment: number
  ): Promise<boolean> {
    const products = await Promise.all(
      productIds.map((id) => this.repository.findById(id))
    )

    return products.every((p) => {
      if (!p) return false
      const newStock = p.stock + adjustment
      return newStock >= 0
    })
  }

  /**
   * 執行批量庫存調整
   */
  async bulkUpdateStock(
    productIds: string[],
    adjustment: number
  ): Promise<void> {
    if (!(await this.canBulkUpdateStock(productIds, adjustment))) {
      throw new Error('Cannot perform bulk stock update')
    }

    const products = await Promise.all(
      productIds.map((id) => this.repository.findById(id))
    )

    for (const product of products) {
      if (product) {
        product.stock += adjustment
        await this.repository.save(product)
      }
    }
  }
}
```

## 第 2 步: 創建 Application Layer

### 2.1 DTO (Data Transfer Object)

DTO 用於層之間的數據轉換。

```typescript
// src/Modules/Product/Application/DTOs/ProductDTO.ts
import { BaseDTO } from '@/Shared/Application/BaseDTO'
import { Product } from '../../Domain/Entities/Product'

export interface ProductJSONData {
  id: string
  name: string
  description: string
  sku: string
  price: {
    amount: number
    currency: string
  }
  status: string
  stock: number
  createdAt: string
  updatedAt: string
}

export class ProductDTO extends BaseDTO {
  id: string
  name: string
  description: string
  sku: string
  price: {
    amount: number
    currency: string
  }
  status: string
  stock: number
  createdAt: Date
  updatedAt: Date

  /**
   * 從領域實體轉換
   */
  static fromEntity(entity: Product): ProductDTO {
    const dto = new ProductDTO()
    dto.id = entity.id
    dto.name = entity.name
    dto.description = entity.description
    dto.sku = entity.sku.value
    dto.price = {
      amount: entity.price.amount,
      currency: entity.price.currency
    }
    dto.status = entity.status.value
    dto.stock = entity.stock
    dto.createdAt = entity.createdAt
    dto.updatedAt = entity.updatedAt
    return dto
  }

  /**
   * 轉換為 JSON (用於 HTTP 響應)
   */
  toJSON(): ProductJSONData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      sku: this.sku,
      price: this.price,
      status: this.status,
      stock: this.stock,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    }
  }
}
```

### 2.2 應用服務 (Application Service / Use Case)

應用服務實現使用案例，協調領域層和基礎設施層。

```typescript
// src/Modules/Product/Application/Services/CreateProductService.ts
import type { PlanetCore } from '@gravito/core'
import { AppException } from '@/Shared/Application/AppException'
import { Product } from '../../Domain/Entities/Product'
import { ProductDTO } from '../DTOs/ProductDTO'
import { ProductRepository } from '../../Infrastructure/Repositories/ProductRepository'
import { ProductDomainService } from '../../Domain/Services/ProductDomainService'
import { ProductSku } from '../../Domain/ValueObjects/ProductSku'
import { ProductPrice } from '../../Domain/ValueObjects/ProductPrice'

export interface CreateProductInput {
  name: string
  description: string
  sku: string
  price: number
  currency?: string
  stock: number
}

/**
 * 使用案例: 創建新產品
 */
export class CreateProductService {
  private repository: ProductRepository
  private domainService: ProductDomainService

  constructor(private core: PlanetCore) {
    const db = this.core.get('db')
    this.repository = new ProductRepository(db)
    this.domainService = new ProductDomainService(this.repository)
  }

  async execute(input: CreateProductInput): Promise<ProductDTO> {
    // 驗證 SKU 唯一性
    const existingSku = await this.repository.findBySku(new ProductSku(input.sku))
    if (existingSku) {
      throw new AppException(`SKU "${input.sku}" already exists`)
    }

    // 創建領域實體
    try {
      const product = Product.create({
        name: input.name,
        description: input.description,
        sku: new ProductSku(input.sku),
        price: new ProductPrice(input.price, input.currency || 'USD'),
        stock: input.stock
      })

      // 保存到數據庫
      await this.repository.save(product)

      // 轉換為 DTO
      return ProductDTO.fromEntity(product)
    } catch (error) {
      if (error instanceof Error) {
        throw new AppException(`Failed to create product: ${error.message}`)
      }
      throw error
    }
  }
}
```

```typescript
// src/Modules/Product/Application/Services/ListProductsService.ts
import type { PlanetCore } from '@gravito/core'
import { ProductDTO } from '../DTOs/ProductDTO'
import { ProductRepository } from '../../Infrastructure/Repositories/ProductRepository'

export interface ListProductsFilters {
  status?: string
  minStock?: number
}

export class ListProductsService {
  private repository: ProductRepository

  constructor(private core: PlanetCore) {
    const db = this.core.get('db')
    this.repository = new ProductRepository(db)
  }

  async execute(filters?: ListProductsFilters): Promise<ProductDTO[]> {
    const products = await this.repository.findAll(filters)
    return products.map((product) => ProductDTO.fromEntity(product))
  }
}
```

## 第 3 步: 創建 Presentation Layer

### 3.1 控制器 (Controller)

控制器處理 HTTP 請求並調用應用服務。

```typescript
// src/Modules/Product/Presentation/Controllers/ProductController.ts
import type { PlanetCore } from '@gravito/core'
import { CreateProductService } from '../../Application/Services/CreateProductService'
import { ListProductsService } from '../../Application/Services/ListProductsService'

export class ProductController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /api/products
   */
  async list(ctx: any) {
    const service = new ListProductsService(this.core)
    const filters = {
      status: ctx.req.query.status,
      minStock: ctx.req.query.minStock
        ? parseInt(ctx.req.query.minStock)
        : undefined
    }
    const products = await service.execute(filters)
    return ctx.json({
      success: true,
      data: products.map((p) => p.toJSON())
    })
  }

  /**
   * POST /api/products
   */
  async create(ctx: any) {
    try {
      const body = await ctx.req.json()
      const service = new CreateProductService(this.core)
      const product = await service.execute(body)
      return ctx.json(
        {
          success: true,
          data: product.toJSON()
        },
        { status: 201 }
      )
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          error: error.message || 'Failed to create product'
        },
        { status: 400 }
      )
    }
  }
}
```

### 3.2 路由 (Routes)

路由定義 HTTP 端點。

```typescript
// src/Modules/Product/Presentation/Routes/product.routes.ts
import type { PlanetCore } from '@gravito/core'
import { ProductController } from '../Controllers/ProductController'

/**
 * 註冊 Product 模組路由
 */
export async function registerProductRoutes(core: PlanetCore): Promise<void> {
  const controller = new ProductController(core)

  core.router.get('/api/products', (ctx) => controller.list(ctx))
  core.router.post('/api/products', (ctx) => controller.create(ctx))
}
```

## 第 4 步: 創建 Infrastructure Layer

### 4.1 Repository 實現

```typescript
// src/Modules/Product/Infrastructure/Repositories/ProductRepository.ts
import { Product } from '../../Domain/Entities/Product'
import { ProductSku } from '../../Domain/ValueObjects/ProductSku'
import { IProductRepository } from '../../Domain/Repositories/IProductRepository'

export class ProductRepository implements IProductRepository {
  constructor(private db: any) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.db.table('products').find(id)
    return row ? Product.fromDatabase(row) : null
  }

  async findBySku(sku: ProductSku): Promise<Product | null> {
    const row = await this.db
      .table('products')
      .where('sku', sku.value)
      .first()
    return row ? Product.fromDatabase(row) : null
  }

  async findAll(filters?: any): Promise<Product[]> {
    let query = this.db.table('products')

    if (filters?.status) {
      query = query.where('status', filters.status)
    }
    if (filters?.minStock !== undefined) {
      query = query.where('stock', '>=', filters.minStock)
    }

    const rows = await query.select()
    return rows.map((row: any) => Product.fromDatabase(row))
  }

  async save(product: Product): Promise<void> {
    const row = product.toDatabaseRow()

    const existing = await this.db
      .table('products')
      .where('id', product.id)
      .first()

    if (existing) {
      await this.db.table('products').where('id', product.id).update(row)
    } else {
      await this.db.table('products').insert(row)
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.table('products').where('id', id).delete()
  }
}
```

## 第 5 步: 模組註冊

### 5.1 模組 Index

```typescript
// src/Modules/Product/index.ts
// 只暴露 public API
export { Product } from './Domain/Entities/Product'
export { ProductStatus } from './Domain/ValueObjects/ProductStatus'
export { ProductPrice } from './Domain/ValueObjects/ProductPrice'
export { ProductSku } from './Domain/ValueObjects/ProductSku'
export { ProductDTO } from './Application/DTOs/ProductDTO'
export { IProductRepository } from './Domain/Repositories/IProductRepository'
export { registerProductRoutes } from './Presentation/Routes/product.routes'
```

### 5.2 在 src/routes.ts 中註冊

```typescript
// src/routes.ts
import type { PlanetCore } from '@gravito/core'
import { registerUserRoutes } from './Modules/User/Presentation/Routes/user.routes'
import { registerProductRoutes } from './Modules/Product/Presentation/Routes/product.routes'

export async function registerRoutes(core: PlanetCore) {
  // 健康檢查
  core.router.get('/health', async (ctx) => {
    return ctx.json({ success: true, status: 'healthy' })
  })

  // API 根路由
  core.router.get('/api', async (ctx) => {
    return ctx.json({ success: true, message: 'Welcome to Gravito DDD API' })
  })

  // 註冊模組路由
  await registerUserRoutes(core)
  await registerProductRoutes(core)

  console.log('✅ Routes registered')
}
```

## 第 6 步: 測試 (重要!)

### 6.1 Unit 測試 - Domain 層

```typescript
// tests/Unit/Product/ProductPrice.test.ts
import { describe, it, expect } from 'bun:test'
import { ProductPrice } from '../../../src/Modules/Product/Domain/ValueObjects/ProductPrice'

describe('ProductPrice Value Object', () => {
  it('should create valid price', () => {
    const price = new ProductPrice(99.99, 'USD')
    expect(price.amount).toBe(99.99)
    expect(price.currency).toBe('USD')
  })

  it('should reject negative price', () => {
    expect(() => {
      new ProductPrice(-10, 'USD')
    }).toThrow('Price cannot be negative')
  })

  it('should add prices in same currency', () => {
    const p1 = new ProductPrice(50, 'USD')
    const p2 = new ProductPrice(30, 'USD')
    const result = p1.add(p2)
    expect(result.amount).toBe(80)
  })

  it('should not add prices in different currencies', () => {
    const p1 = new ProductPrice(50, 'USD')
    const p2 = new ProductPrice(30, 'EUR')
    expect(() => p1.add(p2)).toThrow('Cannot add prices in different currencies')
  })
})
```

```typescript
// tests/Unit/Product/Product.test.ts
import { describe, it, expect } from 'bun:test'
import { Product } from '../../../src/Modules/Product/Domain/Entities/Product'
import { ProductSku } from '../../../src/Modules/Product/Domain/ValueObjects/ProductSku'
import { ProductPrice } from '../../../src/Modules/Product/Domain/ValueObjects/ProductPrice'

describe('Product Aggregate Root', () => {
  it('should create new product in draft status', () => {
    const product = Product.create({
      name: 'Test Product',
      description: 'A test product',
      sku: new ProductSku('TEST-001'),
      price: new ProductPrice(99.99),
      stock: 100
    })

    expect(product.name).toBe('Test Product')
    expect(product.status.value).toBe('draft')
    expect(product.stock).toBe(100)
  })

  it('should publish product when stock > 0', () => {
    const product = Product.create({
      name: 'Test Product',
      description: 'A test product',
      sku: new ProductSku('TEST-001'),
      price: new ProductPrice(99.99),
      stock: 100
    })

    product.publish()
    expect(product.status.value).toBe('published')
  })

  it('should not publish product with zero stock', () => {
    const product = Product.create({
      name: 'Test Product',
      description: 'A test product',
      sku: new ProductSku('TEST-001'),
      price: new ProductPrice(99.99),
      stock: 0
    })

    expect(() => product.publish()).toThrow('Cannot publish product with zero stock')
  })

  it('should decrease stock correctly', () => {
    const product = Product.create({
      name: 'Test Product',
      description: 'A test product',
      sku: new ProductSku('TEST-001'),
      price: new ProductPrice(99.99),
      stock: 100
    })

    product.decreaseStock(30)
    expect(product.stock).toBe(70)
  })

  it('should reject stock decrease when insufficient', () => {
    const product = Product.create({
      name: 'Test Product',
      description: 'A test product',
      sku: new ProductSku('TEST-001'),
      price: new ProductPrice(99.99),
      stock: 10
    })

    expect(() => product.decreaseStock(20)).toThrow('Insufficient stock')
  })
})
```

## 檢查清單 (Checklist)

模組完成時，確認:

- [ ] Domain 層: 值物件、實體、Repository 介面定義
- [ ] Application 層: DTO、應用服務
- [ ] Presentation 層: 控制器、路由
- [ ] Infrastructure 層: Repository 實現
- [ ] 單元測試: Domain 層測試 (100% 覆蓋)
- [ ] 集成測試: Repository + 應用服務測試
- [ ] 模組索引: 暴露公開 API
- [ ] 路由註冊: 在 src/routes.ts 中註冊
- [ ] 文檔: README 或模組說明

## 常見模式 (Common Patterns)

### 1. 業務規則驗證

在 Domain 層驗證業務規則:

```typescript
// ❌ 錯誤: 在 Controller 驗證
if (input.price < 0) {
  throw new Error('Invalid price')
}

// ✅ 正確: 在 Value Object 驗證
const price = new ProductPrice(input.price)  // 拋出錯誤
```

### 2. 工廠方法

使用靜態工廠方法創建聚合根:

```typescript
// ✅ 使用工廠
const product = Product.create({ ... })

// ❌ 避免直接構造
const product = new Product({ ... })
```

### 3. 不可變值物件

值物件一旦創建不應改變:

```typescript
// ❌ 錯誤: 修改值物件
price.amount = 100

// ✅ 正確: 創建新的值物件
price = new ProductPrice(100, price.currency)
```

## 相關資源

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 四層架構詳解
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 常見問題
- [../README.md](../README.md) - 專案概況

---

**遵循本指南，你能快速和正確地創建 DDD 模組！**
