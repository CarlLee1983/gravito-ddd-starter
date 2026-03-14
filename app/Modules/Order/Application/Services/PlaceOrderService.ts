/**
 * @file PlaceOrderService.ts
 * @description 建立訂單應用層服務
 */

import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { Order } from '../../Domain/Aggregates/Order'
import { OrderLine } from '../../Domain/Aggregates/OrderLine'
import { OrderTotal } from '../../Domain/ValueObjects/OrderTotal'
import { Money } from '../../Domain/ValueObjects/Money'
import { PlaceOrderDTO, OrderResponseDTO } from '../DTOs/PlaceOrderDTO'

/**
 * 建立訂單應用層服務
 * 
 * 負責協調建立訂單的業務流程，包括驗證、計算總額、創建聚合根及持久化。
 * 遵循 DDD 應用服務模式，不包含核心業務邏輯，僅負責流程編排。
 */
export class PlaceOrderService {
  /**
   * 初始化建立訂單服務
   * 
   * @param orderRepository - 訂單倉儲介面
   */
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * 執行建立訂單邏輯
   * 
   * @param dto - 建立訂單的資料傳輸物件
   * @returns Promise<OrderResponseDTO> 建立成功後的訂單資料
   * @throws Error 當 userId 為空、訂單項目為空或業務規則檢查失敗時拋出
   */
  async execute(dto: PlaceOrderDTO): Promise<OrderResponseDTO> {
    // 1. 驗證輸入
    if (!dto.userId) {
      throw new Error('userId 不能為空')
    }
    if (!dto.lines || dto.lines.length === 0) {
      throw new Error('訂單至少需要一個行項目')
    }

    // 2. 建立 OrderLine 實體列表
    const lines = dto.lines.map((lineDto) => {
      const unitPrice = Money.create(lineDto.unitPrice)
      return OrderLine.create(
        lineDto.productId,
        lineDto.productName,
        lineDto.quantity,
        unitPrice,
      )
    })

    // 3. 計算訂單總額
    const subtotal = lines.reduce(
      (sum, line) => sum + line.lineTotal.amount,
      0,
    )
    const subtotalMoney = Money.create(subtotal)
    const orderTotal = OrderTotal.create(subtotalMoney, dto.taxAmount || 0)

    // 4. 創建 Order 聚合根
    const order = Order.create(dto.userId, lines, orderTotal)

    // 5. 保存訂單到數據庫（並分派事件）
    const savedOrder = await this.orderRepository.save(order)

    // 6. 轉換為 DTO 返回
    return this.toDTO(savedOrder)
  }

  /**
   * 將 Order 聚合根轉換為 DTO
   * 
   * @param order - 訂單聚合根
   * @returns OrderResponseDTO 訂單回應 DTO
   */
  private toDTO(order: Order): OrderResponseDTO {
    return {
      orderId: order.orderId.toString(),
      userId: order.userId,
      status: order.status.toString(),
      lines: order.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice.amount,
        lineTotal: line.lineTotal.amount,
      })),
      total: {
        subtotal: order.total.subtotal.amount,
        tax: order.total.tax.amount,
        total: order.total.total.amount,
        currency: order.total.subtotal.currency,
      },
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }
  }
}
