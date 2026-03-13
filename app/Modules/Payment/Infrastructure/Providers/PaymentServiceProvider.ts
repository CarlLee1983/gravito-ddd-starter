import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/Ports/Core/IServiceProvider'
import { getRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'
import { InitiatePaymentService } from '../../Application/Services/InitiatePaymentService'
import { HandlePaymentSuccessService } from '../../Application/Services/HandlePaymentSuccessService'
import { HandlePaymentFailureService } from '../../Application/Services/HandlePaymentFailureService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Core/ILogger'

export class PaymentServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		// 向全局註冊表註冊，確保 RepositoryFactory 能建立它
		// 雖然 ModuleAutoWirer 會呼叫 registerRepositories，
		// 但在這裡也確保單例綁定在容器中，供之後解析使用。
		container.singleton('paymentRepository', () => {
			const registry = getRegistry()
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('payment', orm, db)
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

	override boot(context: any): void {
		try {
			const logger = context.container?.make?.('logger') as ILogger | undefined
			const message = '✨ [Payment] Module loaded'
			logger?.info?.(message) || console.log(message)
		} catch {
			console.log('✨ [Payment] Module loaded')
		}
	}
}
