/**
 * @file PaymentServiceProvider.ts
 * @description Payment 模組服務提供者，負責註冊模組內的依賴
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'
import { InitiatePaymentService } from '../../Application/Services/InitiatePaymentService'
import { HandlePaymentSuccessService } from '../../Application/Services/HandlePaymentSuccessService'
import { HandlePaymentFailureService } from '../../Application/Services/HandlePaymentFailureService'
import { PaymentMessageService } from '../Services/PaymentMessageService'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * Payment 模組服務提供者
 */
export class PaymentServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊 Payment 模組的服務與 Repository 到容器中
	 *
	 * @param container - 依賴注入容器
	 */
	override register(container: IContainer): void {
		// 向全局註冊表註冊，確保 RepositoryFactory 能建立它
		// 雖然 ModuleAutoWirer 會呼叫 registerRepositories，
		// 但在這裡也確保單例綁定在容器中，供之後解析使用。
		container.singleton('paymentRepository', (c: IContainer) => {
			const registry = c.make('repositoryRegistry') as RepositoryRegistry
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('payment', orm, db)
		})

		// 註冊訊息服務（使用工廠方法延遲解析 translator）
		container.singleton('paymentMessages', (c) => {
			try {
				const translator = c.make('translator') as ITranslator
				return new PaymentMessageService(translator)
			} catch {
				// 如果 translator 還未註冊（啟動期間），使用虛擬實現
				// 在 boot 階段會被正確的實例替換
				const fallback: any = {
					trans: (key: string) => key,
					choice: (key: string) => key,
					setLocale: () => {},
					getLocale: () => 'en',
				}
				return new PaymentMessageService(fallback)
			}
		})

		container.singleton('initiatePaymentService', (c: IContainer) => {
			const repo = c.make('paymentRepository')
			return new InitiatePaymentService(repo)
		})

		container.singleton('handlePaymentSuccessService', (c: IContainer) => {
			const repo = c.make('paymentRepository')
			return new HandlePaymentSuccessService(repo)
		})

		container.singleton('handlePaymentFailureService', (c: IContainer) => {
			const repo = c.make('paymentRepository')
			return new HandlePaymentFailureService(repo)
		})
	}

	/**
	 * 模組啟動後的初始化工作
	 *
	 * 主要監聽事件：
	 * - OrderPlaced: 當訂單建立時，觸發發起支付流程
	 *
	 * @param context - 模組上下文
	 */
	override boot(context: any): void {
		const container = context.container ?? context
		const logger = container.make('logger') as ILogger | undefined
		let eventDispatcher: any
		try {
			eventDispatcher = container.make('eventDispatcher')
		} catch {
			// 事件分發器可能不存在
		}

		// 監聽訂單建立事件並發起支付
		if (eventDispatcher) {
			eventDispatcher.subscribe('OrderPlaced', async (event: any) => {
				const initiatePaymentService = container.make('initiatePaymentService') as InitiatePaymentService
				try {
					await initiatePaymentService.execute({
						orderId: event.data?.orderId || event.orderId,
						userId: event.data?.userId || event.userId,
						amount: event.data?.total || event.total,
						currency: event.data?.currency || event.currency || 'TWD',
						paymentMethod: 'credit_card',
					})
				} catch (error) {
					logger?.error?.('[PaymentServiceProvider] 發起支付失敗', error as Error)
				}
			})
		}

		const message = '✨ [Payment] Module loaded'
		logger?.info?.(message) || console.log(message)
	}
}
