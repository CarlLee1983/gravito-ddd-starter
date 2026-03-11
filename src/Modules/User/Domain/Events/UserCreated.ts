/**
 * @file UserCreated.ts
 * @description 當新用戶被建立時觸發的領域事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 用戶已建立事件
 */
export class UserCreated extends DomainEvent {
	/**
	 * 建立事件實例
	 * 
	 * @param userId - 用戶唯一識別碼
	 * @param name - 用戶名稱
	 * @param email - 用戶電子郵件
	 */
	constructor(
		public readonly userId: string,
		public readonly name: string,
		public readonly email: string
	) {
		super(userId, 'UserCreated', { name, email })
	}

	/**
	 * 序列化為 JSON
	 */
	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			aggregateId: this.userId,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			data: {
				name: this.name,
				email: this.email
			}
		}
	}
}
