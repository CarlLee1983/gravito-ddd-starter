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
# 新增模組對應設定檢查清單

加入新模組時，需在下列位置做對應設定。本文件與目前程式庫一致，作為單一依據。

---

## 一、生成模組（二擇一）

### 方式 A：使用專案內生成器（推薦）

```bash
# 簡單 CRUD（無 Redis/Cache/DB）
bun run generate:module <ModuleName>

# 需基礎設施時
bun run generate:module <ModuleName> [--redis] [--cache] [--db]
```

- 範例：`bun run generate:module Product`、`bun run generate:module Order --redis --cache --db`
- 產出：`src/Modules/<ModuleName>/` 完整結構 + 若有旗標則 `src/adapters/Gravito<ModuleName>Adapter.ts`

### 方式 B：使用 Gravito CLI

```bash
bun add -D @gravito/pulse
bun gravito module generate <ModuleName> [--ddd-type simple|advanced]
```

---

## 二、必做設定（每個新模組都要）

依序完成以下 **3 個檔案** 的修改。

### 1. 註冊 ServiceProvider — `src/bootstrap.ts`

在 **Step 3**（Register module service providers）區塊，依**依賴順序**加入新模組：

```ts
// 無依賴或僅核心 → 先註冊
core.register(createGravitoServiceProvider(new HealthServiceProvider()))
core.register(createGravitoServiceProvider(new UserServiceProvider()))
core.register(createGravitoServiceProvider(new ProductServiceProvider()))  // 新增
```

- **順序規則**：無依賴 → 單一模組依賴 → 多模組依賴（見 [BOOTSTRAP_REFERENCE.md](./BOOTSTRAP_REFERENCE.md)）。
- 需補上對應的 `import`，例如：
  `import { ProductServiceProvider } from './Modules/Product/Infrastructure/Providers/ProductServiceProvider'`

### 2. 接線層註冊 — `src/wiring/index.ts`

**兩種情況擇一：**

#### 情況 A：簡單模組（僅用 Container，不用 Redis/Cache/DB）

仿照 User 模組：建立 `register<ModuleName>`，從 `core.container.make(...)` 取得服務，組裝 Controller，再呼叫模組的 `registerXxxRoutes(router, controller)`。

```ts
import { registerProductRoutes } from '@/Modules/Product/Presentation/Routes/api'  // 或 product.routes
import { ProductController } from '@/Modules/Product/Presentation/Controllers/ProductController'

export const registerProduct = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const repository = core.container.make('productRepository') as IProductRepository
  const controller = new ProductController(repository)  // 依實際建構參數
  registerProductRoutes(router, controller)
}
```

#### 情況 B：需框架資源（Redis/Cache/DB）— 使用適配器

1. 若有使用 `--redis` / `--cache` / `--db`，生成器會產生 `src/adapters/Gravito<ModuleName>Adapter.ts`。
2. 在 wiring 中 import 該適配器的 `registerXxxWithGravito`，並匯出一個包裝函式：

```ts
import { registerOrderWithGravito } from '@/adapters/GravitoOrderAdapter'

export const registerOrder = (core: PlanetCore): void => {
  registerOrderWithGravito(core)
}
```

### 3. 根路由註冊 — `src/routes.ts`

- 在檔案頂部 import wiring 的註冊函式：
  `import { registerHealth, registerUser, registerProduct } from './wiring'`
- 在 `registerRoutes(core)` 內呼叫：
  `registerProduct(core)`
- 若新模組有 API 端點，可一併在 `/api` 的 `endpoints` 物件中列出（選用）。

---

## 三、選做設定（依需求）

| 需求 | 檔案／位置 | 說明 |
|------|------------|------|
| 新模組使用 Gravito Orbits（如 Atlas、Plasma） | `config/orbits.ts` | 在 `getOrbits()` 中 import 並加入對應 Orbit 實例；若需條件載入，使用 `OrbitRegistrationOptions`。 |
| 應用／資料庫開關等 | `config/index.ts` | 若新模組影響 `buildConfig()` 或 `useDatabase`，在此擴充。 |
| 環境變數 | `.env` / `.env.example` | 若模組需新變數（如 `XXX_*`），在 `.env.example` 加註解說明。 |
| 型別宣告 fallback | `types/*.d.ts` | 若新引入的套件無型別，可在 `types/` 新增 `declare module '...'`（參照 `gravito-atlas.d.ts`、`gravito-plasma.d.ts`）。 |

---

## 四、快速對照表

| 步驟 | 檔案 | 動作 |
|------|------|------|
| 1 | `src/bootstrap.ts` | `core.register(createGravitoServiceProvider(new XxxServiceProvider()))` + import |
| 2 | `src/wiring/index.ts` | 新增 `registerXxx(core)`（內部呼叫適配器或手動組裝 router + controller + registerXxxRoutes） |
| 3 | `src/routes.ts` | import `registerXxx`，在 `registerRoutes()` 內呼叫 `registerXxx(core)` |
| 選 | `config/orbits.ts` | 僅當模組需註冊 Orbit 時 |
| 選 | `types/*.d.ts` | 僅當套件無型別時 |

---

## 五、參考文件

- [MODULE_GUIDE.md](./MODULE_GUIDE.md) — 模組結構與手動建立步驟  
- [MODULE_GENERATION.md](./MODULE_GENERATION.md) — 生成器使用與整合說明  
- [MODULE_GENERATION_WITH_ADAPTERS.md](./MODULE_GENERATION_WITH_ADAPTERS.md) — 帶 Redis/Cache/DB 的模組與適配器  
- [BOOTSTRAP_REFERENCE.md](./BOOTSTRAP_REFERENCE.md) — 啟動流程與註冊順序  
- [config/README.md](../config/README.md) — 設定檔用途與 Orbits
