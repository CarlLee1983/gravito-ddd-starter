import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { Order } from '../../Domain/Aggregates/Order'
import { OrderLine } from '../../Domain/Aggregates/OrderLine'
import { OrderTotal } from '../../Domain/ValueObjects/OrderTotal'
import { Money } from '../../Domain/ValueObjects/Money'
import { PlaceOrderDTO, OrderResponseDTO } from '../DTOs/PlaceOrderDTO'

/**
 * PlaceOrderService - 應用層服務，負責建立訂單的協調
 */
export class PlaceOrderService {
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * 建立訂單
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
