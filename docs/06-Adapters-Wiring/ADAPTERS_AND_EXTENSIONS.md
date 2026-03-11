# 適配器與擴充設計指南 (Adapters & Extensions)

此文檔說明如何使用適配器模式來實現跨模組擴充和集成，保持模組的獨立性。

## 核心概念

### 適配器的三大用途

```
1️⃣  轉換介面
   └─ 將一個模組的介面轉換為另一個模組期望的介面
   └─ 例：Product 模組的 Repository → Shop 模組期望的 Service

2️⃣  跨模組集成
   └─ 安全地連接多個模組
   └─ 例：User 模組 + Product 模組 = 訂單模組

3️⃣  外部服務適配
   └─ 將外部 API/SDK 適配為模組介面
   └─ 例：支付 API → 支付介面適配器
```

### 何時使用適配器

```
✅ 使用適配器：
  - 需要連接不同模組
  - 需要適配外部服務
  - 需要提供多個實作選擇
  - 希望保持模組獨立

❌ 不需要適配器：
  - 模組內部的簡單轉換
  - 一次性的轉換邏輯
  - 簡單的映射操作
```

---

## 目錄結構

```
src/
├── Modules/
│   ├── Product/
│   ├── Shop/
│   ├── User/
│   └── ...
│
├── Shared/
│   └── ...
│
└── Adapters/
    ├── Product/                    # 產品相關適配器
    │   ├── ProductToShopAdapter.ts
    │   └── index.ts
    │
    ├── User/                       # 使用者相關適配器
    │   ├── UserToOrderAdapter.ts
    │   └── index.ts
    │
    ├── External/                   # 外部服務適配器
    │   ├── PaymentServiceAdapter.ts
    │   ├── EmailServiceAdapter.ts
    │   └── index.ts
    │
    └── index.ts                    # 所有適配器入口
```

---

## 模式 1：模組介面轉換適配器

### 場景

Product 模組提供 `IProductRepository`，但 Shop 模組期望 `IProductService`。

### 實作

**`src/Modules/Product/index.ts`** - Product 模組公開 API

```typescript
// Product 模組只提供倉庫
export { IProductRepository } from './Domain/Repositories/IProductRepository'
export type { ProductDTO } from './Application/DTOs/ProductDTO'

export interface ProductModuleConfig {
  repository: IProductRepository
}

export function initProductModule(config: ProductModuleConfig) {
  return {
    createProductService: new CreateProductService(config.repository)
  }
}
```

**`src/Adapters/Product/ProductToShopAdapter.ts`** - 適配器轉換

```typescript
import {
  CreateProductService,
  ProductDTO,
  ProductModuleConfig
} from '@/Modules/Product'

/**
 * Product → Shop 適配器
 *
 * Shop 模組期望一個 ProductService，但 Product 模組提供的是 Repository。
 * 此適配器轉換 Product 的應用服務為 Shop 期望的介面。
 *
 * 優點：
 * - Product 模組不知道 Shop 模組的存在
 * - Shop 模組只依賴適配器，不依賴 Product 實現細節
 * - 適配器集中在 src/adapters 目錄，易於管理
 */

/**
 * Shop 模組期望的 ProductService 介面
 */
export interface IProductServiceForShop {
  /**
   * 取得產品詳細資訊（包括庫存、定價等）
   */
  getProductDetails(productId: string): Promise<ProductDetailsDTO>

  /**
   * 批量驗證產品是否存在和有效
   */
  validateProducts(items: { productId: string; quantity: number }[]): Promise<ValidationResult>

  /**
   * 計算訂單總價
   */
  calculateOrderTotal(items: any[]): Promise<number>
}

export interface ProductDetailsDTO {
  id: string
  name: string
  price: number
  available: boolean
  stock?: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  products: ProductDetailsDTO[]
}

/**
 * 實現適配器
 */
export class ProductToShopAdapter implements IProductServiceForShop {
  constructor(
    private productModule: ReturnType<typeof initProductModule>
  ) {}

  /**
   * 適配：Product 模組的 ProductDTO → Shop 期望的 ProductDetailsDTO
   */
  async getProductDetails(productId: string): Promise<ProductDetailsDTO> {
    const repository = this.productModule.repository
    const product = await repository.findById(productId)

    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    // 轉換 ProductDTO 為 ProductDetailsDTO
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      available: product.status === 'published',
      stock: product.stock // 假設 Product 模組提供 stock 欄位
    }
  }

  /**
   * 適配：批量驗證產品
   */
  async validateProducts(
    items: { productId: string; quantity: number }[]
  ): Promise<ValidationResult> {
    const repository = this.productModule.repository
    const errors: string[] = []
    const products: ProductDetailsDTO[] = []

    for (const item of items) {
      const product = await repository.findById(item.productId)

      if (!product) {
        errors.push(`Product not found: ${item.productId}`)
        continue
      }

      if (product.status !== 'published') {
        errors.push(`Product not available: ${item.productId}`)
        continue
      }

      if (product.stock && product.stock < item.quantity) {
        errors.push(
          `Insufficient stock for product ${item.productId}: requested ${item.quantity}, available ${product.stock}`
        )
        continue
      }

      products.push(await this.getProductDetails(item.productId))
    }

    return {
      valid: errors.length === 0,
      errors,
      products
    }
  }

  /**
   * 適配：計算訂單總價
   */
  async calculateOrderTotal(items: any[]): Promise<number> {
    let total = 0

    for (const item of items) {
      const details = await this.getProductDetails(item.productId)
      total += details.price * item.quantity
    }

    return total
  }
}
```

**`src/Adapters/Product/index.ts`** - 適配器公開 API

```typescript
export { ProductToShopAdapter } from './ProductToShopAdapter'
export type {
  IProductServiceForShop,
  ProductDetailsDTO,
  ValidationResult
} from './ProductToShopAdapter'
```

---

## 模式 2：外部服務適配器

### 場景

整合第三方支付服務（Stripe、PayPal）。

**`src/Adapters/External/PaymentServiceAdapter.ts`**

```typescript
/**
 * 支付服務適配器
 *
 * 將不同的第三方支付 API 適配為統一的介面。
 * Order 模組只知道 IPaymentService，不需要知道具體的支付提供商。
 */

/**
 * 統一的支付服務介面
 * Order 模組依賴此介面
 */
export interface IPaymentService {
  createPayment(request: CreatePaymentRequest): Promise<PaymentResponse>
  refund(transactionId: string, amount: number): Promise<RefundResponse>
  getStatus(transactionId: string): Promise<PaymentStatus>
}

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  currency: string
  description: string
  metadata?: Record<string, any>
}

export interface PaymentResponse {
  transactionId: string
  status: 'pending' | 'completed' | 'failed'
  amount: number
  currency: string
  redirectUrl?: string // 用於重定向支付
}

export interface RefundResponse {
  transactionId: string
  refundId: string
  status: 'success' | 'failed'
  amount: number
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

/**
 * Stripe 支付適配器
 */
export class StripePaymentAdapter implements IPaymentService {
  constructor(private stripeClient: any) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const intent = await this.stripeClient.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Stripe 使用分為單位
      currency: request.currency.toLowerCase(),
      description: request.description,
      metadata: {
        orderId: request.orderId,
        ...request.metadata
      }
    })

    return {
      transactionId: intent.id,
      status: intent.status === 'succeeded' ? 'completed' : 'pending',
      amount: request.amount,
      currency: request.currency,
      redirectUrl: intent.client_secret ? `/checkout/${intent.id}` : undefined
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    const refund = await this.stripeClient.refunds.create({
      payment_intent: transactionId,
      amount: Math.round(amount * 100)
    })

    return {
      transactionId,
      refundId: refund.id,
      status: refund.status === 'succeeded' ? 'success' : 'failed',
      amount
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const intent = await this.stripeClient.paymentIntents.retrieve(transactionId)

    switch (intent.status) {
      case 'succeeded':
        return 'completed'
      case 'processing':
        return 'pending'
      case 'requires_payment_method':
        return 'pending'
      default:
        return 'failed'
    }
  }
}

/**
 * PayPal 支付適配器
 */
export class PayPalPaymentAdapter implements IPaymentService {
  constructor(private paypalClient: any) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const order = await this.paypalClient.createOrder({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toString()
          },
          description: request.description
        }
      ],
      application_context: {
        return_url: 'https://example.com/return',
        cancel_url: 'https://example.com/cancel'
      }
    })

    const approveLink = order.links.find((link: any) => link.rel === 'approve')

    return {
      transactionId: order.id,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      redirectUrl: approveLink?.href
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    // PayPal 退款邏輯
    const refund = await this.paypalClient.capturesRefund(transactionId, {
      amount: {
        value: amount.toString(),
        currency_code: 'USD'
      }
    })

    return {
      transactionId,
      refundId: refund.id,
      status: 'success',
      amount
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const order = await this.paypalClient.getOrder(transactionId)
    const status = order.status

    switch (status) {
      case 'COMPLETED':
        return 'completed'
      case 'APPROVED':
        return 'pending'
      default:
        return 'failed'
    }
  }
}
```

**`src/Adapters/External/index.ts`**

```typescript
export { StripePaymentAdapter, PayPalPaymentAdapter } from './PaymentServiceAdapter'
export type {
  IPaymentService,
  CreatePaymentRequest,
  PaymentResponse,
  RefundResponse,
  PaymentStatus
} from './PaymentServiceAdapter'

// 工廠函數：根據環境選擇支付提供商
export function createPaymentService(): IPaymentService {
  const provider = process.env.PAYMENT_PROVIDER || 'stripe'

  switch (provider) {
    case 'paypal':
      return new PayPalPaymentAdapter(getPayPalClient())
    case 'stripe':
    default:
      return new StripePaymentAdapter(getStripeClient())
  }
}

function getStripeClient() {
  // 初始化 Stripe 客戶端
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

function getPayPalClient() {
  // 初始化 PayPal 客戶端
  return require('paypal-rest-sdk')
}
```

---

## 模式 3：複合適配器（多模組集成）

### 場景

整合 User + Product + Shop 模組來建立完整的訂單流程。

**`src/Adapters/Order/OrderIntegrationAdapter.ts`**

```typescript
import { IProductServiceForShop } from '../Product/ProductToShopAdapter'
import { IUserService } from '@/Modules/User'
import { IPaymentService } from '../External/PaymentServiceAdapter'

/**
 * 訂單整合適配器
 *
 * 協調三個模組（Product、User、Payment）來建立訂單。
 * 此適配器是模組間複雜交互的協調器。
 */

export interface OrderCreationRequest {
  userId: string
  items: Array<{
    productId: string
    quantity: number
  }>
  shippingAddress: string
  paymentMethod: 'stripe' | 'paypal'
}

export interface OrderCreationResponse {
  orderId: string
  paymentUrl?: string // 用於重定向支付
  status: 'created' | 'payment_pending' | 'completed'
}

export class OrderIntegrationAdapter {
  constructor(
    private productService: IProductServiceForShop,
    private userService: IUserService,
    private paymentService: IPaymentService,
    private orderRepository: IOrderRepository // Order 模組的倉庫
  ) {}

  /**
   * 建立訂單的完整流程
   *
   * 1. 驗證使用者
   * 2. 驗證產品
   * 3. 計算價格
   * 4. 建立支付
   * 5. 保存訂單
   */
  async createOrder(request: OrderCreationRequest): Promise<OrderCreationResponse> {
    try {
      // 步驟 1: 驗證使用者
      const user = await this.userService.getUserById(request.userId)
      if (!user) {
        throw new Error('User not found')
      }

      // 步驟 2: 驗證產品和庫存
      const validation = await this.productService.validateProducts(request.items)
      if (!validation.valid) {
        throw new Error(`Product validation failed: ${validation.errors.join(', ')}`)
      }

      // 步驟 3: 計算訂單總價
      const totalPrice = await this.productService.calculateOrderTotal(request.items)

      // 步驟 4: 建立支付
      const payment = await this.paymentService.createPayment({
        orderId: crypto.randomUUID(),
        amount: totalPrice,
        currency: 'USD',
        description: `Order for user ${request.userId}`
      })

      // 步驟 5: 保存訂單到資料庫
      const order = await this.orderRepository.create({
        id: payment.transactionId,
        userId: request.userId,
        items: validation.products,
        totalPrice,
        shippingAddress: request.shippingAddress,
        paymentId: payment.transactionId,
        status: 'payment_pending'
      })

      return {
        orderId: order.id,
        paymentUrl: payment.redirectUrl,
        status: 'payment_pending'
      }
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`)
    }
  }
}
```

---

## 在 DI 容器中配置適配器

**`src/app.ts`**

```typescript
import {
  initProductModule,
  ProductModuleConfig
} from './Modules/Product'

import { ProductToShopAdapter } from './Adapters/Product'
import { createPaymentService } from './Adapters/External'

export async function createApp() {
  const core = await new Application().bootstrap()
  const container = core.container

  // ========== 模組初始化 ==========

  // Product 模組
  const productRepository = new SqliteProductRepository()
  const productModule = initProductModule({
    repository: productRepository
  })

  container.singleton('ProductRepository', () => productRepository)
  container.singleton('CreateProductService', () => productModule.createProductService)

  // ========== 適配器初始化 ==========

  // 適配器 1: Product → Shop 適配器
  const productToShopAdapter = new ProductToShopAdapter(productModule)
  container.singleton('ProductServiceForShop', () => productToShopAdapter)

  // 適配器 2: 支付服務適配器
  const paymentService = createPaymentService()
  container.singleton('PaymentService', () => paymentService)

  // ========== 複合適配器 ==========

  // 整合多個模組的適配器
  const orderIntegrationAdapter = new OrderIntegrationAdapter(
    productToShopAdapter,
    container.get('UserService'),
    paymentService,
    container.get('OrderRepository')
  )

  container.singleton('OrderIntegrationAdapter', () => orderIntegrationAdapter)

  return core
}
```

---

## 適配器最佳實踐

### ✅ 做這些

```typescript
// 1. 明確的職責
export interface IAdapter {
  // 清晰的方法簽名
  transformA(input: TypeA): TypeB
}

// 2. 單一責任
// 每個適配器只做一件事（轉換或整合）

// 3. 依賴注入
export class Adapter {
  constructor(
    private source: ISource,      // 來源
    private target: ITarget       // 目標
  ) {}
}

// 4. 錯誤處理
async transform(input: any) {
  try {
    // 轉換邏輯
  } catch (error) {
    throw new AdapterError(`Transform failed: ${error.message}`)
  }
}

// 5. 集中管理
// 所有適配器放在 src/adapters 目錄
```

### ❌ 避免這些

```typescript
// 1. 模糊的責任
// ❌ 一個適配器做太多事

// 2. 雙向適配
// ❌ Adapter 既轉換 A→B，也轉換 B→A
// ✅ 為不同方向建立不同的適配器

// 3. 隱藏的依賴
// ❌ constructor 中硬編碼依賴
// ✅ 所有依賴都通過參數注入

// 4. 模組污染
// ❌ 在模組內放適配器邏輯
// ✅ 適配器放在 src/adapters 目錄

// 5. 過度設計
// ❌ 簡單映射也建立適配器
// ✅ 只在實際需要時才使用
```

---

## 目錄結構最佳實踐

```
src/Adapters/
├── Product/
│   ├── ProductToShopAdapter.ts      # 介面轉換適配器
│   ├── ProductToCatalogAdapter.ts   # 另一個轉換
│   └── index.ts                     # 公開 API
│
├── User/
│   ├── UserToOrderAdapter.ts        # User → Order
│   └── index.ts
│
├── External/
│   ├── PaymentServiceAdapter.ts     # 支付適配器
│   ├── EmailServiceAdapter.ts       # 郵件適配器
│   ├── StorageAdapter.ts            # 儲存適配器
│   └── index.ts
│
├── Integration/
│   ├── OrderIntegrationAdapter.ts   # 複合適配器
│   ├── CheckoutAdapter.ts           # 結帳流程
│   └── index.ts
│
└── index.ts                         # 所有適配器的統一入口
```

**`src/Adapters/index.ts`** - 統一入口

```typescript
// Product 適配器
export * from './Product'

// User 適配器
export * from './User'

// 外部服務適配器
export * from './External'

// 複合適配器
export * from './Integration'
```

---

## 測試適配器

**`tests/Unit/Adapters/ProductToShopAdapter.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { ProductToShopAdapter } from '@/Adapters/Product'

describe('ProductToShopAdapter', () => {
  it('should adapt product details correctly', async () => {
    // Mock Product 模組
    const mockProductModule = {
      repository: {
        findById: async (id: string) => ({
          id,
          name: 'Test Product',
          price: 99.99,
          status: 'published',
          stock: 10
        })
      }
    }

    const adapter = new ProductToShopAdapter(mockProductModule)

    const details = await adapter.getProductDetails('123')

    expect(details).toEqual({
      id: '123',
      name: 'Test Product',
      price: 99.99,
      available: true,
      stock: 10
    })
  })

  it('should validate multiple products correctly', async () => {
    const mockProductModule = {
      repository: {
        findById: async (id: string) => ({
          id,
          name: `Product ${id}`,
          price: 100,
          status: 'published',
          stock: 5
        })
      }
    }

    const adapter = new ProductToShopAdapter(mockProductModule)

    const result = await adapter.validateProducts([
      { productId: '1', quantity: 3 },
      { productId: '2', quantity: 10 } // 超過庫存
    ])

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
```

---

## 命名規範

```
適配器命名：
  [Source]To[Target]Adapter
  例：
    ProductToShopAdapter
    StripePaymentAdapter
    UserToOrderAdapter

介面命名：
  I[Module]ServiceFor[Target]
  例：
    IProductServiceForShop
    IPaymentService

檔案位置：
  src/Adapters/[Category]/[AdapterName].ts
  例：
    src/Adapters/Product/ProductToShopAdapter.ts
    src/Adapters/External/StripePaymentAdapter.ts
```

---

## 何時添加新適配器

新增適配器的檢查清單：

- [ ] 兩個或多個模組需要交互
- [ ] 需要轉換或整合資料
- [ ] 無法通過簡單的事件解決
- [ ] 需要同步的結果
- [ ] 邏輯足夠複雜，值得提取

如果這些都不符合，直接在模組內解決即可。

---

## 相關資源

- 📖 [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- 🏛️ [Facade Pattern](https://refactoring.guru/design-patterns/facade)
- 🔗 [Dependency Injection](https://martinfowler.com/articles/injection.html)
- 📚 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
