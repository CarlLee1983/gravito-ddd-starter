/**
 * @file CartAggregate.test.ts
 * @description Cart 聚合根單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Cart } from '../Domain/Aggregates/Cart'
import { Quantity } from '../Domain/ValueObjects/Quantity'
import { CartCreated } from '../Domain/Events/CartCreated'
import { ItemAdded } from '../Domain/Events/ItemAdded'
import { ItemRemoved } from '../Domain/Events/ItemRemoved'
import { CartCleared } from '../Domain/Events/CartCleared'
import { CartCheckoutRequested } from '../Domain/Events/CartCheckoutRequested'

describe('Cart Aggregate', () => {
	let cart: Cart

	beforeEach(() => {
		cart = Cart.create('user123_cart', 'user123')
	})

	describe('建立購物車', () => {
		it('應該建立新的購物車並發佈 CartCreated 事件', () => {
			expect(cart.id).toBe('user123_cart')
			expect(cart.userId).toBe('user123')
			expect(cart.isEmpty()).toBe(true)
			expect(cart.getUncommittedEvents().length).toBe(1)
			expect(cart.getUncommittedEvents()[0]).toBeInstanceOf(CartCreated)
		})
	})

	describe('加入商品', () => {
		it('應該加入商品並發佈 ItemAdded 事件', () => {
			const quantity = Quantity.create(2)
			cart.addItem('prod123', quantity, 99.99)

			expect(cart.items.length).toBe(1)
			expect(cart.items[0].productId).toBe('prod123')
			expect(cart.items[0].quantity.value).toBe(2)
			expect(cart.items[0].price).toBe(99.99)
		})

		it('應該禁止加入重複商品', () => {
			const quantity = Quantity.create(1)
			cart.addItem('prod123', quantity, 50)

			expect(() => {
				cart.addItem('prod123', quantity, 50)
			}).toThrow('商品已在購物車中')
		})

		it('應該計算小計正確', () => {
			const quantity = Quantity.create(3)
			cart.addItem('prod123', quantity, 25)

			expect(cart.items[0].getSubtotal()).toBe(75)
		})
	})

	describe('移除商品', () => {
		beforeEach(() => {
			const quantity = Quantity.create(2)
			cart.addItem('prod123', quantity, 50)
			cart.addItem('prod456', quantity, 75)
			cart.markEventsAsCommitted() // 清除已提交事件
		})

		it('應該移除商品並發佈 ItemRemoved 事件', () => {
			cart.removeItem('prod123')

			expect(cart.items.length).toBe(1)
			expect(cart.items[0].productId).toBe('prod456')
		})

		it('應該禁止移除不存在的商品', () => {
			expect(() => {
				cart.removeItem('nonexistent')
			}).toThrow('購物車中不存在此商品')
		})
	})

	describe('更新數量', () => {
		beforeEach(() => {
			const quantity = Quantity.create(2)
			cart.addItem('prod123', quantity, 50)
			cart.markEventsAsCommitted()
		})

		it('應該更新商品數量', () => {
			const newQuantity = Quantity.create(5)
			cart.updateItemQuantity('prod123', newQuantity)

			expect(cart.items[0].quantity.value).toBe(5)
		})

		it('應該禁止更新不存在的商品', () => {
			const newQuantity = Quantity.create(1)
			expect(() => {
				cart.updateItemQuantity('nonexistent', newQuantity)
			}).toThrow('購物車中不存在此商品')
		})
	})

	describe('清空購物車', () => {
		beforeEach(() => {
			const quantity = Quantity.create(1)
			cart.addItem('prod123', quantity, 50)
			cart.addItem('prod456', quantity, 75)
			cart.markEventsAsCommitted()
		})

		it('應該清空所有項目', () => {
			cart.clear()

			expect(cart.items.length).toBe(0)
			expect(cart.isEmpty()).toBe(true)
		})

		it('應該發佈 CartCleared 事件', () => {
			cart.clear()

			const events = cart.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(CartCleared)
		})
	})

	describe('結帳', () => {
		beforeEach(() => {
			const qty1 = Quantity.create(2)
			const qty2 = Quantity.create(3)
			cart.addItem('prod123', qty1, 50)
			cart.addItem('prod456', qty2, 75)
			cart.markEventsAsCommitted()
		})

		it('應該請求結帳並發佈 CartCheckoutRequested', () => {
			cart.requestCheckout()

			const events = cart.getUncommittedEvents()
			const checkoutEvent = events[events.length - 1]

			expect(checkoutEvent).toBeInstanceOf(CartCheckoutRequested)
			const checkout = checkoutEvent as CartCheckoutRequested
			expect(checkout.items.length).toBe(2)
			expect(checkout.totalAmount).toBe(100 + 225) // 2*50 + 3*75
		})

		it('應該禁止空購物車結帳', () => {
			const emptyCart = Cart.create('user456_cart', 'user456')

			expect(() => {
				emptyCart.requestCheckout()
			}).toThrow('購物車為空')
		})
	})

	describe('計算總金額和數量', () => {
		it('應該正確計算總金額', () => {
			const qty = Quantity.create(2)
			cart.addItem('prod1', qty, 50)
			cart.addItem('prod2', qty, 100)

			expect(cart.getTotalAmount()).toBe(100 + 200)
		})

		it('應該正確計算總項目數', () => {
			const qty1 = Quantity.create(2)
			const qty2 = Quantity.create(3)
			cart.addItem('prod1', qty1, 50)
			cart.addItem('prod2', qty2, 100)

			expect(cart.getTotalQuantity()).toBe(5)
		})

		it('應該正確報告項目計數', () => {
			const qty = Quantity.create(1)
			cart.addItem('prod1', qty, 50)
			cart.addItem('prod2', qty, 100)

			expect(cart.itemCount).toBe(2)
		})
	})

	describe('Event Sourcing 重建', () => {
		it('應該從事件序列正確重建狀態', () => {
			// 建立並提交事件
			const qty = Quantity.create(2)
			cart.addItem('prod123', qty, 50)
			cart.addItem('prod456', qty, 75)
			const events = cart.getUncommittedEvents()

			// 建立新實例
			const reconstructed = Cart.reconstitute(
				'user123_cart',
				'user123',
				new Date(),
				[]
			)

			// 重建
			for (const event of events) {
				reconstructed['applyEvent'](event)
			}

			expect(reconstructed.items.length).toBe(2)
			expect(reconstructed.getTotalAmount()).toBe(100 + 150)
		})
	})
})
