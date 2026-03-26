/**
 * @file AuditLogEvents.ts
 * @description AuditLog 模組事件的本地副本（re-export 模式）
 *
 * 遵循 Notification 模組的 re-export 模式，
 * 在 AuditLog Domain 層提供所有監聽事件的訪問。
 *
 * Role: Domain Layer - Import/Re-export
 */

export { OrderPlaced } from '@/Modules/Order/Domain/Events/OrderPlaced'
export { OrderCancelled } from '@/Modules/Order/Domain/Events/OrderCancelled'
export { PaymentSucceeded } from '@/Modules/Payment/Domain/Events/PaymentSucceeded'
export { PaymentFailed } from '@/Modules/Payment/Domain/Events/PaymentFailed'
export { InventoryDeducted } from '@/Modules/Inventory/Domain/Events/InventoryDeducted'
