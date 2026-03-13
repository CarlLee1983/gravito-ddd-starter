/**
 * @file DuplicateEntityException.ts
 * @description 重複實體異常
 *
 * 當嘗試建立已存在的唯一實體時拋出。
 */

import { DomainException } from './DomainException'

/**
 * 重複實體異常
 */
export class DuplicateEntityException extends DomainException {
	constructor(entityName: string, field: string, value: string) {
		super(
			`${entityName} 的 ${field} 已被使用：${value}`,
			'DUPLICATE_ENTITY',
			409
		)
	}
}
