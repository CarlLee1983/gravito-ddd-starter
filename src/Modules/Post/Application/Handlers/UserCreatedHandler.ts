/**
 * @file UserCreatedHandler.ts
 * @description 當 User 模組發布 UserCreated 事件時，Post 模組的應對邏輯
 */

import type { UserCreated } from '@/Modules/User/Domain/Events/UserCreated'

/**
 * 跨模組事件處理器
 * 
 * 展示了執行序上的解耦：Post 模組不直接被 User 模組調用，而是監聽事件。
 */
export class UserCreatedHandler {
	/**
	 * 處理事件
	 */
	async handle(event: UserCreated): Promise<void> {
		console.log(`📢 [Post Module] 收到新用戶建立事件: ${event.name} (${event.userId})`)
		
		// 這裡可以執行 Post 模組相關的邏輯
		// 例如：為新用戶建立一篇「歡迎來到我的部落格」的初始文章
		// 或是初始化該用戶在 Post 模組中的統計資料
	}
}
