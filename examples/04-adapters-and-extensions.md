# 範例 4：適配器與擴充設計 (Adapters & Extensions)

此範例展示如何使用適配器模式實現模組間的安全隔離和擴充，無需改動原模組代碼。

## 核心場景

```
問題：
  Product 模組 ❌ 知道 Shop 模組
  Shop 模組 ❌ 知道 Product 的實現細節
  → 高耦合，難以維護和測試

解決方案：
  使用 Adapters 層作為橋樑

  Product 模組 ← 公開 API (IProductRepository) ← 適配器層 → Shop 模組

  優勢：
  ✅ 模組完全解耦
  ✅ 可以多個適配器共享一個模組
  ✅ 適配器邏輯集中管理
  ✅ 易於測試和擴充
```

---

## 實作案例：Product → Shop 適配器

### 步驟 1：定義適配器介面

**`src/Adapters/Product/ProductToShopAdapter.ts`**

```typescript
/**
 * Shop 模組期望的產品服務介面
 * 注意：此介面定義在適配器層，而不是模組內
 */
export interface IProductServiceForShop {
  getProductInfo(productId: string): Promise<ProductInfoDTO>
  validateItems(items: OrderItem[]): Promise<ValidationResult>
  calculateItemsTotalPrice(items: OrderItem[]): Promise<number>
}

export interface ProductInfoDTO {
  id: string
  name: string
  price: number
  currency: string
  available: boolean
  stock?: number
}

export interface OrderItem {
  productId: string
  quantity: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  validProducts: ProductInfoDTO[]
}

/**
 * 實現適配器
 */
export class ProductToShopAdapter implements IProductServiceForShop {
  constructor(private productRepository: any) {}

  async getProductInfo(productId: string): Promise<ProductInfoDTO> {
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    // 轉換 Product DTO → Shop 期望的格式
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency || 'USD',
      available: product.status === 'published',
      stock: product.stock
    }
  }

  async validateItems(items: OrderItem[]): Promise<ValidationResult> {
    const errors: string[] = []
    const validProducts: ProductInfoDTO[] = []

    for (const item of items) {
      try {
        const product = await this.productRepository.findById(item.productId)

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
            `Insufficient stock for ${item.productId}: ` +
            `need ${item.quantity}, have ${product.stock}`
          )
          continue
        }

        const productInfo = await this.getProductInfo(item.productId)
        validProducts.push(productInfo)
      } catch (error) {
        errors.push(`Error validating product ${item.productId}`)
      }
    }

    return { valid: errors.length === 0, errors, validProducts }
  }

  async calculateItemsTotalPrice(items: OrderItem[]): Promise<number> {
    let total = 0
    for (const item of items) {
      const info = await this.getProductInfo(item.productId)
      total += info.price * item.quantity
    }
    return total
  }
}
```

### 步驟 2：在 DI 容器中配置

**`src/app.ts`**

```typescript
import { Application } from '@gravito/core'
import { initProductModule } from './Modules/Product'
import { ProductToShopAdapter } from './Adapters/Product'
import { SqliteProductRepository } from './Modules/Product/Infrastructure/Repositories/SqliteProductRepository'

export async function createApp() {
  const core = await new Application().bootstrap()
  const container = core.container

  // ========== Product 模組 ==========
  {
    const productRepository = new SqliteProductRepository()
    const productModule = initProductModule({
      repository: productRepository
    })

    container.singleton('ProductRepository', () => productRepository)
    container.singleton('CreateProductService', () => productModule.createProductService)
  }

  // ========== 適配器層 ==========
  {
    const productRepository = container.get('ProductRepository')
    const productToShopAdapter = new ProductToShopAdapter(productRepository)

    // 在容器中註冊適配器
    // Shop 模組會要求 IProductServiceForShop
    container.singleton('ProductServiceForShop', () => productToShopAdapter)
  }

  // ========== Shop 模組 ==========
  {
    const shopRepository = new SqliteShopRepository()
    const productServiceForShop = container.get('ProductServiceForShop')

    const shopModule = initShopModule({
      repository: shopRepository,
      productService: productServiceForShop  // 注入適配器
    })

    container.singleton('ShopRepository', () => shopRepository)
    container.singleton('CreateOrderService', () => shopModule.createOrderService)
  }

  return core
}
```

### 步驟 3：在 Shop 模組中使用適配器

**`src/Modules/Shop/Application/Services/CreateOrderService.ts`**

```typescript
import { IProductServiceForShop } from '@/Adapters/Product'

/**
 * Shop 模組的訂單服務
 *
 * 重點：此服務只知道 IProductServiceForShop 介面，
 * 完全不知道 Product 模組的實現細節！
 */
export class CreateOrderService {
  constructor(
    private shopRepository: IShopRepository,
    private productService: IProductServiceForShop  // 依賴適配器提供的介面
  ) {}

  async execute(request: CreateOrderRequest): Promise<string> {
    // 步驟 1: 驗證產品
    const validation = await this.productService.validateItems(request.items)
    if (!validation.valid) {
      throw new Error(`Product validation failed: ${validation.errors.join(', ')}`)
    }

    // 步驟 2: 計算總價
    const totalPrice = await this.productService.calculateItemsTotalPrice(request.items)

    // 步驟 3: 建立訂單
    const orderId = await this.shopRepository.createOrder({
      userId: request.userId,
      items: validation.validProducts,
      totalPrice
    })

    return orderId
  }
}
```

---

## 外部服務適配器範例

### 支付服務適配器

**`src/Adapters/External/PaymentServiceAdapter.ts`**

```typescript
/**
 * 統一的支付服務介面
 * 所有支付提供商都必須實現此介面
 */
export interface IPaymentService {
  createPayment(request: CreatePaymentRequest): Promise<PaymentResponse>
  refund(transactionId: string, amount: number): Promise<RefundResponse>
}

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  currency: string
  description: string
}

export interface PaymentResponse {
  transactionId: string
  status: 'pending' | 'completed' | 'failed'
  redirectUrl?: string
}

export interface RefundResponse {
  transactionId: string
  refundId: string
  status: 'success' | 'failed'
}

/**
 * Stripe 支付適配器
 */
export class StripePaymentAdapter implements IPaymentService {
  constructor(private stripeClient: any) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const intent = await this.stripeClient.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Stripe 使用分
      currency: request.currency.toLowerCase(),
      metadata: { orderId: request.orderId }
    })

    return {
      transactionId: intent.id,
      status: intent.status === 'succeeded' ? 'completed' : 'pending'
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
      status: refund.status === 'succeeded' ? 'success' : 'failed'
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
      purchase_units: [{
        amount: {
          currency_code: request.currency.toUpperCase(),
          value: request.amount.toString()
        }
      }]
    })

    return {
      transactionId: order.id,
      status: 'pending',
      redirectUrl: order.links.find((l: any) => l.rel === 'approve')?.href
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    // PayPal 退款實現
    return {
      transactionId,
      refundId: crypto.randomUUID(),
      status: 'success'
    }
  }
}

/**
 * 工廠方法：根據環境選擇支付提供商
 */
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
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

function getPayPalClient() {
  return require('paypal-rest-sdk')
}
```

**在 DI 容器中使用**：

```typescript
import { createPaymentService } from './Adapters/External'

const paymentService = createPaymentService()
container.singleton('PaymentService', () => paymentService)
```

---

## 複合適配器：多模組協調

有時需要協調多個模組來完成一個複雜的業務流程。

**`src/Adapters/Integration/CheckoutAdapter.ts`**

```typescript
import { IProductServiceForShop } from '../Product/ProductToShopAdapter'
import { IPaymentService } from '../External/PaymentServiceAdapter'
import { IUserService } from '@/Modules/User'

/**
 * 結帳適配器
 *
 * 協調三個模組的互動：
 * 1. User 模組：驗證使用者
 * 2. Product 模組：驗證產品
 * 3. Payment 適配器：處理支付
 */
export class CheckoutAdapter {
  constructor(
    private userService: IUserService,
    private productService: IProductServiceForShop,
    private paymentService: IPaymentService,
    private orderRepository: IOrderRepository
  ) {}

  async checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
    try {
      // 步驟 1: 驗證使用者
      const user = await this.userService.getUserById(request.userId)
      if (!user) throw new Error('User not found')

      // 步驟 2: 驗證產品和計算價格
      const validation = await this.productService.validateItems(request.items)
      if (!validation.valid) {
        throw new Error(`Product validation failed: ${validation.errors.join(', ')}`)
      }

      const totalPrice = await this.productService.calculateItemsTotalPrice(request.items)

      // 步驟 3: 建立支付
      const payment = await this.paymentService.createPayment({
        orderId: request.orderId || crypto.randomUUID(),
        amount: totalPrice,
        currency: 'USD',
        description: `Order for user ${request.userId}`
      })

      // 步驟 4: 保存訂單
      const order = await this.orderRepository.create({
        id: payment.transactionId,
        userId: request.userId,
        items: validation.validProducts,
        totalPrice,
        paymentId: payment.transactionId,
        status: 'payment_pending'
      })

      return {
        orderId: order.id,
        paymentUrl: payment.redirectUrl,
        status: 'payment_pending'
      }
    } catch (error) {
      throw new Error(`Checkout failed: ${error.message}`)
    }
  }
}

export interface CheckoutRequest {
  userId: string
  orderId?: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

export interface CheckoutResponse {
  orderId: string
  paymentUrl?: string
  status: 'payment_pending' | 'completed'
}
```

---

## 適配器測試

**`tests/Unit/Adapters/ProductToShopAdapter.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import {
  ProductToShopAdapter,
  IProductServiceForShop
} from '@/Adapters/Product'

describe('ProductToShopAdapter - 適配器隔離測試', () => {
  it('should adapt product information correctly', async () => {
    // Mock Product 模組的倉庫
    const mockRepository = {
      findById: async (id: string) => ({
        id,
        name: 'Test Product',
        price: 99.99,
        currency: 'USD',
        status: 'published',
        stock: 10
      })
    }

    const adapter = new ProductToShopAdapter(mockRepository)

    const info = await adapter.getProductInfo('123')

    expect(info).toEqual({
      id: '123',
      name: 'Test Product',
      price: 99.99,
      currency: 'USD',
      available: true,
      stock: 10
    })
  })

  it('should validate multiple products with stock check', async () => {
    const mockRepository = {
      findById: async (id: string) => {
        if (id === '1') {
          return {
            id,
            name: 'Product 1',
            price: 100,
            status: 'published',
            stock: 5
          }
        }
        if (id === '2') {
          return {
            id,
            name: 'Product 2',
            price: 50,
            status: 'published',
            stock: 2
          }
        }
        return null
      }
    }

    const adapter = new ProductToShopAdapter(mockRepository)

    const result = await adapter.validateItems([
      { productId: '1', quantity: 3 },   // OK
      { productId: '2', quantity: 10 }   // 庫存不足
    ])

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.validProducts.length).toBe(1)
  })

  it('should calculate total price correctly', async () => {
    const mockRepository = {
      findById: async (id: string) => ({
        id,
        name: `Product ${id}`,
        price: 100,
        status: 'published',
        stock: 100
      })
    }

    const adapter = new ProductToShopAdapter(mockRepository)

    const total = await adapter.calculateItemsTotalPrice([
      { productId: '1', quantity: 2 },
      { productId: '2', quantity: 3 }
    ])

    expect(total).toBe(500) // (100 * 2) + (100 * 3)
  })
})
```

---

## 適配器的擴充檢查清單

### 新增適配器時：

- [ ] 定義清晰的公開介面 (IXxxAdapter)
- [ ] 隱藏所有實現細節
- [ ] 適配器只做轉換，不包含業務邏輯
- [ ] 所有依賴透過建構函數注入
- [ ] 添加完整的單元測試
- [ ] 在 src/Adapters/index.ts 中匯出
- [ ] 在 app.ts 中的 DI 配置中註冊

### 使用適配器時：

- [ ] 模組依賴適配器的介面，不依賴實現
- [ ] 在 DI 容器中統一配置
- [ ] 無需修改原模組代碼
- [ ] 支援多個適配器實現

---

## 最佳實踐

### ✅ 適配器應該

```typescript
// 1. 有清晰的職責
export class StripePaymentAdapter implements IPaymentService {
  // 只處理 Stripe 特定的轉換
}

// 2. 只做轉換，不包含業務邏輯
async createPayment(request: CreatePaymentRequest) {
  // 單純轉換格式，不做業務驗證
  return {
    transactionId: result.id,
    status: result.status === 'succeeded' ? 'completed' : 'pending'
  }
}

// 3. 依賴注入
constructor(
  private repository: IRepository,
  private externalService: IExternalService
) {}
```

### ❌ 適配器不應該

```typescript
// 1. 包含業務邏輯
❌ async validateAndCreate() { }  // 業務邏輯應該在模組內

// 2. 直接建立依賴
❌ constructor() {
  this.client = new StripeClient()  // 硬編碼
}

// 3. 修改輸入資料
❌ async adapt(input: any) {
  input.transformed = true  // 不要修改輸入
}
```

---

## 目錄結構總結

```
src/
├── Modules/
│   ├── Product/       ← 獨立模組
│   ├── Shop/          ← 獨立模組
│   └── User/          ← 獨立模組
│
└── Adapters/          ← 適配器層（模組間橋樑）
    ├── Product/
    │   └── ProductToShopAdapter.ts
    ├── External/
    │   └── PaymentServiceAdapter.ts
    ├── Integration/
    │   └── CheckoutAdapter.ts
    └── index.ts

這樣設計的好處：
✅ 模組完全獨立，無耦合
✅ 適配器邏輯集中管理
✅ 易於測試和維護
✅ 支援靈活的擴充
```

---

## 使用場景總結

| 場景 | 使用適配器 | 範例 |
|------|-----------|------|
| 連接兩個模組 | ✅ | ProductToShopAdapter |
| 整合外部服務 | ✅ | StripePaymentAdapter |
| 協調多模組流程 | ✅ | CheckoutAdapter |
| 模組內部轉換 | ❌ | 直接在模組內處理 |
| 簡單映射 | ❌ | 用工具函數即可 |

---

## 相關資源

- 📖 [docs/ADAPTERS_AND_EXTENSIONS.md](../docs/ADAPTERS_AND_EXTENSIONS.md)
- 📖 [docs/MODULE_INTEGRATION.md](../docs/MODULE_INTEGRATION.md)
- 📚 [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- 🏛️ [Facade Pattern](https://refactoring.guru/design-patterns/facade)
