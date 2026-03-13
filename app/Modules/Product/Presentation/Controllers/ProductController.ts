/**
 * @file ProductController.ts
 * @description 產品控制器
 */

import type { CreateProductService } from '../../Application/Services/CreateProductService'
import type { GetProductService } from '../../Application/Services/GetProductService'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'

export class ProductController {
  constructor(
    private createProductService: CreateProductService,
    private getProductService: GetProductService,
    private queryService: IProductQueryService,
    private logger: ILogger
  ) {}

  async create(req: any, res: any): Promise<void> {
    try {
      const { name, amount, currency, sku, stockQuantity } = req.body

      const id = await this.createProductService.execute({
        name,
        amount,
        currency,
        sku,
        stockQuantity
      })

      const product = await this.getProductService.execute(id)

      res.status(201).json({
        success: true,
        data: product,
        message: '產品建立成功'
      })
    } catch (error) {
      this.logger.error('Failed to create product', { error })
      res.status(400).json({
        success: false,
        error: (error as Error).message
      })
    }
  }

  async getById(req: any, res: any): Promise<void> {
    try {
      const { id } = req.params
      const product = await this.getProductService.execute(id)

      if (!product) {
        res.status(404).json({
          success: false,
          error: '產品未找到'
        })
        return
      }

      res.json({
        success: true,
        data: product
      })
    } catch (error) {
      this.logger.error('Failed to get product', { error })
      res.status(400).json({
        success: false,
        error: (error as Error).message
      })
    }
  }

  async getAll(req: any, res: any): Promise<void> {
    try {
      const products = await this.queryService.findAll()

      res.json({
        success: true,
        data: products,
        meta: {
          total: products.length
        }
      })
    } catch (error) {
      this.logger.error('Failed to get products', { error })
      res.status(400).json({
        success: false,
        error: (error as Error).message
      })
    }
  }
}
