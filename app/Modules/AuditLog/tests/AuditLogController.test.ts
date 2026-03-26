/**
 * @file AuditLogController.test.ts
 * @description AuditLog Controller 測試（2 個）
 *
 * 測試項目：
 * 1. GET 端點 - 依 entityType+entityId 查詢
 * 2. GET 端點 - 依 severity 過濾
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuditLogController } from '../Presentation/Controllers/AuditLogController'
import { MemoryAuditEntryRepository } from '../Infrastructure/Repositories/MemoryAuditEntryRepository'
import { AuditEntry } from '../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../Domain/ValueObjects/AuditSeverity'
import type { IAuditLogMessages } from '../Presentation/Ports/IAuditLogMessages'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'

const createMockMessages = (): IAuditLogMessages => ({
	querySuccess: () => 'Query success',
	exportSuccess: () => 'Export success',
	missingQueryParams: () => 'Missing query params',
	invalidDateRange: () => 'Invalid date range',
	invalidSeverity: () => 'Invalid severity',
	queryFailed: () => 'Query failed',
})

const createMockContext = (query: Record<string, string> = {}): IHttpContext => ({
	getBodyText: vi.fn(),
	getJsonBody: vi.fn(),
	getHeader: vi.fn(),
	params: {},
	query,
	headers: {},
	json: vi.fn((data: any, status = 200) => {
		return new Response(JSON.stringify(data), { status })
	}),
	text: vi.fn(() => new Response()),
	html: vi.fn(() => new Response()),
	redirect: vi.fn(() => new Response()),
	get: vi.fn(),
	set: vi.fn(),
	status: vi.fn().mockReturnThis(),
	setHeader: vi.fn().mockReturnThis(),
	type: vi.fn().mockReturnThis(),
	render: vi.fn(() => new Response()),
})

describe('AuditLog Controller 測試', () => {
	let repository: MemoryAuditEntryRepository
	let controller: AuditLogController
	let messages: IAuditLogMessages

	beforeEach(async () => {
		repository = new MemoryAuditEntryRepository()
		messages = createMockMessages()
		controller = new AuditLogController(repository, messages)

		// 插入測試資料
		await repository.save(
			AuditEntry.create({
				id: 'entry-1',
				userId: 'user-001',
				entityType: 'Order',
				entityId: 'order-001',
				action: AuditAction.OrderCreated,
				severity: AuditSeverity.INFO,
				description: 'Order placed',
			})
		)

		await repository.save(
			AuditEntry.create({
				id: 'entry-2',
				userId: 'user-001',
				entityType: 'Payment',
				entityId: 'payment-001',
				action: AuditAction.PaymentFailed,
				severity: AuditSeverity.ERROR,
				description: 'Payment failed',
			})
		)
	})

	it('應依 entityType+entityId 查詢審計日誌', async () => {
		const ctx = createMockContext({
			entityType: 'Order',
			entityId: 'order-001',
		})

		await controller.queryAuditLogs(ctx)

		expect(ctx.json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				data: expect.arrayContaining([
					expect.objectContaining({
						entityType: 'Order',
						entityId: 'order-001',
					}),
				]),
				meta: { total: 1 },
			})
		)
	})

	it('應依 severity 過濾審計日誌', async () => {
		const ctx = createMockContext({
			severity: 'ERROR',
		})

		await controller.queryAuditLogs(ctx)

		expect(ctx.json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				data: expect.arrayContaining([
					expect.objectContaining({
						action: 'PaymentFailed',
						severity: 'ERROR',
					}),
				]),
				meta: { total: 1 },
			})
		)
	})
})
