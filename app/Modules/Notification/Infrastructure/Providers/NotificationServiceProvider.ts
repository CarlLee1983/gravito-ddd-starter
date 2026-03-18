/**
 * @file NotificationServiceProvider.ts
 * @description Notification 模組服務提供者
 *
 * 職責：
 * - 註冊 Jobs（SendOrderConfirmEmailJob、SendPaymentSuccessEmailJob、SendPaymentFailedEmailJob）
 * - 註冊 Event Handlers（SendOrderConfirmEmailHandler、SendPaymentSuccessEmailHandler、SendPaymentFailedEmailHandler）
 * - 註冊訊息服務（NotificationMessageService）
 * - 聲明事件監聽（訂閱 OrderPlaced、PaymentSucceeded、PaymentFailed）
 *
 * Role: Infrastructure Layer - Service Provider
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { SendOrderConfirmEmailJob } from '../../Application/Jobs/SendOrderConfirmEmailJob'
import { SendPaymentSuccessEmailJob } from '../../Application/Jobs/SendPaymentSuccessEmailJob'
import { SendPaymentFailedEmailJob } from '../../Application/Jobs/SendPaymentFailedEmailJob'
import { SendOrderConfirmEmailHandler } from '../../Application/Handlers/SendOrderConfirmEmailHandler'
import { SendPaymentSuccessEmailHandler } from '../../Application/Handlers/SendPaymentSuccessEmailHandler'
import { SendPaymentFailedEmailHandler } from '../../Application/Handlers/SendPaymentFailedEmailHandler'
import { NotificationMessageService } from '../Services/NotificationMessageService'
import { NotificationController } from '../../Presentation/Controllers/NotificationController'
import { EventListenerRegistry } from '@/Foundation/Infrastructure/Registries/EventListenerRegistry'
import { JobRegistry } from '@/Foundation/Infrastructure/Registries/JobRegistry'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'

/**
 * Notification 模組服務提供者實作
 */
export class NotificationServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有 Notification 模組的依賴
	 *
	 * @param container - 框架無關的容器介面
	 */
	override register(container: IContainer): void {
		// 1. 註冊訊息服務
		container.singleton('notificationMessages', (c) => {
			try {
				return new NotificationMessageService(c.make('translator') as ITranslator)
			} catch {
				const fallback: any = {
					trans: (key: string) => key,
					choice: (key: string) => key,
					setLocale: () => {},
					getLocale: () => 'en',
				}
				return new NotificationMessageService(fallback)
			}
		})

		// 1.5. 註冊控制器
		container.singleton('notificationController', (c) => {
			return new NotificationController(c.make('notificationMessages'))
		})

		// 2. 註冊 Jobs（單例）
		container.singleton('sendOrderConfirmEmailJob', (c) => {
			return new SendOrderConfirmEmailJob(
				c.make('mailer') as IMailer,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		container.singleton('sendPaymentSuccessEmailJob', (c) => {
			return new SendPaymentSuccessEmailJob(
				c.make('mailer') as IMailer,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		container.singleton('sendPaymentFailedEmailJob', (c) => {
			return new SendPaymentFailedEmailJob(
				c.make('mailer') as IMailer,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		// 3. 向 JobRegistry 聲明 Jobs
		JobRegistry.register({
			moduleName: 'Notification',
			jobs: [
				{
					jobName: 'notification.send_order_confirm_email',
					jobFactory: (c) => c.make('sendOrderConfirmEmailJob'),
				},
				{
					jobName: 'notification.send_payment_success_email',
					jobFactory: (c) => c.make('sendPaymentSuccessEmailJob'),
				},
				{
					jobName: 'notification.send_payment_failed_email',
					jobFactory: (c) => c.make('sendPaymentFailedEmailJob'),
				},
			],
		})

		// 4. 註冊 Event Handlers（單例）
		container.singleton('sendOrderConfirmEmailHandler', (c) => {
			return new SendOrderConfirmEmailHandler(
				c.make('jobQueue') as IJobQueue,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		container.singleton('sendPaymentSuccessEmailHandler', (c) => {
			return new SendPaymentSuccessEmailHandler(
				c.make('jobQueue') as IJobQueue,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		container.singleton('sendPaymentFailedEmailHandler', (c) => {
			return new SendPaymentFailedEmailHandler(
				c.make('jobQueue') as IJobQueue,
				c.make('logger') as ILogger,
				c.make('translator') as ITranslator
			)
		})

		// 5. 向 EventListenerRegistry 聲明事件監聽
		EventListenerRegistry.register({
			moduleName: 'Notification',
			listeners: [
				{
					eventName: 'OrderPlaced',
					handlerFactory: (c) => {
						const handler = c.make('sendOrderConfirmEmailHandler') as SendOrderConfirmEmailHandler
						return (event) => handler.handle(event)
					},
				},
				{
					eventName: 'PaymentSucceeded',
					handlerFactory: (c) => {
						const handler = c.make('sendPaymentSuccessEmailHandler') as SendPaymentSuccessEmailHandler
						return (event) => handler.handle(event)
					},
				},
				{
					eventName: 'PaymentFailed',
					handlerFactory: (c) => {
						const handler = c.make('sendPaymentFailedEmailHandler') as SendPaymentFailedEmailHandler
						return (event) => handler.handle(event)
					},
				},
			],
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 *
	 * @param core - 啟動上下文
	 */
	override boot(core: any): void {
		if (process.env.NODE_ENV === 'development') {
			const logger = core.container.make('logger') as ILogger
			logger.debug('📧 [Notification] Module loaded')
		}

		// 事件監聽與 Job 路由由中心化 Registry 管理
		// SharedServiceProvider.boot() 中的 EventListenerRegistry.bindAll() 和 JobRegistry.bindAll() 會自動綁定
	}
}
