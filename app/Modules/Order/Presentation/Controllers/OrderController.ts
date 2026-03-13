import { Controller, IRequest, IResponse } from '@gravito/core'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { OrderId } from '../../Domain/ValueObjects/OrderId'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'
import { PlaceOrderDTO, OrderResponseDTO } from '../../Application/DTOs/PlaceOrderDTO'

/**
 * OrderController - HTTP 控制器
 */
export class OrderController extends Controller {
  constructor(
    private readonly placeOrderService: PlaceOrderService,
    private readonly orderRepository: IOrderRepository,
  ) {
    super()
  }

  /**
   * POST /orders - 建立訂單
   */
  async placeOrder(req: IRequest, res: IResponse): Promise<void> {
    try {
      const dto: PlaceOrderDTO = req.body

      // 驗證輸入
      if (!dto.userId || !dto.lines || dto.lines.length === 0) {
        res.status(400).json({
          success: false,
          error: '缺少必要字段: userId 和 lines',
        })
        return
      }

      // 執行業務邏輯
      const orderDTO = await this.placeOrderService.execute(dto)

      res.status(201).json({
        success: true,
        data: orderDTO,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '建立訂單失敗',
      })
    }
  }

  /**
   * GET /orders/:id - 獲取訂單詳情
   */
  async getOrder(req: IRequest, res: IResponse): Promise<void> {
    try {
      const { id } = req.params
      const orderId = OrderId.fromString(id)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        res.status(404).json({
          success: false,
          error: '訂單不存在',
        })
        return
      }

      res.status(200).json({
        success: true,
        data: this.orderToDTO(order),
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '獲取訂單失敗',
      })
    }
  }

  /**
   * GET /orders/user/:userId - 獲取用戶訂單列表
   */
  async getUserOrders(req: IRequest, res: IResponse): Promise<void> {
    try {
      const { userId } = req.params
      const orders = await this.orderRepository.findByUserId(userId)

      res.status(200).json({
        success: true,
        data: orders.map((order) => this.orderToDTO(order)),
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '獲取訂單列表失敗',
      })
    }
  }

  /**
   * POST /orders/:id/confirm - 確認訂單
   */
  async confirmOrder(req: IRequest, res: IResponse): Promise<void> {
    try {
      const { id } = req.params
      const orderId = OrderId.fromString(id)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        res.status(404).json({
          success: false,
          error: '訂單不存在',
        })
        return
      }

      order.confirm()
      const updated = await this.orderRepository.update(order)

      res.status(200).json({
        success: true,
        data: this.orderToDTO(updated),
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '確認訂單失敗',
      })
    }
  }

  /**
   * POST /orders/:id/ship - 發貨
   */
  async shipOrder(req: IRequest, res: IResponse): Promise<void> {
    try {
      const { id } = req.params
      const { trackingNumber } = req.body
      const orderId = OrderId.fromString(id)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        res.status(404).json({
          success: false,
          error: '訂單不存在',
        })
        return
      }

      order.ship(trackingNumber)
      const updated = await this.orderRepository.update(order)

      res.status(200).json({
        success: true,
        data: this.orderToDTO(updated),
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '發貨失敗',
      })
    }
  }

  /**
   * POST /orders/:id/cancel - 取消訂單
   */
  async cancelOrder(req: IRequest, res: IResponse): Promise<void> {
    try {
      const { id } = req.params
      const { reason } = req.body
      const orderId = OrderId.fromString(id)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        res.status(404).json({
          success: false,
          error: '訂單不存在',
        })
        return
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: '取消原因不能為空',
        })
        return
      }

      order.cancel(reason)
      const updated = await this.orderRepository.update(order)

      res.status(200).json({
        success: true,
        data: this.orderToDTO(updated),
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '取消訂單失敗',
      })
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
