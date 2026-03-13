/**
 * @file ProductController.ts
 * @description 產品控制器
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { CreateProductService } from '../../Application/Services/CreateProductService'
import type { GetProductService } from '../../Application/Services/GetProductService'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Core/ILogger'

export class ProductController {
  constructor(
    private createProductService: CreateProductService,
    private getProductService: GetProductService,
    private queryService: IProductQueryService,
    private logger: ILogger
  ) {}

  async create(ctx: IHttpContext): Promise<Response> {
    try {
      const { name, amount, currency, sku, stockQuantity } = ctx.body as any

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
        message: '產品建立成功'
      }, 201)
    } catch (error) {
      this.logger.error('Failed to create product', { error })
      return ctx.json({
        success: false,
        error: (error as Error).message
      }, 400)
    }
  }

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
