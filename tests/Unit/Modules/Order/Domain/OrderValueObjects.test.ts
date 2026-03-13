import { describe, it, expect } from 'bun:test'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { OrderStatus, OrderStatusEnum } from '@/Modules/Order/Domain/ValueObjects/OrderStatus'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'

describe('Order ValueObjects', () => {
  // ============ OrderId Tests ============
  describe('OrderId', () => {
    it('應該建立新的 OrderId', () => {
      const orderId = OrderId.create()
      expect(orderId).toBeDefined()
      expect(orderId.value).toBeTruthy()
    })

    it('應該從字符串重建 OrderId', () => {
      const value = 'order-123'
      const orderId = OrderId.fromString(value)
      expect(orderId.value).toBe(value)
    })

    it('應該拋出錯誤當 OrderId 為空', () => {
      expect(() => OrderId.create('')).toThrow('不能為空')
    })

    it('應該正確轉換為字符串', () => {
      const orderId = OrderId.create('order-456')
      expect(orderId.toString()).toBe('order-456')
    })

    it('應該判斷相等性', () => {
      const id1 = OrderId.create('same-id')
      const id2 = OrderId.create('same-id')
      expect(id1.equals(id2)).toBe(true)
    })
  })

  // ============ OrderStatus Tests ============
  describe('OrderStatus', () => {
    it('應該建立初始狀態 PENDING', () => {
      const status = OrderStatus.create()
      expect(status.value).toBe(OrderStatusEnum.PENDING)
      expect(status.isPending()).toBe(true)
    })

    it('應該從字符串重建狀態', () => {
      const status = OrderStatus.fromString('CONFIRMED')
      expect(status.isConfirmed()).toBe(true)
      expect(status.value).toBe(OrderStatusEnum.CONFIRMED)
    })

    it('應該拋出錯誤當狀態非法', () => {
      expect(() => OrderStatus.fromString('INVALID')).toThrow('非法訂單狀態')
    })

    it('應該判斷各個狀態', () => {
      const pending = OrderStatus.create()
      expect(pending.isPending()).toBe(true)
      expect(pending.isConfirmed()).toBe(false)
      expect(pending.isShipped()).toBe(false)
      expect(pending.isCancelled()).toBe(false)
    })

    it('應該正確轉換為字符串', () => {
      const status = OrderStatus.fromString('SHIPPED')
      expect(status.toString()).toBe('SHIPPED')
    })
  })

  // ============ Money Tests ============
  describe('Money', () => {
    it('應該建立 Money', () => {
      const money = Money.create(100, 'TWD')
      expect(money.amount).toBe(100)
      expect(money.currency).toBe('TWD')
    })

    it('應該使用默認幣種 TWD', () => {
      const money = Money.create(50)
      expect(money.currency).toBe('TWD')
    })

    it('應該拋出錯誤當金額為負', () => {
      expect(() => Money.create(-100)).toThrow('不能為負數')
    })

    it('應該拋出錯誤當幣種為空', () => {
      expect(() => Money.create(100, '')).toThrow('幣種不能為空')
    })

    it('應該支持加法操作', () => {
      const money1 = Money.create(100, 'TWD')
      const money2 = Money.create(50, 'TWD')
      const result = money1.add(money2)
      expect(result.amount).toBe(150)
      expect(result.currency).toBe('TWD')
    })

    it('應該拋出錯誤當幣種不匹配', () => {
      const money1 = Money.create(100, 'TWD')
      const money2 = Money.create(50, 'USD')
      expect(() => money1.add(money2)).toThrow('幣種不匹配')
    })

    it('應該格式化顯示', () => {
      const money = Money.create(99.99, 'TWD')
      expect(money.toString()).toBe('TWD 99.99')
    })

    it('應該判斷相等性', () => {
      const money1 = Money.create(100, 'TWD')
      const money2 = Money.create(100, 'TWD')
      expect(money1.equals(money2)).toBe(true)
    })
  })

  // ============ OrderTotal Tests ============
  describe('OrderTotal', () => {
    it('應該建立 OrderTotal', () => {
      const subtotal = Money.create(200)
      const total = OrderTotal.create(subtotal, 40)
      expect(total.subtotal.amount).toBe(200)
      expect(total.tax.amount).toBe(40)
      expect(total.total.amount).toBe(240)
    })

    it('應該計算稅率百分比', () => {
      const subtotal = Money.create(100)
      const total = OrderTotal.create(subtotal, 20)
      expect(total.getTaxPercentage()).toBe(20)
    })

    it('應該拋出錯誤當稅金幣種不匹配', () => {
      const subtotal = Money.create(100, 'TWD')
      const tax = Money.create(20, 'USD')
      expect(() => new OrderTotal(subtotal, tax, Money.create(120))).toThrow(
        '稅金幣種必須與小計匹配',
      )
    })

    it('應該拋出錯誤當總額計算不正確', () => {
      const subtotal = Money.create(100, 'TWD')
      const tax = Money.create(20, 'TWD')
      const wrongTotal = Money.create(100, 'TWD')
      expect(() => new OrderTotal(subtotal, tax, wrongTotal)).toThrow(
        '總額計算不正確',
      )
    })

    it('應該格式化顯示', () => {
      const subtotal = Money.create(100)
      const total = OrderTotal.create(subtotal, 20)
      const str = total.toString()
      expect(str).toContain('小計')
      expect(str).toContain('稅')
      expect(str).toContain('總計')
    })

    it('應該判斷相等性', () => {
      const subtotal1 = Money.create(100)
      const total1 = OrderTotal.create(subtotal1, 20)
      const subtotal2 = Money.create(100)
      const total2 = OrderTotal.create(subtotal2, 20)
      expect(total1.equals(total2)).toBe(true)
    })

    it('應該處理零稅金', () => {
      const subtotal = Money.create(100)
      const total = OrderTotal.create(subtotal, 0)
      expect(total.tax.amount).toBe(0)
      expect(total.total.amount).toBe(100)
    })
  })
})
