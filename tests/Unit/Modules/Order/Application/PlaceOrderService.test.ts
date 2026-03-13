import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { PlaceOrderService } from '@/Modules/Order/Application/Services/PlaceOrderService'
import { IOrderRepository } from '@/Modules/Order/Domain/Repositories/IOrderRepository'
import { Order } from '@/Modules/Order/Domain/Aggregates/Order'
import { PlaceOrderDTO } from '@/Modules/Order/Application/DTOs/PlaceOrderDTO'

describe('PlaceOrderService', () => {
  let service: PlaceOrderService
  let mockRepository: IOrderRepository

  beforeEach(() => {
    // Mock Repository
    mockRepository = {
      findById: mock(async () => null),
      findByUserId: mock(async () => []),
      save: mock(async (order: Order) => order),
      update: mock(async (order: Order) => order),
      delete: mock(async () => {}),
      findAll: mock(async () => []),
    }

    service = new PlaceOrderService(mockRepository)
  })

  describe('execute', () => {
    it('應該建立有效訂單', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-123',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 2,
            unitPrice: 100,
          },
        ],
        taxAmount: 40,
      }

      const result = await service.execute(dto)

      expect(result.orderId).toBeDefined()
      expect(result.userId).toBe('user-123')
      expect(result.status).toBe('PENDING')
      expect(result.lines.length).toBe(1)
      expect(result.total.subtotal).toBe(200)
      expect(result.total.tax).toBe(40)
      expect(result.total.total).toBe(240)
    })

    it('應該支持多行訂單', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-456',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 2,
            unitPrice: 100,
          },
          {
            productId: 'prod-2',
            productName: '商品 B',
            quantity: 3,
            unitPrice: 50,
          },
        ],
      }

      const result = await service.execute(dto)

      expect(result.lines.length).toBe(2)
      expect(result.total.subtotal).toBe(200 + 150) // 2×100 + 3×50
    })

    it('應該計算稅金', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-789',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 1,
            unitPrice: 1000,
          },
        ],
        taxAmount: 100,
      }

      const result = await service.execute(dto)

      expect(result.total.subtotal).toBe(1000)
      expect(result.total.tax).toBe(100)
      expect(result.total.total).toBe(1100)
    })

    it('應該使用默認稅金 0', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-abc',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 1,
            unitPrice: 500,
          },
        ],
      }

      const result = await service.execute(dto)

      expect(result.total.tax).toBe(0)
      expect(result.total.subtotal).toBe(result.total.total)
    })

    it('應該保存訂單到 Repository', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-save',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      }

      await service.execute(dto)

      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('應該拋出錯誤當 userId 為空', async () => {
      const dto: PlaceOrderDTO = {
        userId: '',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      }

      await expect(service.execute(dto)).rejects.toThrow('userId 不能為空')
    })

    it('應該拋出錯誤當訂單無行項目', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-123',
        lines: [],
      }

      await expect(service.execute(dto)).rejects.toThrow(
        '訂單至少需要一個行項目',
      )
    })

    it('應該拋出錯誤當 lines 為 undefined', async () => {
      const dto: any = {
        userId: 'user-123',
        lines: undefined,
      }

      await expect(service.execute(dto)).rejects.toThrow(
        '訂單至少需要一個行項目',
      )
    })

    it('應該處理浮點數金額', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-decimal',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 3,
            unitPrice: 99.99,
          },
        ],
        taxAmount: 29.99,
      }

      const result = await service.execute(dto)

      expect(result.total.subtotal).toBeCloseTo(299.97, 2)
      expect(result.total.tax).toBe(29.99)
    })

    it('應該轉換為正確的 DTO 格式', async () => {
      const dto: PlaceOrderDTO = {
        userId: 'user-dto',
        lines: [
          {
            productId: 'prod-1',
            productName: '商品 A',
            quantity: 2,
            unitPrice: 150,
          },
        ],
      }

      const result = await service.execute(dto)

      // 驗證 DTO 結構
      expect(result).toHaveProperty('orderId')
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('lines')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')

      // 驗證行項目 DTO
      expect(result.lines[0]).toHaveProperty('productId')
      expect(result.lines[0]).toHaveProperty('productName')
      expect(result.lines[0]).toHaveProperty('quantity')
      expect(result.lines[0]).toHaveProperty('unitPrice')
      expect(result.lines[0]).toHaveProperty('lineTotal')

      // 驗證總額 DTO
      expect(result.total).toHaveProperty('subtotal')
      expect(result.total).toHaveProperty('tax')
      expect(result.total).toHaveProperty('total')
      expect(result.total).toHaveProperty('currency')
    })

    it('應該正確計算多個訂單的金額', async () => {
      const testCases = [
        {
          userId: 'user-1',
          lines: [{ productId: 'p1', productName: 'Item 1', quantity: 1, unitPrice: 100 }],
          tax: 0,
          expectedTotal: 100,
        },
        {
          userId: 'user-2',
          lines: [{ productId: 'p1', productName: 'Item 1', quantity: 2, unitPrice: 50 }],
          tax: 10,
          expectedTotal: 110,
        },
        {
          userId: 'user-3',
          lines: [
            { productId: 'p1', productName: 'Item 1', quantity: 1, unitPrice: 100 },
            { productId: 'p2', productName: 'Item 2', quantity: 2, unitPrice: 50 },
          ],
          tax: 40,
          expectedTotal: 240,
        },
      ]

      for (const testCase of testCases) {
        const dto: PlaceOrderDTO = {
          userId: testCase.userId,
          lines: testCase.lines,
          taxAmount: testCase.tax,
        }

        const result = await service.execute(dto)
        expect(result.total.total).toBe(testCase.expectedTotal)
      }
    })
  })
})
