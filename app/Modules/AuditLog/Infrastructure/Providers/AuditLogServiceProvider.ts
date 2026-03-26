/**
 * @file AuditLogServiceProvider.ts
 * @description AuditLog 模組服務提供者
 *
 * 職責：
 * - 註冊訊息服務（AuditLogMessageService）
 * - 註冊控制器（AuditLogController）
 * - 註冊 Event Handlers（5 個審計 Handler）
 * - 聲明事件監聽（訂閱 5 個事件）
 *
 * Role: Infrastructure Layer - Service Provider
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { OrderPlacedAuditHandler } from '../../Application/Handlers/OrderPlacedAuditHandler'
import { PaymentSucceededAuditHandler } from '../../Application/Handlers/PaymentSucceededAuditHandler'
import { PaymentFailedAuditHandler } from '../../Application/Handlers/PaymentFailedAuditHandler'
import { OrderCancelledAuditHandler } from '../../Application/Handlers/OrderCancelledAuditHandler'
import { InventoryDeductedAuditHandler } from '../../Application/Handlers/InventoryDeductedAuditHandler'
import { AuditLogMessageService } from '../Services/AuditLogMessageService'
import { AuditLogController } from '../../Presentation/Controllers/AuditLogController'
import { EventListenerRegistry } from '@/Foundation/Infrastructure/Registries/EventListenerRegistry'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * AuditLog 模組服務提供者
 */
export class AuditLogServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		// 1. 註冊訊息服務
		container.singleton('auditLogMessages', (c) => {
			try {
				return new AuditLogMessageService(c.make('translator') as ITranslator)
			} catch {
				const fallback: any = {
					trans: (key: string) => key,
					choice: (key: string) => key,
					setLocale: () => {},
					getLocale: () => 'en',
				}
				return new AuditLogMessageService(fallback)
			}
		})

		// 2. 註冊控制器
		container.singleton('auditLogController', (c) => {
			return new AuditLogController(
				c.make('auditEntryRepository') as IAuditEntryRepository,
				c.make('auditLogMessages')
			)
		})

		// 3. 註冊 Event Handlers
		container.singleton('orderPlacedAuditHandler', (c) => {
			return new OrderPlacedAuditHandler(
				c.make('auditEntryRepository') as IAuditEntryRepository,
				c.make('logger') as ILogger
			)
		})

		container.singleton('paymentSucceededAuditHandler', (c) => {
			return new PaymentSucceededAuditHandler(
				c.make('auditEntryRepository') as IAuditEntryRepository,
				c.make('logger') as ILogger
			)
		})

		container.singleton('paymentFailedAuditHandler', (c) => {
			return new PaymentFailedAuditHandler(
				c.make('auditEntryRepository') as IAuditEntryRepository,
				c.make('logger') as ILogger
			)
		})

		container.singleton('orderCancelledAuditHandler', (c) => {
			return new OrderCancelledAuditHandler(
				c.make('auditEntryRepository') as IAuditEntryRepository,
				c.make('logger') as ILogger
			)
		})

		container.singleton('inventoryDeductedAuditHandler', (c) => {
			return new InventoryDeductedAuditHandler(
				c.make('auditEntryRepository') as IAuditEntryRepository,
				c.make('logger') as ILogger
			)
		})

		// 4. 向 EventListenerRegistry 聲明事件監聽
		EventListenerRegistry.register({
			moduleName: 'AuditLog',
			listeners: [
				{
					eventName: 'OrderPlaced',
					handlerFactory: (c) => {
						const handler = c.make('orderPlacedAuditHandler') as OrderPlacedAuditHandler
						return (event) => handler.handle(event)
					},
				},
				{
					eventName: 'PaymentSucceeded',
					handlerFactory: (c) => {
						const handler = c.make('paymentSucceededAuditHandler') as PaymentSucceededAuditHandler
						return (event) => handler.handle(event)
					},
				},
				{
					eventName: 'PaymentFailed',
					handlerFactory: (c) => {
						const handler = c.make('paymentFailedAuditHandler') as PaymentFailedAuditHandler
						return (event) => handler.handle(event)
					},
				},
				{
					eventName: 'OrderCancelled',
					handlerFactory: (c) => {
						const handler = c.make('orderCancelledAuditHandler') as OrderCancelledAuditHandler
						return (event) => handler.handle(event)
					},
				},
				{
					eventName: 'InventoryDeducted',
					handlerFactory: (c) => {
						const handler = c.make('inventoryDeductedAuditHandler') as InventoryDeductedAuditHandler
						return (event) => handler.handle(event)
					},
				},
			],
		})
	}

	override boot(core: any): void {
		if (process.env.NODE_ENV === 'development') {
			const logger = core.container.make('logger') as ILogger
			logger.debug('[AuditLog] Module loaded')
		}
	}
}
