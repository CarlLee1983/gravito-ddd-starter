# i18n 實踐範例

以下展示如何在不同場景中應用 i18n 系統。

## 示例 1: Product Module Controller

### 翻譯檔

```json
// locales/en/product.json
{
  "validation": {
    "name_required": "Product name is required",
    "price_invalid": "Price must be greater than 0",
    "sku_required": "SKU is required"
  },
  "operations": {
    "create_success": "Product created successfully",
    "create_failed": "Failed to create product",
    "update_success": "Product updated successfully",
    "update_failed": "Failed to update product",
    "delete_success": "Product deleted successfully",
    "delete_failed": "Failed to delete product",
    "not_found": "Product not found"
  }
}
```

```json
// locales/zh-TW/product.json
{
  "validation": {
    "name_required": "商品名稱為必填",
    "price_invalid": "價格必須大於 0",
    "sku_required": "SKU 為必填"
  },
  "operations": {
    "create_success": "商品建立成功",
    "create_failed": "無法建立商品",
    "update_success": "商品更新成功",
    "update_failed": "無法更新商品",
    "delete_success": "商品刪除成功",
    "delete_failed": "無法刪除商品",
    "not_found": "商品不存在"
  }
}
```

### Controller 實現

```typescript
// app/Modules/Product/Presentation/Controllers/ProductController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'
import { CreateProductService } from '../../Application/Services/CreateProductService'

export class ProductController {
  constructor(
    private createProductService: CreateProductService,
    private translator: ITranslator
  ) {}

  async create(ctx: IHttpContext): Promise<any> {
    try {
      const { name, price, sku } = await ctx.getJsonBody()

      // 驗證
      if (!name) {
        return ctx.json({
          success: false,
          message: this.translator.trans('product.validation.name_required')
        }, 400)
      }

      if (!price || price <= 0) {
        return ctx.json({
          success: false,
          message: this.translator.trans('product.validation.price_invalid')
        }, 400)
      }

      if (!sku) {
        return ctx.json({
          success: false,
          message: this.translator.trans('product.validation.sku_required')
        }, 400)
      }

      // 建立商品
      const product = await this.createProductService.execute({ name, price, sku })

      return ctx.json({
        success: true,
        message: this.translator.trans('product.operations.create_success'),
        data: product
      })
    } catch (error) {
      console.error('[ProductController.create] Error:', error)
      return ctx.json({
        success: false,
        message: this.translator.trans('product.operations.create_failed')
      }, 500)
    }
  }

  async update(ctx: IHttpContext): Promise<any> {
    try {
      const { id } = ctx.getParams()
      const { name, price } = await ctx.getJsonBody()

      const product = await this.createProductService.update(id, { name, price })

      return ctx.json({
        success: true,
        message: this.translator.trans('product.operations.update_success'),
        data: product
      })
    } catch (error) {
      console.error('[ProductController.update] Error:', error)
      return ctx.json({
        success: false,
        message: this.translator.trans('product.operations.update_failed')
      }, 500)
    }
  }
}
```

## 示例 2: 帶參數的翻譯

### 翻譯檔

```json
// locales/en/order.json
{
  "notifications": {
    "created": "Order :orderId has been created",
    "shipped": "Order :orderId has been shipped to :address",
    "delivered": "Order :orderId delivered successfully",
    "failed": "Order :orderId failed with error: :error"
  }
}
```

```json
// locales/zh-TW/order.json
{
  "notifications": {
    "created": "訂單 :orderId 已建立",
    "shipped": "訂單 :orderId 已寄送至 :address",
    "delivered": "訂單 :orderId 已成功送達",
    "failed": "訂單 :orderId 失敗，錯誤: :error"
  }
}
```

### Service 實現

```typescript
// app/Modules/Order/Application/Services/OrderNotificationService.ts
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class OrderNotificationService {
  constructor(
    private translator: ITranslator,
    private mailer: IMailer
  ) {}

  async notifyOrderCreated(orderId: string, email: string): Promise<void> {
    const message = this.translator.trans('order.notifications.created', {
      orderId
    })

    await this.mailer.send({
      to: email,
      subject: 'Order Confirmation',
      body: message
    })
  }

  async notifyOrderShipped(orderId: string, address: string, email: string): Promise<void> {
    const message = this.translator.trans('order.notifications.shipped', {
      orderId,
      address
    })

    await this.mailer.send({
      to: email,
      subject: 'Order Shipped',
      body: message
    })
  }

  async notifyOrderFailed(orderId: string, error: string, email: string): Promise<void> {
    const message = this.translator.trans('order.notifications.failed', {
      orderId,
      error
    })

    await this.mailer.send({
      to: email,
      subject: 'Order Failed',
      body: message
    })
  }
}
```

## 示例 3: 多語言驗證

### 翻譯檔

```json
// locales/en/validation.json
{
  "errors": {
    "required": ":field is required",
    "email": ":field must be a valid email",
    "min_length": ":field must be at least :min characters",
    "max_length": ":field cannot exceed :max characters",
    "unique": ":field must be unique",
    "numeric": ":field must be numeric"
  }
}
```

```json
// locales/zh-TW/validation.json
{
  "errors": {
    "required": ":field 為必填欄位",
    "email": ":field 必須是有效的電子郵件",
    "min_length": ":field 必須至少 :min 個字符",
    "max_length": ":field 不能超過 :max 個字符",
    "unique": ":field 必須唯一",
    "numeric": ":field 必須是數字"
  }
}
```

### 驗證服務

```typescript
// app/Shared/Application/Services/ValidationService.ts
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class ValidationService {
  constructor(private translator: ITranslator) {}

  validateEmail(email: string, fieldName: string = 'Email'): { valid: boolean; error?: string } {
    if (!email) {
      return {
        valid: false,
        error: this.translator.trans('validation.errors.required', {
          field: fieldName
        })
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        error: this.translator.trans('validation.errors.email', {
          field: fieldName
        })
      }
    }

    return { valid: true }
  }

  validateMinLength(value: string, min: number, fieldName: string = 'Field'): { valid: boolean; error?: string } {
    if (!value || value.length < min) {
      return {
        valid: false,
        error: this.translator.trans('validation.errors.min_length', {
          field: fieldName,
          min
        })
      }
    }

    return { valid: true }
  }

  validateMaxLength(value: string, max: number, fieldName: string = 'Field'): { valid: boolean; error?: string } {
    if (value && value.length > max) {
      return {
        valid: false,
        error: this.translator.trans('validation.errors.max_length', {
          field: fieldName,
          max
        })
      }
    }

    return { valid: true }
  }
}
```

### Controller 使用

```typescript
async register(ctx: IHttpContext): Promise<any> {
  const { email, password } = await ctx.getJsonBody()

  // 驗證
  const emailCheck = this.validationService.validateEmail(email, 'Email')
  if (!emailCheck.valid) {
    return ctx.json({ success: false, message: emailCheck.error }, 400)
  }

  const passwordCheck = this.validationService.validateMinLength(password, 8, 'Password')
  if (!passwordCheck.valid) {
    return ctx.json({ success: false, message: passwordCheck.error }, 400)
  }

  // ... 繼續處理註冊邏輯
}
```

## 示例 4: 區域特定的錯誤訊息

### 翻譯檔

```json
// locales/en/payment.json
{
  "errors": {
    "payment_failed": "Payment failed: :reason",
    "card_declined": "Your card was declined",
    "insufficient_funds": "Insufficient funds",
    "invalid_card": "Invalid card details",
    "gateway_error": "Payment gateway error. Please try again later."
  }
}
```

```json
// locales/zh-TW/payment.json
{
  "errors": {
    "payment_failed": "支付失敗：:reason",
    "card_declined": "您的卡片被拒絕",
    "insufficient_funds": "餘額不足",
    "invalid_card": "無效的卡片詳細資訊",
    "gateway_error": "支付閘道錯誤。請稍後重試。"
  }
}
```

### Domain Exception 搭配 i18n

```typescript
// app/Modules/Payment/Presentation/Controllers/PaymentController.ts
async pay(ctx: IHttpContext): Promise<any> {
  try {
    const { amount, cardToken } = await ctx.getJsonBody()

    const result = await this.paymentService.execute(amount, cardToken)
    return ctx.json({ success: true, data: result })
  } catch (error) {
    let reasonKey = 'gateway_error'

    if (error instanceof CardDeclinedException) {
      reasonKey = 'card_declined'
    } else if (error instanceof InsufficientFundsException) {
      reasonKey = 'insufficient_funds'
    } else if (error instanceof InvalidCardException) {
      reasonKey = 'invalid_card'
    }

    const reason = this.translator.trans(`payment.errors.${reasonKey}`)
    const message = this.translator.trans('payment.errors.payment_failed', { reason })

    return ctx.json({
      success: false,
      message
    }, 400)
  }
}
```

## 示例 5: 動態語言切換

### Middleware

```typescript
// app/Shared/Presentation/Middleware/LocaleMiddleware.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class LocaleMiddleware {
  constructor(private translator: ITranslator) {}

  handle(ctx: IHttpContext): void {
    // 1. 嘗試從 query string 取得語言
    let locale = ctx.getQuery('lang')

    // 2. 如果沒有，嘗試從 Accept-Language header 取得
    if (!locale) {
      const acceptLanguage = ctx.getHeader('Accept-Language')
      locale = acceptLanguage?.split(',')[0].split('-')[0]
    }

    // 3. 設定語言
    if (locale && ['en', 'zh-TW'].includes(locale)) {
      this.translator.setLocale(locale)
    }

    ctx.set('locale', this.translator.getLocale())
  }
}
```

### 使用

```typescript
// 在路由配置中使用
app.use(new LocaleMiddleware(translator))

// 現在所有 Controller 都會使用正確的語言
// 根據 Accept-Language header 或 ?lang=zh-TW query string
```

---

**更新於**: 2026-03-13
**相關指南**: [I18N_GUIDE.md](./I18N_GUIDE.md)
