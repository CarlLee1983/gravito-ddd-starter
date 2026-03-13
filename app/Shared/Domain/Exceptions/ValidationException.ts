/**
 * @file ValidationException.ts
 * @description 驗證失敗異常
 *
 * 當 ValueObject 或 Entity 的驗證失敗時拋出。
 */

import { DomainException } from './DomainException'

/**
 * 驗證異常
 */
export class ValidationException extends DomainException {
	constructor(
		fieldName: string,
		message: string,
		public readonly field?: string
	) {
		super(
			`${fieldName} 驗證失敗：${message}`,
			'VALIDATION_ERROR',
			422 // Unprocessable Entity
		)
	}
}
