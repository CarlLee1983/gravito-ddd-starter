/**
 * @file RefundServiceProvider.ts
 * @description Refund 模組服務提供者 — 向 DI 容器註冊所有服務
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'
import { RefundMessageService } from '../Services/RefundMessageService'
import { OrderQueryAdapter } from '../Adapters/OrderQueryAdapter'
import { RefundHistoryAdapter } from '../Adapters/RefundHistoryAdapter'
import { RefundQueryService } from '../Services/RefundQueryService'
import { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import { PaymentRefundHandler } from '../EventHandlers/PaymentRefundHandler'
import { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import { RefundFees } from '../../Domain/ValueObjects/RefundFees'
import { Money } from '../../Domain/ValueObjects/Money'
import { EventListenerRegistry } from '@/Foundation/Infrastructure/Registries/EventListenerRegistry'

/**
 * Refund 模組服務提供者
 */
export class RefundServiceProvider extends ModuleServiceProvider {
	/**
	 * 向容器中註冊 Refund 模組的所有服務
	 *
	 * @param container - DI 容器
	 */
	override register(container: IContainer): void {
		// Repository（透過 RepositoryRegistry）
		container.singleton('refundRepository', (c: IContainer) => {
			const registry = c.make('repositoryRegistry') as RepositoryRegistry
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('refund', orm, db)
		})

		// 訊息服務（含 fallback translator）
		container.singleton('refundMessages', (c: IContainer) => {
			try {
				const translator = c.make('translator') as ITranslator
				return new RefundMessageService(translator)
			} catch {
				const fallback: any = {
					trans: (key: string) => key,
					choice: (key: string) => key,
					setLocale: () => {},
					getLocale: () => 'en',
				}
				return new RefundMessageService(fallback)
			}
		})

		// 訂單查詢適配器（防腐層）
		container.singleton('orderQueryAdapter', (c: IContainer) => {
			const orderRepository = c.make('orderRepository')
			return new OrderQueryAdapter(orderRepository)
		})

		// 退款歷史適配器
		container.singleton('refundHistoryAdapter', (c: IContainer) => {
			const refundRepository = c.make('refundRepository')
			return new RefundHistoryAdapter(refundRepository)
		})

		// 退款查詢服務（CQRS 讀側）
		container.singleton('refundQueryService', (c: IContainer) => {
			const refundRepository = c.make('refundRepository')
			return new RefundQueryService(refundRepository)
		})

		// 退款應用服務
		container.singleton('refundApplicationService', (c: IContainer) => {
			const refundRepository = c.make('refundRepository')
			const orderQueryAdapter = c.make('orderQueryAdapter')
			const refundHistoryAdapter = c.make('refundHistoryAdapter')
			const policyConfig = RefundPolicyConfig.defaults()
			const fees = RefundFees.create(
				0.1,
				Money.fromCents(500, 'TWD'),
				['defective', 'wrong_item']
			)
			return new RefundApplicationService(
				refundRepository,
				orderQueryAdapter,
				refundHistoryAdapter,
				policyConfig,
				fees
			)
		})

		// 支付退款事件處理器
		container.singleton('paymentRefundHandler', (c: IContainer) => {
			const refundRepository = c.make('refundRepository')
			const logger = c.make('logger') as ILogger
			return new PaymentRefundHandler(refundRepository, logger)
		})

		// 向中心化事件 Registry 聲明監聽
		EventListenerRegistry.register({
			moduleName: 'Refund',
			listeners: [
				{
					eventName: 'PaymentRefunded',
					handlerFactory: (c: IContainer) => {
						const handler = c.make('paymentRefundHandler') as PaymentRefundHandler
						return (event: any) => handler.handlePaymentRefunded(event)
					},
				},
				{
					eventName: 'PaymentRefundFailed',
					handlerFactory: (c: IContainer) => {
						const handler = c.make('paymentRefundHandler') as PaymentRefundHandler
						return (event: any) => handler.handlePaymentRefundFailed(event)
					},
				},
			],
		})
	}

	/**
	 * 模組啟動後的初始化工作
	 *
	 * 事件監聽由中心化 Registry 管理。
	 *
	 * @param context - 模組上下文
	 */
	override boot(context: any): void {
		const container = context.container ?? context
		const logger = container.make('logger') as ILogger | undefined

		if (process.env.NODE_ENV === 'development') {
			const message = '✨ [Refund] Module loaded'
			logger?.info?.(message) || console.log(message)
		}

		// 事件監聽由 EventListenerRegistry 在 SharedServiceProvider.boot() 中自動綁定
	}
}
