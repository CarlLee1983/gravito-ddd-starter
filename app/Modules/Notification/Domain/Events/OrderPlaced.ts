/**
 * @file OrderPlaced.ts
 * @description Notification 模組中 OrderPlaced 事件的導入和重新導出
 *
 * 注意：此檔案只是為了在 Notification Domain 層提供 OrderPlaced 事件的訪問。
 * 實際事件定義在 Order 模組的 Domain/Events/OrderPlaced.ts 中。
 *
 * Role: Domain Layer - Import/Re-export
 */

export { OrderPlaced } from '@/Modules/Order/Domain/Events/OrderPlaced'
