/**
 * @file OrderController.ts
 * @description Order 模組 API 控制器
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IOrderMessages } from '@/Modules/Order/Presentation/Ports/IOrderMessages'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { OrderId } from '../../Domain/ValueObjects/OrderId'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'
import { PlaceOrderDTO, OrderResponseDTO } from '../../Application/DTOs/PlaceOrderDTO'

/**
 * Order 模組 API 控制器
 * 
 * 處理與訂單相關的 RESTful API 請求。
 * 負責將 HTTP 請求轉換為應用層服務調用或倉儲操作，並格式化回應結果。
 */
export class OrderController {
  /**
   * 初始化訂單控制器
   * 
   * @param placeOrderService - 建立訂單應用服務
   * @param orderRepository - 訂單倉儲介面
   */
  constructor(
    private readonly placeOrderService: PlaceOrderService,
    private readonly orderRepository: IOrderRepository,
    private readonly orderMessages: IOrderMessages,
  ) {}

  /**
   * 建立新訂單 (POST /orders)
   * 
   * @param ctx - HTTP 上下文，包含請求體中的訂單資訊
   * @returns Promise<Response> 建立成功後的訂單 DTO 或錯誤訊息
   */
  async placeOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const dto = await ctx.getJsonBody<PlaceOrderDTO>()

      // 驗證輸入
      if (!dto.userId || !dto.lines || dto.lines.length === 0) {
        return ctx.json({
          success: false,
          error: this.orderMessages.missingRequiredFields(),
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
        error: error instanceof Error ? error.message : this.orderMessages.createFailed(),
      }, 400)
    }
  }

  /**
   * 獲取單一訂單詳情 (GET /orders/:id)
   * 
   * @param ctx - HTTP 上下文，包含路徑參數 id
   * @returns Promise<Response> 訂單詳細資料或 404
   */
  async getOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: this.orderMessages.notFound(),
        }, 404)
      }

      return ctx.json({
        success: true,
        data: this.orderToDTO(order),
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : this.orderMessages.getFailed(),
      }, 400)
    }
  }

  /**
   * 獲取指定使用者的所有訂單 (GET /orders/user/:userId)
   * 
   * @param ctx - HTTP 上下文，包含路徑參數 userId
   * @returns Promise<Response> 該使用者的訂單列表
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
        error: error instanceof Error ? error.message : this.orderMessages.getListFailed(),
      }, 400)
    }
  }

  /**
   * 確認訂單 (POST /orders/:id/confirm)
   * 
   * 將訂單狀態更新為 Confirmed。通常由內部流程或支付回調觸發。
   * 
   * @param ctx - HTTP 上下文
   * @returns Promise<Response> 更新後的訂單資料
   */
  async confirmOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: this.orderMessages.notFound(),
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
        error: error instanceof Error ? error.message : this.orderMessages.confirmFailed(),
      }, 400)
    }
  }

  /**
   * 訂單發貨 (POST /orders/:id/ship)
   * 
   * @param ctx - HTTP 上下文，包含請求體中的追蹤單號 (trackingNumber)
   * @returns Promise<Response> 更新後的訂單資料
   */
  async shipOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const { trackingNumber } = await ctx.getJsonBody<{ trackingNumber: string }>()
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: this.orderMessages.notFound(),
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
        error: error instanceof Error ? error.message : this.orderMessages.shipFailed(),
      }, 400)
    }
  }

  /**
   * 取消訂單 (POST /orders/:id/cancel)
   * 
   * @param ctx - HTTP 上下文，包含請求體中的取消原因 (reason)
   * @returns Promise<Response> 更新後的訂單資料
   */
  async cancelOrder(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const { reason } = await ctx.getJsonBody<{ reason: string }>()
      const orderId = OrderId.fromString(id!)
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        return ctx.json({
          success: false,
          error: this.orderMessages.notFound(),
        }, 404)
      }

      if (!reason) {
        return ctx.json({
          success: false,
          error: this.orderMessages.cancelReasonRequired(),
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
        error: error instanceof Error ? error.message : this.orderMessages.cancelFailed(),
      }, 400)
    }
  }

  /**
   * 將訂單領域物件轉換為 DTO（內部私有方法）
   * 
   * @param order - 訂單聚合根或原始資料
   * @returns OrderResponseDTO 格式化後的 DTO
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
