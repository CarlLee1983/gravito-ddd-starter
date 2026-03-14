/**
 * @file index.ts
 * @description Order 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { OrderServiceProvider } from './Infrastructure/Providers/OrderServiceProvider'
import { registerOrderRepositories } from './Infrastructure/Providers/registerOrderRepositories'
import { wireOrderRoutes } from './Infrastructure/Wiring/wireOrderRoutes'

// 導出 Domain 層
export { Order } from './Domain/Aggregates/Order'
export { OrderLine } from './Domain/Aggregates/OrderLine'
export { OrderId } from './Domain/ValueObjects/OrderId'
export { OrderStatus, OrderStatusEnum } from './Domain/ValueObjects/OrderStatus'
export { Money } from './Domain/ValueObjects/Money'
export { OrderTotal } from './Domain/ValueObjects/OrderTotal'
export type { IOrderRepository } from './Domain/Repositories/IOrderRepository'

// 導出 Events
export { OrderPlaced } from './Domain/Events/OrderPlaced'
export { OrderConfirmed } from './Domain/Events/OrderConfirmed'
export { OrderShipped } from './Domain/Events/OrderShipped'
export { OrderCancelled } from './Domain/Events/OrderCancelled'

// 導出 Application 層
export { PlaceOrderService } from './Application/Services/PlaceOrderService'
export type { PlaceOrderDTO, OrderResponseDTO } from './Application/DTOs/PlaceOrderDTO'

// 導出 Infrastructure 層
export { OrderRepository } from './Infrastructure/Repositories/OrderRepository'
export { OrderServiceProvider } from './Infrastructure/Providers/OrderServiceProvider'

/**
 * Order Module Definition
 * 遵循 gravito-ddd 模組自動註冊機制
 */
export const OrderModule: IModuleDefinition = {
  name: 'Order',
  provider: OrderServiceProvider,
  registerRepositories: registerOrderRepositories,
  registerRoutes: wireOrderRoutes,
}

// 為了向後相容性，保留 default 導出（可選）
export default OrderModule
