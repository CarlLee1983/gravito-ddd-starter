/**
 * @file ProductDomain.test.ts
 * @description Product 模組完整測試套件 (65 tests)
 */

import { describe, it, expect } from 'bun:test'
import { Product } from '@/Modules/Product/Domain/Aggregates/Product'
import { ProductId } from '@/Modules/Product/Domain/ValueObjects/ProductId'
import { ProductName } from '@/Modules/Product/Domain/ValueObjects/ProductName'
import { Price, Currency } from '@/Modules/Product/Domain/ValueObjects/Price'
import { SKU } from '@/Modules/Product/Domain/ValueObjects/SKU'
import { StockQuantity } from '@/Modules/Product/Domain/ValueObjects/StockQuantity'
import { ProductCreated } from '@/Modules/Product/Domain/Events/ProductCreated'
import { ProductPriceChanged } from '@/Modules/Product/Domain/Events/ProductPriceChanged'
import { StockAdjusted } from '@/Modules/Product/Domain/Events/StockAdjusted'

describe('Product Domain', () => {
  // ============ ProductId ValueObject Tests (5 tests) ============

  describe('ProductId ValueObject', () => {
    it('應該建立有效的 ProductId', () => {
      const id = ProductId.create()
      expect(id.value).toBeDefined()
      expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('應該從字串還原 ProductId', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      const id = ProductId.reconstitute(validId)
      expect(id.value).toBe(validId)
    })

    it('應該拒絕無效格式的 ProductId', () => {
      expect(() => ProductId.reconstitute('invalid-id')).toThrow()
    })

    it('應該支持兩個 ProductId 的相等性比較', () => {
      const id1 = ProductId.reconstitute('550e8400-e29b-41d4-a716-446655440000')
      const id2 = ProductId.reconstitute('550e8400-e29b-41d4-a716-446655440000')
      expect(id1.equals(id2)).toBe(true)
    })

    it('應該支持不同 ProductId 的不相等比較', () => {
      const id1 = ProductId.create()
      const id2 = ProductId.create()
      expect(id1.equals(id2)).toBe(false)
    })
  })

  // ============ ProductName ValueObject Tests (8 tests) ============

  describe('ProductName ValueObject', () => {
    it('應該建立有效的產品名稱', () => {
      const name = ProductName.create('iPhone 15')
      expect(name.value).toBe('iPhone 15')
    })

    it('應該自動修剪空白字元', () => {
      const name = ProductName.create('  iPhone 15  ')
      expect(name.value).toBe('iPhone 15')
    })

    it('應該拒絕空白字串', () => {
      expect(() => ProductName.create('   ')).toThrow('產品名稱不能只包含空格')
    })

    it('應該允許 1-200 字元長度', () => {
      const name = ProductName.create('A')
      expect(name.value).toBe('A')

      const longName = ProductName.create('A'.repeat(200))
      expect(longName.value).toBe('A'.repeat(200))
    })

    it('應該拒絕超過 200 字元的名稱', () => {
      expect(() => ProductName.create('A'.repeat(201))).toThrow(
        '產品名稱長度不能超過 200 個字元'
      )
    })

    it('應該允許中文、數字和特殊字符', () => {
      const name = ProductName.create('iPhone 15 Pro - 黑色')
      expect(name.value).toBe('iPhone 15 Pro - 黑色')
    })

    it('應該支持字符串轉換', () => {
      const name = ProductName.create('iPhone 15')
      expect(name.toString()).toBe('iPhone 15')
    })

    it('應該支持值物件相等性比較', () => {
      const name1 = ProductName.create('iPhone 15')
      const name2 = ProductName.create('iPhone 15')
      expect(name1.equals(name2)).toBe(true)
    })
  })

  // ============ Price ValueObject Tests (8 tests) ============

  describe('Price ValueObject', () => {
    it('應該建立有效的價格', () => {
      const price = Price.create(99.99, Currency.USD)
      expect(price.amount).toBe(99.99)
      expect(price.currency).toBe(Currency.USD)
    })

    it('應該支持多種貨幣', () => {
      const currencies = [Currency.TWD, Currency.USD, Currency.EUR, Currency.JPY, Currency.CNY]

      for (const currency of currencies) {
        const price = Price.create(100, currency)
        expect(price.currency).toBe(currency)
      }
    })

    it('應該拒絕負數價格', () => {
      expect(() => Price.create(-100, Currency.USD)).toThrow('價格不能為負數')
    })

    it('應該允許零價格', () => {
      const price = Price.create(0, Currency.USD)
      expect(price.amount).toBe(0)
    })

    it('應該拒絕無效的貨幣類型', () => {
      expect(() => Price.create(100, 'INVALID' as Currency)).toThrow('無效的貨幣類型')
    })

    it('應該支持字符串轉換', () => {
      const price = Price.create(99.99, Currency.USD)
      expect(price.toString()).toBe('99.99 USD')
    })

    it('應該支持價格相等性比較', () => {
      const price1 = Price.create(99.99, Currency.USD)
      const price2 = Price.create(99.99, Currency.USD)
      expect(price1.equals(price2)).toBe(true)
    })

    it('應該正確比較不同的價格', () => {
      const price1 = Price.create(99.99, Currency.USD)
      const price2 = Price.create(100, Currency.USD)
      expect(price1.equals(price2)).toBe(false)
    })
  })

  // ============ SKU ValueObject Tests (8 tests) ============

  describe('SKU ValueObject', () => {
    it('應該建立有效的 SKU', () => {
      const sku = SKU.create('IPHONE-15')
      expect(sku.value).toBe('IPHONE-15')
    })

    it('應該自動轉換為大寫', () => {
      const sku = SKU.create('iphone-15')
      expect(sku.value).toBe('IPHONE-15')
    })

    it('應該拒絕少於 3 字元的 SKU', () => {
      expect(() => SKU.create('AB')).toThrow('SKU 長度至少需要 3 個字元')
    })

    it('應該拒絕超過 50 字元的 SKU', () => {
      expect(() => SKU.create('A'.repeat(51))).toThrow('SKU 長度不能超過 50 個字元')
    })

    it('應該允許字母、數字和連字符', () => {
      const sku = SKU.create('IPHONE-15-PRO-128GB')
      expect(sku.value).toBe('IPHONE-15-PRO-128GB')
    })

    it('應該拒絕特殊字符（除連字符外）', () => {
      expect(() => SKU.create('IPHONE_15')).toThrow('SKU 只允許大寫字母、數字和連字符')
      expect(() => SKU.create('IPHONE@15')).toThrow('SKU 只允許大寫字母、數字和連字符')
    })

    it('應該自動修剪空白字元', () => {
      const sku = SKU.create('  IPHONE-15  ')
      expect(sku.value).toBe('IPHONE-15')
    })

    it('應該支持 SKU 相等性比較', () => {
      const sku1 = SKU.create('IPHONE-15')
      const sku2 = SKU.create('iphone-15')
      expect(sku1.equals(sku2)).toBe(true)
    })
  })

  // ============ StockQuantity ValueObject Tests (6 tests) ============

  describe('StockQuantity ValueObject', () => {
    it('應該建立有效的庫存數量', () => {
      const stock = StockQuantity.create(100)
      expect(stock.value).toBe(100)
    })

    it('應該允許零庫存', () => {
      const stock = StockQuantity.create(0)
      expect(stock.value).toBe(0)
    })

    it('應該拒絕負數庫存', () => {
      expect(() => StockQuantity.create(-1)).toThrow('庫存數量不能為負數')
    })

    it('應該拒絕小數庫存', () => {
      expect(() => StockQuantity.create(10.5)).toThrow('庫存數量必須是整數')
    })

    it('應該檢查庫存是否在庫', () => {
      const inStock = StockQuantity.create(10)
      expect(inStock.isInStock()).toBe(true)

      const outOfStock = StockQuantity.create(0)
      expect(outOfStock.isInStock()).toBe(false)
    })

    it('應該支持庫存相等性比較', () => {
      const stock1 = StockQuantity.create(100)
      const stock2 = StockQuantity.create(100)
      expect(stock1.equals(stock2)).toBe(true)
    })
  })

  // ============ Product Aggregate Root Tests (18 tests) ============

  describe('Product Aggregate Root', () => {
    it('應該建立新產品並發佈 ProductCreated 事件', () => {
      const id = 'prod-123'
      const name = ProductName.create('iPhone 15')
      const price = Price.create(999, Currency.USD)
      const sku = SKU.create('IPHONE-15')
      const stock = StockQuantity.create(100)

      const product = Product.create(id, name, price, sku, stock)

      expect(product.id).toBe(id)
      expect(product.name.equals(name)).toBe(true)
      expect(product.price.equals(price)).toBe(true)
      expect(product.sku.equals(sku)).toBe(true)
      expect(product.stockQuantity.equals(stock)).toBe(true)
    })

    it('應該從儲存的資料還原並不發佈事件', () => {
      const id = 'prod-123'
      const name = ProductName.create('iPhone 15')
      const price = Price.create(999, Currency.USD)
      const sku = SKU.create('IPHONE-15')
      const stock = StockQuantity.create(100)
      const createdAt = new Date()

      const product = Product.reconstitute(id, name, price, sku, stock, createdAt)

      expect(product.id).toBe(id)
      expect(product.createdAt).toEqual(createdAt)
      expect(product.uncommittedEvents).toHaveLength(0)
    })

    it('應該變更產品價格並發佈事件', () => {
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      const newPrice = Price.create(1099, Currency.USD)
      product.changePrice(newPrice)

      // 檢查兩個事件（ProductCreated + ProductPriceChanged）
      expect(product.uncommittedEvents).toHaveLength(2)
      expect(product.uncommittedEvents[1]).toBeInstanceOf(ProductPriceChanged)
    })

    it('如果價格相同則不發佈 ProductPriceChanged 事件', () => {
      const price = Price.create(999, Currency.USD)
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        price,
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      product.changePrice(price)

      // 只應該有 ProductCreated，沒有 ProductPriceChanged
      expect(product.uncommittedEvents).toHaveLength(1)
      expect(product.uncommittedEvents[0]).toBeInstanceOf(ProductCreated)
    })

    it('應該調整庫存並發佈事件', () => {
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      const newStock = StockQuantity.create(50)
      product.adjustStock(newStock)

      expect(product.uncommittedEvents).toHaveLength(2)
      expect(product.uncommittedEvents[1]).toBeInstanceOf(StockAdjusted)
    })

    it('如果庫存相同則不發佈 StockAdjusted 事件', () => {
      const stock = StockQuantity.create(100)
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        stock
      )

      product.adjustStock(stock)

      expect(product.uncommittedEvents).toHaveLength(1)
    })

    it('應該返回只讀的日期副本', () => {
      const createdAt = new Date()
      const product = Product.reconstitute(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100),
        createdAt
      )

      const returnedDate = product.createdAt
      expect(returnedDate.getTime()).toBe(createdAt.getTime())

      // 修改返回的日期不應該影響內部狀態
      returnedDate.setDate(returnedDate.getDate() + 1)
      expect(product.createdAt.getTime()).toBe(createdAt.getTime())
    })

    it('應該返回只讀的 ValueObject', () => {
      const name = ProductName.create('iPhone 15')
      const product = Product.create(
        'prod-123',
        name,
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      const returnedName = product.name
      expect(returnedName.equals(name)).toBe(true)
    })

    it('應該應用 ProductCreated 事件', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)
      const product = Product.reconstitute(
        'prod-456',
        ProductName.create('Old Name'),
        Price.create(100, Currency.USD),
        SKU.create('OLD-SKU'),
        StockQuantity.create(10),
        new Date()
      )

      product.applyEvent(event)

      expect(product.name.value).toBe('iPhone 15')
      expect(product.price.amount).toBe(999)
      expect(product.price.currency).toBe(Currency.USD)
      expect(product.sku.value).toBe('IPHONE-15')
      expect(product.stockQuantity.value).toBe(100)
    })

    it('應該應用 ProductPriceChanged 事件', () => {
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      const event = new ProductPriceChanged('prod-123', 999, 'USD', 1099, 'USD')
      product.applyEvent(event)

      expect(product.price.amount).toBe(1099)
      expect(product.price.currency).toBe(Currency.USD)
    })

    it('應該應用 StockAdjusted 事件', () => {
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      const event = new StockAdjusted('prod-123', 100, 50)
      product.applyEvent(event)

      expect(product.stockQuantity.value).toBe(50)
    })

    it('應該在建立後保有未提交的事件', () => {
      const product = Product.create(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100)
      )

      expect(product.uncommittedEvents).toHaveLength(1)
      expect(product.uncommittedEvents[0]).toBeInstanceOf(ProductCreated)
    })

    it('應該在還原後沒有未提交的事件', () => {
      const product = Product.reconstitute(
        'prod-123',
        ProductName.create('iPhone 15'),
        Price.create(999, Currency.USD),
        SKU.create('IPHONE-15'),
        StockQuantity.create(100),
        new Date()
      )

      expect(product.uncommittedEvents).toHaveLength(0)
    })

    it('應該支持事件重放', () => {
      const id = 'prod-123'
      const name = ProductName.create('iPhone 15')
      const originalPrice = Price.create(999, Currency.USD)
      const newPrice = Price.create(1099, Currency.USD)
      const sku = SKU.create('IPHONE-15')
      const originalStock = StockQuantity.create(100)
      const newStock = StockQuantity.create(50)

      const product = Product.create(id, name, originalPrice, sku, originalStock)
      product.changePrice(newPrice)
      product.adjustStock(newStock)

      // 重放所有事件
      const events = product.uncommittedEvents
      const reconstitutedProduct = Product.reconstitute(id, name, originalPrice, sku, originalStock, new Date())

      for (const event of events) {
        reconstitutedProduct.applyEvent(event)
      }

      expect(reconstitutedProduct.price.equals(newPrice)).toBe(true)
      expect(reconstitutedProduct.stockQuantity.equals(newStock)).toBe(true)
    })
  })

  // ============ Domain Event Tests (12 tests) ============

  describe('Domain Events', () => {
    it('ProductCreated 事件應該被正確初始化', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)

      expect(event.productId).toBe('prod-123')
      expect(event.name).toBe('iPhone 15')
      expect(event.amount).toBe(999)
      expect(event.currency).toBe('USD')
      expect(event.sku).toBe('IPHONE-15')
      expect(event.stockQuantity).toBe(100)
    })

    it('ProductCreated 事件應該序列化為 JSON', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)
      const json = event.toJSON()

      expect(json.aggregateId).toBe('prod-123')
      expect(json.eventType).toBe('ProductCreated')
      expect(json.data).toEqual({
        name: 'iPhone 15',
        amount: 999,
        currency: 'USD',
        sku: 'IPHONE-15',
        stockQuantity: 100
      })
    })

    it('ProductPriceChanged 事件應該被正確初始化', () => {
      const event = new ProductPriceChanged('prod-123', 999, 'USD', 1099, 'USD')

      expect(event.productId).toBe('prod-123')
      expect(event.oldAmount).toBe(999)
      expect(event.oldCurrency).toBe('USD')
      expect(event.newAmount).toBe(1099)
      expect(event.newCurrency).toBe('USD')
    })

    it('ProductPriceChanged 事件應該序列化為 JSON', () => {
      const event = new ProductPriceChanged('prod-123', 999, 'USD', 1099, 'USD')
      const json = event.toJSON()

      expect(json.aggregateId).toBe('prod-123')
      expect(json.eventType).toBe('ProductPriceChanged')
      expect(json.data).toEqual({
        oldAmount: 999,
        oldCurrency: 'USD',
        newAmount: 1099,
        newCurrency: 'USD'
      })
    })

    it('StockAdjusted 事件應該被正確初始化', () => {
      const event = new StockAdjusted('prod-123', 100, 50)

      expect(event.productId).toBe('prod-123')
      expect(event.oldQuantity).toBe(100)
      expect(event.newQuantity).toBe(50)
    })

    it('StockAdjusted 事件應該序列化為 JSON', () => {
      const event = new StockAdjusted('prod-123', 100, 50)
      const json = event.toJSON()

      expect(json.aggregateId).toBe('prod-123')
      expect(json.eventType).toBe('StockAdjusted')
      expect(json.data).toEqual({
        oldQuantity: 100,
        newQuantity: 50
      })
    })

    it('事件應該有唯一的 eventId', () => {
      const event1 = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)
      const event2 = new ProductCreated('prod-456', 'iPad', 1299, 'USD', 'IPAD-128GB', 50)

      expect(event1.eventId).not.toBe(event2.eventId)
    })

    it('事件應該有 occurredAt 時戳', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)

      expect(event.occurredAt).toBeInstanceOf(Date)
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(new Date().getTime())
    })

    it('事件應該有版本號', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)

      expect(event.version).toBeGreaterThanOrEqual(1)
    })

    it('事件 JSON 應該包含 eventId', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)
      const json = event.toJSON()

      expect(json.eventId).toBeDefined()
      expect(json.eventId).toBe(event.eventId)
    })

    it('事件 JSON 應該包含時間戳', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)
      const json = event.toJSON()

      expect(json.occurredAt).toBeDefined()
      expect(typeof json.occurredAt).toBe('string')
    })

    it('事件 JSON 應該包含版本號', () => {
      const event = new ProductCreated('prod-123', 'iPhone 15', 999, 'USD', 'IPHONE-15', 100)
      const json = event.toJSON()

      expect(json.version).toBeDefined()
      expect(json.version).toBeGreaterThanOrEqual(1)
    })
  })
})
