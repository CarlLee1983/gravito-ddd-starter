/**
 * @file UserServiceProvider.ts
 * @description User 模組服務提供者
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責 User 模組的依賴注入與生命週期管理。
 * - 職責：配置與註冊該模組所需的領域服務、倉儲實例，並處理模組啟動時的初始化邏輯。
 *
 * 設計原則：
 * - 繼承框架無關的 ModuleServiceProvider
 * - 僅註冊 Domain/Application 層的依賴（Repository、Handler 等）
 * - Presentation 層的依賴（Controller）由 Wiring 層負責組裝
 * - ServiceProvider 專注於核心業務服務的生命週期管理
 * - 完全不依賴 @gravito/core（框架無關）
 *
 * ORM 抽換機制（已簡化）：
 * - Repository 由 RepositoryRegistry 提供
 * - 無需在此檔案中重複 ORM 選擇邏輯
 * - 單一責任：只負責依賴注入
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'
import { SendWelcomeEmail } from '../../Application/Handlers/SendWelcomeEmail'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'
import type { IMailer } from '@/Shared/Infrastructure/IMailer'
import type { ILogger } from '@/Shared/Infrastructure/ILogger'
import type { ITranslator } from '@/Shared/Infrastructure/ITranslator'

/**
 * User 模組服務提供者實作類別
 */
export class UserServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 *
	 * 流程：
	 * 1. 從 RepositoryRegistry 取得已註冊的 Repository 工廠
	 * 2. 創建 Repository 實例（ORM 選擇由 Registry 負責）
	 *
	 * @param container - 框架無關的容器介面，用於註冊單例或工廠
	 */
	override register(container: IContainer): void {
		// 1. 從 Registry 取得 Repository（ORM 選擇已由 Registry 處理）
		container.singleton('userRepository', () => {
			const registry = getRegistry()
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('user', orm, db)
		})

		// 2. 註冊歡迎信 Handler (單例)
		container.singleton('sendWelcomeEmailHandler', (c) => {
			return new SendWelcomeEmail(
				c.make('mailer') as IMailer,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 *
	 * @param core - 啟動上下文 (Gravito 核心實例)
	 */
	override boot(core: any): void {
		const orm = getCurrentORM()
		console.log(`👤 [User] Module loaded (ORM: ${orm})`)

		// ✨ 訂閱用戶建立事件 (自動化業務流程)
		try {
			const dispatcher = core.container.make('eventDispatcher') as IEventDispatcher
			const handler = core.container.make('sendWelcomeEmailHandler') as SendWelcomeEmail
			
			dispatcher.subscribe('UserCreated', (event) => handler.handle(event))
			console.log('🔗 [User] Subscribed to UserCreated for Welcome Email')
		} catch (error) {
			console.warn('⚠️ [User] Could not subscribe to UserCreated events')
		}
	}
}
