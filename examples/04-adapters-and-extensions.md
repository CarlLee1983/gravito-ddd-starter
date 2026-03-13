# 範例 4：適配器與擴充設計 (Adapters & Extensions)

此範例展示如何使用適配器模式實現模組間的安全隔離和擴充，無需改動原模組代碼。

## 核心場景

```
問題：
  Product 模組 ❌ 知道 Shop 模組
  Shop 模組 ❌ 知道 Product 的實現細節
  → 高耦合，難以維護和測試

解決方案：
  使用 Adapters 層作為橋樑 (Anti-Corruption Layer)

  Product 模組 ← 公開介面 (IProductRepository) ← 適配器層 → Shop 模組

  優勢：
  ✅ 模組完全解耦
  ✅ 適配器邏輯集中管理
  ✅ 易於測試和擴充
```

---

## 實作案例：Product → Shop 適配器

### 步驟 1：定義適配器介面與實作

**`app/Adapters/Product/ProductToShopAdapter.ts`**

```typescript
/**
 * Shop 模組期望的產品服務介面
 * 注意：此介面通常定義在 Shop 模組的 Application 層（依賴倒置）
 */
export interface IProductServiceForShop {
  getProductInfo(productId: string): Promise<any>
  validateItems(items: any[]): Promise<boolean>
}

/**
 * 實現適配器 (作為橋樑)
 */
export class ProductToShopAdapter implements IProductServiceForShop {
  constructor(private productRepository: any) {}

  async getProductInfo(productId: string): Promise<any> {
    const product = await this.productRepository.findById(productId)
    if (!product) throw new Error(`Product ${productId} not found`)

    // 轉換格式：Product 實體 -> Shop 期望的 DTO
    return {
      id: product.id,
      name: product.name,
      price: product.price.amount,
      isAvailable: product.status.value === 'published'
    }
  }

  async validateItems(items: any[]): Promise<boolean> {
    // 實作跨模組的驗證邏輯...
    return true
  }
}
```

### 步驟 2：在模組裝配定義中配置

**`app/Modules/Shop/index.ts`**

```typescript
import { ProductToShopAdapter } from '@/Adapters/Product/ProductToShopAdapter'
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'

export const ShopModule: IModuleDefinition = {
  name: 'Shop',
  provider: ShopServiceProvider,

  registerRepositories(db, eventDispatcher) {
    // 1. 取得 Product 倉庫 (假設已由 Product 模組註冊)
    // 2. 建立並註冊適配器
    /*
    container.singleton('ProductServiceForShop', (c) => {
      const productRepo = c.make('ProductRepository')
      return new ProductToShopAdapter(productRepo)
    })
    */
  },

  registerRoutes({ createModuleRouter }) {
    // 路由裝配...
  }
}
```

---

## 外部服務適配器範例：支付系統

### 支付服務適配器

**`app/Adapters/External/PaymentServiceAdapter.ts`**

```typescript
export interface IPaymentService {
  process(amount: number, currency: string): Promise<string>
}

/**
 * Stripe 支付適配器
 */
export class StripePaymentAdapter implements IPaymentService {
  constructor(private stripeClient: any) {}

  async process(amount: number, currency: string): Promise<string> {
    console.log(`[Stripe] Processing ${amount} ${currency}...`)
    return 'stripe_trx_123'
  }
}
```

---

## 最佳實踐

### ✅ 適配器應該
- **只做轉換**: 將一個模組的數據結構轉換為另一個模組預期的結構。
- **依賴注入**: 透過建構函數注入被適配的服務或倉庫。
- **放置位置**: 跨模組適配器放在 `app/Adapters/`，外部服務適配器放在 `app/Shared/Infrastructure/` 或其對應目錄。

### ❌ 適配器不應該
- **包含業務邏輯**: 核心業務規則應保留在模組的 Domain 層。
- **直接耦合**: 避免在適配器中直接 new 另一個模組的實體。

---

## 目錄結構總結

```
app/
├── Modules/
│   ├── Product/       ← 獨立模組
│   └── Shop/          ← 依賴於 IProductServiceForShop 介面
│
├── Adapters/          ← 適配器層（模組間橋樑）
│   └── Product/
│       └── ProductToShopAdapter.ts
│
└── Shared/
    └── Infrastructure/
        └── Framework/ ← 框架級適配器 (Logger, Mailer)
```

---

## 相關資源
- 📖 [docs/06-Adapters-Wiring/ADAPTERS_AND_EXTENSIONS.md](../docs/06-Adapters-Wiring/ADAPTERS_AND_EXTENSIONS.md)
- 📖 [docs/03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md](../docs/03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md)
