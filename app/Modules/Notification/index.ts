/**
 * @file index.ts
 * @description Notification 模組導出點
 *
 * 本檔案導出 Notification 模組的公開 API，包括：
 * - 模組定義（notificationModule）
 * - Jobs 和 Handlers（用於測試）
 * - Event 導出
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { NotificationServiceProvider } from './Infrastructure/Providers/NotificationServiceProvider'

/**
 * Notification 模組定義
 *
 * 展示框架的事件驅動與背景任務能力，訂閱多個 IntegrationEvent，
 * 通過 Job Queue 非同步發送通知 Email。
 */
export const notificationModule: IModuleDefinition = {
	name: 'Notification',
	provider: NotificationServiceProvider,

	/**
	 * Notification 是純應用層模組，無 Domain aggregate 或 Repository
	 */
	registerRepositories: () => {
		// no-op - 無需註冊 Repository
	},

	/**
	 * Notification 初期無 HTTP 端點
	 * A3.5-A3.6 中會添加端點用於查詢發送日誌等
	 */
	registerRoutes: () => {
		// no-op - 初期無 HTTP 路由
	},
}

// 導出 Jobs（用於測試）
export { SendOrderConfirmEmailJob, type SendOrderConfirmEmailData } from './Application/Jobs/SendOrderConfirmEmailJob'
export { SendPaymentSuccessEmailJob, type SendPaymentSuccessEmailData } from './Application/Jobs/SendPaymentSuccessEmailJob'
export { SendPaymentFailedEmailJob, type SendPaymentFailedEmailData } from './Application/Jobs/SendPaymentFailedEmailJob'

// 導出 Handlers（用於測試）
export { SendOrderConfirmEmailHandler } from './Application/Handlers/SendOrderConfirmEmailHandler'
export { SendPaymentSuccessEmailHandler } from './Application/Handlers/SendPaymentSuccessEmailHandler'
export { SendPaymentFailedEmailHandler } from './Application/Handlers/SendPaymentFailedEmailHandler'

// 導出訊息服務
export { NotificationMessageService } from './Infrastructure/Services/NotificationMessageService'
export type { INotificationMessages } from './Presentation/Ports/INotificationMessages'

// 導出事件（重新導出）
export { OrderPlaced } from './Domain/Events/OrderPlaced'
export { PaymentSucceeded } from './Domain/Events/PaymentSucceeded'
export { PaymentFailed } from './Domain/Events/PaymentFailed'
