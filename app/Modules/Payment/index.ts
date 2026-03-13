import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { PaymentServiceProvider } from './Infrastructure/Providers/PaymentServiceProvider'
import { registerPaymentRepositories } from './Infrastructure/Providers/registerPaymentRepositories'
import { PaymentController } from './Presentation/Controllers/PaymentController'
import { registerPaymentRoutes } from './Presentation/Routes/payment.routes'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoModuleRouter'

// Domain 導出
export { Payment } from './Domain/Aggregates/Payment'
export type { PaymentProps } from './Domain/Aggregates/Payment'

// Value Objects 導出
export { PaymentId } from './Domain/ValueObjects/PaymentId'
export { TransactionId } from './Domain/ValueObjects/TransactionId'
export { Amount } from './Domain/ValueObjects/Amount'
export { PaymentMethod, type PaymentMethodType } from './Domain/ValueObjects/PaymentMethod'
export { PaymentStatus, type PaymentStatusType } from './Domain/ValueObjects/PaymentStatus'

// Events 導出
export { PaymentInitiated } from './Domain/Events/PaymentInitiated'
export { PaymentSucceeded } from './Domain/Events/PaymentSucceeded'
export { PaymentFailed } from './Domain/Events/PaymentFailed'

// Repository 介面導出
export type { IPaymentRepository } from './Domain/Repositories/IPaymentRepository'

// Application 服務導出
export { InitiatePaymentService } from './Application/Services/InitiatePaymentService'
export { HandlePaymentSuccessService } from './Application/Services/HandlePaymentSuccessService'
export { HandlePaymentFailureService } from './Application/Services/HandlePaymentFailureService'

// DTOs 導出
export type { InitiatePaymentDTO } from './Application/DTOs/InitiatePaymentDTO'
export type { PaymentResponseDTO } from './Application/DTOs/PaymentResponseDTO'

export const PaymentModule: IModuleDefinition = {
	name: 'Payment',
	provider: PaymentServiceProvider,
	registerRepositories: registerPaymentRepositories,
	registerRoutes: (core) => {
		const repository = core.container.make('paymentRepository')
		const controller = new PaymentController(repository)
		const router = createGravitoModuleRouter(core)
		registerPaymentRoutes(router, controller)
	}
}
