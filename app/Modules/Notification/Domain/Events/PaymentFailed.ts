/**
 * @file PaymentFailed.ts
 * @description Notification 模組中 PaymentFailed 事件的導入和重新導出
 *
 * 注意：此檔案只是為了在 Notification Domain 層提供 PaymentFailed 事件的訪問。
 * 實際事件定義在 Payment 模組的 Domain/Events/PaymentFailed.ts 中。
 *
 * Role: Domain Layer - Import/Re-export
 */

export { PaymentFailed } from '@/Modules/Payment/Domain/Events/PaymentFailed'
