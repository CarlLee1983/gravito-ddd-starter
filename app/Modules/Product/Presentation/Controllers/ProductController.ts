/**
 * @file ProductController.ts
 * @description 產品控制器
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { CreateProductService } from '../../Application/Services/CreateProductService'
import type { GetProductService } from '../../Application/Services/GetProductService'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { IProductMessages } from '@/Foundation/Infrastructure/Ports/Messages/IProductMessages'

export class ProductController {
  /**
   * 建構子
   *
   * @param createProductService - 建立產品服務
   * @param getProductService - 取得產品服務
   * @param queryService - 產品查詢服務
   * @param logger - 日誌服務
   * @param productMessages - 產品訊息服務
   */
  constructor(
    private createProductService: CreateProductService,
    private getProductService: GetProductService,
    private queryService: IProductQueryService,
    private logger: ILogger,
    private productMessages: IProductMessages,
  ) {}

  /**
   * 建立產品
   *
   * @param ctx - HTTP 上下文
   * @returns Promise<Response>
   */
  async create(ctx: IHttpContext): Promise<Response> {
    try {
      const { name, amount, currency, sku, stockQuantity } = await ctx.getJsonBody<{ name: string, amount: number, currency: string, sku: string, stockQuantity: number }>()

      const id = await this.createProductService.execute({
        name,
        amount,
        currency,
        sku,
        stockQuantity
      })

      const product = await this.getProductService.execute(id)

      return ctx.json({
        success: true,
        data: product,
        message: this.productMessages.createSuccess()
      }, 201)
    } catch (error) {
      this.logger.error('Failed to create product', { error })
      return ctx.json({
        success: false,
        error: (error as Error).message
      }, 400)
    }
  }

  /**
   * 按 ID 取得產品
   *
   * @param ctx - HTTP 上下文
   * @returns Promise<Response>
   */
  async getById(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const product = await this.getProductService.execute(id!)

      if (!product) {
        return ctx.json({
          success: false,
          error: '產品未找到'
        }, 404)
      }

      return ctx.json({
        success: true,
        data: product
      })
    } catch (error) {
      this.logger.error('Failed to get product', { error })
      return ctx.json({
        success: false,
        error: (error as Error).message
      }, 400)
    }
  }

  /**
   * 取得所有產品
   *
   * @param ctx - HTTP 上下文
   * @returns Promise<Response>
   */
  async getAll(ctx: IHttpContext): Promise<Response> {
    try {
      const products = await this.queryService.findAll()

      return ctx.json({
        success: true,
        data: products,
        meta: {
          total: products.length
        }
      })
    } catch (error) {
      this.logger.error('Failed to get products', { error })
      return ctx.json({
        success: false,
        error: (error as Error).message
      }, 400)
    }
  }
}
