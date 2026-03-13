import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { OrderId } from '../../Domain/ValueObjects/OrderId'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'
import { PlaceOrderDTO, OrderResponseDTO } from '../../Application/DTOs/PlaceOrderDTO'

/**
 * OrderController - HTTP 控制器
 */
export class OrderController {
  constructor(
    private readonly placeOrderService: PlaceOrderService,
    private readonly orderRepository: IOrderRepository,
  ) {}

  /**
   * POST /orders - 建立訂單
   */
  async placeOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const dto: PlaceOrderDTO = ctx.body as any

      // 驗證輸入
      if (!dto.userId || !dto.lines || dto.lines.length === 0) {
        return ctx.json({
          success: false,
          error: '缺少必要字段: userId 和 lines',
        }, 400)
      }

      // 執行業務邏輯
      const orderDTO = await this.placeOrderService.execute(dto)

      return ctx.json({
        success: true,
        data: orderDTO,
      }, 201)
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '建立訂單失敗',
      }, 400)
    }
  }

  /**
   * GET /orders/:id - 獲取訂單詳情
   */
  async getOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: '訂單不存在',
        }, 404)
      }

      return ctx.json({
        success: true,
        data: this.orderToDTO(order),
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '獲取訂單失敗',
      }, 400)
    }
  }

  /**
   * GET /orders/user/:userId - 獲取用戶訂單列表
   */
  async getUserOrders(ctx: IHttpContext): Promise<Response> {
    try {
      const { userId } = ctx.params
      const orders = await this.orderRepository.findByUserId(userId!)

      return ctx.json({
        success: true,
        data: orders.map((order) => this.orderToDTO(order)),
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '獲取訂單列表失敗',
      }, 400)
    }
  }

  /**
   * POST /orders/:id/confirm - 確認訂單
   */
  async confirmOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: '訂單不存在',
        }, 404)
      }

      order.confirm()
      const updated = await this.orderRepository.update(order)

      return ctx.json({
        success: true,
        data: this.orderToDTO(updated),
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '確認訂單失敗',
      }, 400)
    }
  }

  /**
   * POST /orders/:id/ship - 發貨
   */
  async shipOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const { trackingNumber } = ctx.body as any
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: '訂單不存在',
        }, 404)
      }

      order.ship(trackingNumber)
      const updated = await this.orderRepository.update(order)

      return ctx.json({
        success: true,
        data: this.orderToDTO(updated),
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '發貨失敗',
      }, 400)
    }
  }

  /**
   * POST /orders/:id/cancel - 取消訂單
   */
  async cancelOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const { reason } = ctx.body as any
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: '訂單不存在',
        }, 404)
      }

      if (!reason) {
        return ctx.json({
          success: false,
          error: '取消原因不能為空',
        }, 400)
      }

      order.cancel(reason)
      const updated = await this.orderRepository.update(order)

      return ctx.json({
        success: true,
        data: this.orderToDTO(updated),
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '取消訂單失敗',
      }, 400)
    }
  }

  /**
   * 將訂單物件轉換為 DTO
   */
  private orderToDTO(order: any): OrderResponseDTO {
    return {
      orderId: order.orderId?.toString?.() || order.id,
      userId: order.userId,
      status: order.status?.toString?.() || order.status,
      lines: (order.lines || []).map((line: any) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice?.amount || line.unitPrice,
        lineTotal: line.lineTotal?.amount || line.lineTotal,
      })),
      total: {
        subtotal: order.total?.subtotal?.amount || order.subtotal,
        tax: order.total?.tax?.amount || order.tax,
        total: order.total?.total?.amount || order.total,
        currency: order.total?.subtotal?.currency || order.currency || 'TWD',
      },
      createdAt: new Date(order.createdAt).toISOString(),
      updatedAt: new Date(order.updatedAt).toISOString(),
    }
  }
}
