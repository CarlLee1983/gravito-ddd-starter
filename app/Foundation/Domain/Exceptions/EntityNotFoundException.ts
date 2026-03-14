/**
 * @file EntityNotFoundException.ts
 * @description 實體未找到異常
 *
 * 當查詢不存在的實體時拋出。
 */

import { DomainException } from './DomainException'

/**
 * 實體未找到異常
 */
export class EntityNotFoundException extends DomainException {
	constructor(entityName: string, id: string) {
		super(
			`${entityName} 不存在：${id}`,
			'ENTITY_NOT_FOUND',
			404
		)
	}
}
