/**
 * @file AuditEntry.test.ts
 * @description AuditEntry 聚合根單元測試（10 個）
 *
 * 測試項目：
 * 1. 使用 create() 建立 AuditEntry
 * 2. 自動生成 UUID id
 * 3. 自動生成 createdAt
 * 4. 指定 id 和 createdAt
 * 5. 不可變性 - 無 update 方法
 * 6. 不可變性 - 無 delete 方法
 * 7. toJSON() 序列化
 * 8. reconstruct() 從持久化資料重建
 * 9. AuditAction 列舉值驗證
 * 10. AuditSeverity 列舉值驗證
 */

import { describe, it, expect } from 'vitest'
import { AuditEntry } from '../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../Domain/ValueObjects/AuditSeverity'

describe('AuditEntry 聚合根單元測試', () => {
	const defaultProps = {
		userId: 'user-001',
		entityType: 'Order',
		entityId: 'order-001',
		action: AuditAction.OrderCreated,
		severity: AuditSeverity.INFO,
		description: 'Order placed: 99.99 USD',
	}

	it('應使用 create() 建立 AuditEntry', () => {
		const entry = AuditEntry.create(defaultProps)

		expect(entry).toBeInstanceOf(AuditEntry)
		expect(entry.userId).toBe('user-001')
		expect(entry.entityType).toBe('Order')
		expect(entry.entityId).toBe('order-001')
		expect(entry.action).toBe(AuditAction.OrderCreated)
		expect(entry.severity).toBe(AuditSeverity.INFO)
		expect(entry.description).toBe('Order placed: 99.99 USD')
	})

	it('應自動生成 UUID id', () => {
		const entry = AuditEntry.create(defaultProps)

		expect(entry.id).toBeDefined()
		expect(typeof entry.id).toBe('string')
		expect(entry.id.length).toBeGreaterThan(0)
	})

	it('應自動生成 createdAt', () => {
		const before = new Date()
		const entry = AuditEntry.create(defaultProps)
		const after = new Date()

		expect(entry.createdAt).toBeInstanceOf(Date)
		expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
		expect(entry.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
	})

	it('應支援指定 id 和 createdAt', () => {
		const fixedDate = new Date('2026-01-01T00:00:00Z')
		const entry = AuditEntry.create({
			...defaultProps,
			id: 'custom-id',
			createdAt: fixedDate,
		})

		expect(entry.id).toBe('custom-id')
		expect(entry.createdAt).toEqual(fixedDate)
	})

	it('應為不可變 - 無 update 方法', () => {
		const entry = AuditEntry.create(defaultProps)

		// AuditEntry 沒有任何 update/set 方法
		expect((entry as any).update).toBeUndefined()
		expect((entry as any).setDescription).toBeUndefined()
		expect((entry as any).setSeverity).toBeUndefined()
	})

	it('應為不可變 - 無 delete 方法', () => {
		const entry = AuditEntry.create(defaultProps)

		expect((entry as any).delete).toBeUndefined()
		expect((entry as any).remove).toBeUndefined()
	})

	it('應正確序列化為 JSON', () => {
		const fixedDate = new Date('2026-03-21T10:00:00Z')
		const entry = AuditEntry.create({
			...defaultProps,
			id: 'entry-001',
			createdAt: fixedDate,
		})

		const json = entry.toJSON()

		expect(json).toEqual({
			id: 'entry-001',
			userId: 'user-001',
			entityType: 'Order',
			entityId: 'order-001',
			action: 'OrderCreated',
			severity: 'INFO',
			description: 'Order placed: 99.99 USD',
			createdAt: '2026-03-21T10:00:00.000Z',
		})
	})

	it('應使用 reconstruct() 從持久化資料重建', () => {
		const fixedDate = new Date('2026-03-21T10:00:00Z')
		const entry = AuditEntry.reconstruct({
			id: 'entry-002',
			userId: 'user-002',
			entityType: 'Payment',
			entityId: 'payment-001',
			action: AuditAction.PaymentFailed,
			severity: AuditSeverity.ERROR,
			description: 'Payment failed: insufficient funds',
			createdAt: fixedDate,
		})

		expect(entry.id).toBe('entry-002')
		expect(entry.action).toBe(AuditAction.PaymentFailed)
		expect(entry.severity).toBe(AuditSeverity.ERROR)
		expect(entry.createdAt).toEqual(fixedDate)
	})

	it('AuditAction 列舉值應正確', () => {
		expect(AuditAction.OrderCreated).toBe('OrderCreated')
		expect(AuditAction.OrderCancelled).toBe('OrderCancelled')
		expect(AuditAction.PaymentSucceeded).toBe('PaymentSucceeded')
		expect(AuditAction.PaymentFailed).toBe('PaymentFailed')
		expect(AuditAction.InventoryDeducted).toBe('InventoryDeducted')
	})

	it('AuditSeverity 列舉值應正確', () => {
		expect(AuditSeverity.INFO).toBe('INFO')
		expect(AuditSeverity.WARNING).toBe('WARNING')
		expect(AuditSeverity.ERROR).toBe('ERROR')
	})
})
