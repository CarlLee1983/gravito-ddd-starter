import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { InitiatePaymentService } from '@/Modules/Payment/Application/Services/InitiatePaymentService'
import { HandlePaymentSuccessService } from '@/Modules/Payment/Application/Services/HandlePaymentSuccessService'
import { HandlePaymentFailureService } from '@/Modules/Payment/Application/Services/HandlePaymentFailureService'
import { Payment } from '@/Modules/Payment/Domain/Aggregates/Payment'
import { PaymentId } from '@/Modules/Payment/Domain/ValueObjects/PaymentId'
import { TransactionId } from '@/Modules/Payment/Domain/ValueObjects/TransactionId'
import { Amount } from '@/Modules/Payment/Domain/ValueObjects/Amount'
import { PaymentMethod } from '@/Modules/Payment/Domain/ValueObjects/PaymentMethod'
import type { IPaymentRepository } from '@/Modules/Payment/Domain/Repositories/IPaymentRepository'

describe('Payment Application Services', () => {
	let mockRepository: IPaymentRepository
	let initiateService: InitiatePaymentService
	let successService: HandlePaymentSuccessService
	let failureService: HandlePaymentFailureService

	beforeEach(() => {
		// 建立Mock Repository
		mockRepository = {
			findAll: mock(async () => []),
			findById: mock(async () => null),
			findByOrderId: mock(async () => null),
			findByTransactionId: mock(async () => null),
			save: mock(async () => {}),
			delete: mock(async () => {}),
			count: mock(async () => 0)
		} as any

		initiateService = new InitiatePaymentService(mockRepository)
		successService = new HandlePaymentSuccessService(mockRepository)
		failureService = new HandlePaymentFailureService(mockRepository)
	})

	describe('InitiatePaymentService', () => {
		it('應該建立新支付', async () => {
			const dto = {
				orderId: 'ORD-001',
				userId: 'USER-001',
				amountCents: 50000,
				paymentMethod: 'CREDIT_CARD'
			}

			const result = await initiateService.execute(dto)

			expect(result.orderId).toBe('ORD-001')
			expect(result.userId).toBe('USER-001')
			expect(result.amountCents).toBe(50000)
			expect(result.amountTWD).toBe(500)
			expect(result.paymentMethod).toBe('CREDIT_CARD')
			expect(result.status).toBe('INITIATED')
		})

		it('應該驗證必填欄位', async () => {
			const invalidDto = {
				orderId: '',
				userId: 'USER-001',
				amountCents: 50000,
				paymentMethod: 'CREDIT_CARD'
			}

			expect(async () => {
				await initiateService.execute(invalidDto)
			}).toThrow()
		})

		it('應該驗證金額必須為正', async () => {
			const invalidDto = {
				orderId: 'ORD-002',
				userId: 'USER-002',
				amountCents: 0,
				paymentMethod: 'CREDIT_CARD'
			}

			expect(async () => {
				await initiateService.execute(invalidDto)
			}).toThrow()
		})

		it('應該支持所有支付方式', async () => {
			const methods = ['CREDIT_CARD', 'BANK_TRANSFER', 'WALLET_TRANSFER', 'LINE_PAY', 'APPLE_PAY']

			for (const method of methods) {
				const dto = {
					orderId: `ORD-${method}`,
					userId: 'USER-001',
					amountCents: 50000,
					paymentMethod: method
				}

				const result = await initiateService.execute(dto)
				expect(result.paymentMethod).toBe(method)
			}
		})

		it('應該儲存支付到資料庫', async () => {
			const dto = {
				orderId: 'ORD-SAVE',
				userId: 'USER-SAVE',
				amountCents: 75000,
				paymentMethod: 'BANK_TRANSFER'
			}

			await initiateService.execute(dto)

			// 驗證save被調用
			expect(mockRepository.save).toHaveBeenCalled()
		})

		it('應該返回完整的DTO', async () => {
			const dto = {
				orderId: 'ORD-DTO',
				userId: 'USER-DTO',
				amountCents: 99999,
				paymentMethod: 'LINE_PAY'
			}

			const result = await initiateService.execute(dto)

			expect(result).toHaveProperty('id')
			expect(result).toHaveProperty('orderId')
			expect(result).toHaveProperty('userId')
			expect(result).toHaveProperty('amountCents')
			expect(result).toHaveProperty('amountTWD')
			expect(result).toHaveProperty('paymentMethod')
			expect(result).toHaveProperty('status')
			expect(result).toHaveProperty('createdAt')
			expect(result).toHaveProperty('updatedAt')
		})
	})

	describe('HandlePaymentSuccessService', () => {
		it('應該標記支付為成功', async () => {
			// 建立一個支付並模擬資料庫查詢
			const payment = Payment.create(
				'ORD-001',
				'USER-001',
				new Amount(50000),
				PaymentMethod.creditCard()
			)

			mockRepository.findById = mock(async () => payment)
			successService = new HandlePaymentSuccessService(mockRepository)

			await successService.execute(payment.id.value, 'TXN-123')

			expect(payment.isPaid()).toBe(true)
			expect(payment.transactionId?.value).toBe('TXN-123')
		})

		it('應該拒絕不存在的支付', async () => {
			mockRepository.findById = mock(async () => null)
			successService = new HandlePaymentSuccessService(mockRepository)

			expect(async () => {
				await successService.execute('INVALID-ID', 'TXN-123')
			}).toThrow('支付記錄不存在')
		})

		it('應該拒絕標記非初始狀態的支付為成功', async () => {
			const payment = Payment.create(
				'ORD-002',
				'USER-002',
				new Amount(50000),
				PaymentMethod.creditCard()
			)
			payment.fail('測試失敗')

			mockRepository.findById = mock(async () => payment)
			successService = new HandlePaymentSuccessService(mockRepository)

			expect(async () => {
				await successService.execute(payment.id.value, 'TXN-456')
			}).toThrow('無效')
		})

		it('應該儲存成功的支付', async () => {
			const payment = Payment.create(
				'ORD-003',
				'USER-003',
				new Amount(50000),
				PaymentMethod.creditCard()
			)

			mockRepository.findById = mock(async () => payment)
			const saveMock = mock(async () => {})
			mockRepository.save = saveMock

			successService = new HandlePaymentSuccessService(mockRepository)

			await successService.execute(payment.id.value, 'TXN-789')

			expect(saveMock).toHaveBeenCalled()
		})
	})

	describe('HandlePaymentFailureService', () => {
		it('應該標記支付為失敗', async () => {
			const payment = Payment.create(
				'ORD-001',
				'USER-001',
				new Amount(50000),
				PaymentMethod.creditCard()
			)

			mockRepository.findById = mock(async () => payment)
			failureService = new HandlePaymentFailureService(mockRepository)

			await failureService.execute(payment.id.value, '卡片被拒絕')

			expect(payment.isFailed()).toBe(true)
			expect(payment.failureReason).toBe('卡片被拒絕')
		})

		it('應該拒絕不存在的支付', async () => {
			mockRepository.findById = mock(async () => null)
			failureService = new HandlePaymentFailureService(mockRepository)

			expect(async () => {
				await failureService.execute('INVALID-ID', '失敗原因')
			}).toThrow('支付記錄不存在')
		})

		it('應該拒絕標記非初始狀態的支付為失敗', async () => {
			const payment = Payment.create(
				'ORD-002',
				'USER-002',
				new Amount(50000),
				PaymentMethod.creditCard()
			)
			payment.succeed(new TransactionId('TXN-001'))

			mockRepository.findById = mock(async () => payment)
			failureService = new HandlePaymentFailureService(mockRepository)

			expect(async () => {
				await failureService.execute(payment.id.value, '失敗')
			}).toThrow('無效')
		})

		it('應該儲存失敗的支付', async () => {
			const payment = Payment.create(
				'ORD-003',
				'USER-003',
				new Amount(50000),
				PaymentMethod.creditCard()
			)

			mockRepository.findById = mock(async () => payment)
			const saveMock = mock(async () => {})
			mockRepository.save = saveMock

			failureService = new HandlePaymentFailureService(mockRepository)

			await failureService.execute(payment.id.value, '超時')

			expect(saveMock).toHaveBeenCalled()
		})

		it('應該支持各種失敗原因', async () => {
			const reasons = [
				'卡片被拒絕',
				'銀行帳戶無效',
				'餘額不足',
				'服務暫時中斷',
				'超時'
			]

			for (const reason of reasons) {
				const payment = Payment.create(
					'ORD-FAIL',
					'USER-FAIL',
					new Amount(50000),
					PaymentMethod.creditCard()
				)

				mockRepository.findById = mock(async () => payment)
				failureService = new HandlePaymentFailureService(mockRepository)

				await failureService.execute(payment.id.value, reason)
				expect(payment.failureReason).toBe(reason)
			}
		})
	})

	describe('服務集成', () => {
		it('應該支持完整的支付流程：建立→成功', async () => {
			// 步驟1: 建立支付
			const dto = {
				orderId: 'ORD-FULL',
				userId: 'USER-FULL',
				amountCents: 100000,
				paymentMethod: 'CREDIT_CARD'
			}

			const result = await initiateService.execute(dto)
			expect(result.status).toBe('INITIATED')

			// 步驟2: 模擬支付成功
			const payment = Payment.create(
				dto.orderId,
				dto.userId,
				new Amount(dto.amountCents),
				PaymentMethod.from(dto.paymentMethod)
			)
			payment.clearDomainEvents() // 清空建立時的事件

			mockRepository.findById = mock(async () => payment)
			successService = new HandlePaymentSuccessService(mockRepository)

			await successService.execute(payment.id.value, 'TXN-FULL-001')

			expect(payment.isPaid()).toBe(true)
		})

		it('應該支持完整的支付流程：建立→失敗', async () => {
			// 步驟1: 建立支付
			const dto = {
				orderId: 'ORD-FAIL-FLOW',
				userId: 'USER-FAIL-FLOW',
				amountCents: 50000,
				paymentMethod: 'BANK_TRANSFER'
			}

			const result = await initiateService.execute(dto)
			expect(result.status).toBe('INITIATED')

			// 步驟2: 模擬支付失敗
			const payment = Payment.create(
				dto.orderId,
				dto.userId,
				new Amount(dto.amountCents),
				PaymentMethod.from(dto.paymentMethod)
			)
			payment.clearDomainEvents()

			mockRepository.findById = mock(async () => payment)
			failureService = new HandlePaymentFailureService(mockRepository)

			await failureService.execute(payment.id.value, '銀行帳戶無效')

			expect(payment.isFailed()).toBe(true)
			expect(payment.failureReason).toBe('銀行帳戶無效')
		})
	})
})
