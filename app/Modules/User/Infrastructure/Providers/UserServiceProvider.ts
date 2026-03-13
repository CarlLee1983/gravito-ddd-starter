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
import { resolveRepository } from '@wiring/RepositoryResolver'
import { getCurrentORM } from '@wiring/RepositoryFactory'
import { CreateUserService } from '../../Application/Services/CreateUserService'
import { GetUserService } from '../../Application/Services/GetUserService'
import { SendWelcomeEmail } from '../../Application/Handlers/SendWelcomeEmail'
import { SendWelcomeEmailJob } from '../../Application/Jobs/SendWelcomeEmailJob'
import { EventListenerRegistry } from '@/Shared/Infrastructure/EventListenerRegistry'
import { JobRegistry } from '@/Shared/Infrastructure/JobRegistry'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import type { IMailer } from '@/Shared/Infrastructure/IMailer'
import type { ILogger } from '@/Shared/Infrastructure/ILogger'
import type { ITranslator } from '@/Shared/Infrastructure/ITranslator'
import type { IJobQueue } from '@/Shared/Infrastructure/IJobQueue'

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
		container.singleton('userRepository', () => resolveRepository('user'))

		// 2. Application Services（供 Controller 使用）
		container.singleton('createUserService', (c) => {
			return new CreateUserService(c.make('userRepository') as IUserRepository)
		})
		container.singleton('getUserService', (c) => {
			return new GetUserService(c.make('userRepository') as IUserRepository)
		})

		// 3. 註冊 Job（單例）
		container.singleton('sendWelcomeEmailJob', (c) => {
			return new SendWelcomeEmailJob(
				c.make('mailer') as IMailer,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		// 4. 向 JobRegistry 聲明 Job（用於中心化綁定）
		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_welcome_email',
					jobFactory: (c) => c.make('sendWelcomeEmailJob'),
				},
			],
		})

		// 5. 註冊歡迎信 Handler (單例) - 現在 dispatch Job 而非直接發送
		container.singleton('sendWelcomeEmailHandler', (c) => {
			return new SendWelcomeEmail(
				c.make('jobQueue') as IJobQueue,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		// 6. 向 EventListenerRegistry 聲明事件監聽（用於中心化綁定）
		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: (c) => {
						const handler = c.make('sendWelcomeEmailHandler') as SendWelcomeEmail
						return (event) => handler.handle(event)
					},
				},
			],
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 *
	 * @param core - 啟動上下文 (Gravito 核心實例)
	 */
	override boot(core: any): void {
		// 開發環境輸出 ORM 信息用於調試
		if (process.env.NODE_ENV === 'development') {
			const orm = getCurrentORM()
			console.log(`👤 [User] Module loaded (ORM: ${orm})`)
		}

		// ✨ 事件監聽與 Job 路由已由中心化 Registry 管理
		// SharedServiceProvider.boot() 中的 EventListenerRegistry.bindAll() 會自動綁定所有監聽
		// JobRegistry.bindAll() 會自動註冊所有 Job Handler
	}
}
