/**
 * @file IPaymentMessages.ts
 * @description 支付模組訊息 Port 介面
 */

export interface IPaymentMessages {
	missingPaymentId(): string
	paymentNotFound(): string
	unknown_error(): string
}
