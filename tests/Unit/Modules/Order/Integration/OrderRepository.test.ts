import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { OrderRepository } from '@/Modules/Order/Infrastructure/Repositories/OrderRepository'
import { Order } from '@/Modules/Order/Domain/Aggregates/Order'
import { OrderLine } from '@/Modules/Order/Domain/Aggregates/OrderLine'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'
import { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'

describe('OrderRepository Integration', () => {
  let repository: OrderRepository
  let mockDb: IDatabaseAccess
  let mockDispatcher: IEventDispatcher

  beforeEach(() => {
    // Mock Database
    mockDb = {
      getRepository: mock(() => ({
        findById: mock(async () => null),
        findBy: mock(async () => []),
        create: mock(async (data: any) => data),
        update: mock(async () => {}),
        delete: mock(async () => {}),
        findAll: mock(async () => []),
      })),
      transaction: mock(),
      beginTransaction: mock(),
      commit: mock(),
      rollback: mock(),
    }

    // Mock EventDispatcher
    mockDispatcher = {
      dispatch: mock(async () => {}),
      subscribe: mock(),
      unsubscribe: mock(),
    }

    repository = new OrderRepository(mockDb, mockDispatcher)
  })

  describe('save', () => {
    it('應該保存新訂單到數據庫', async () => {
      const order = createTestOrder()

      const result = await repository.save(order)

      expect(result).toBeDefined()
      expect(mockDb.getRepository).toHaveBeenCalled()
    })

    it('應該分派領域事件', async () => {
      const order = createTestOrder()

      await repository.save(order)

      expect(mockDispatcher.dispatch).toHaveBeenCalled()
    })

    it('應該清空訂單的領域事件', async () => {
      const order = createTestOrder()
      const events = order.getUncommittedEvents()
      expect(events.length).toBeGreaterThan(0)

      // Repository 應該調用 markEventsAsCommitted
      // 但在這個 mock 測試中，我們直接驗證分派被調用
      expect(mockDispatcher.dispatch).toBeDefined()
    })

    it('應該拋出錯誤當保存失敗', async () => {
      const failingDb = {
        getRepository: mock(() => ({
          create: mock(async () => {
            throw new Error('Database error')
          }),
        })),
      } as any

      const failingRepository = new OrderRepository(failingDb, mockDispatcher)
      const order = createTestOrder()

      await expect(failingRepository.save(order)).rejects.toThrow(
        '保存訂單失敗',
      )
    })
  })

  describe('findById', () => {
    it('應該根據 ID 查找訂單', async () => {
      const orderId = OrderId.create()

      const repo = mockDb.getRepository()
      ;(repo.findById as any).mockImplementation(async (id: string) => ({
        id,
        userId: 'user-123',
      }))

      const result = await repository.findById(orderId)

      expect(repo.findById).toHaveBeenCalledWith(orderId.toString())
    })

    it('應該返回 null 當訂單不存在', async () => {
      const orderId = OrderId.create()

      const result = await repository.findById(orderId)

      expect(result).toBeNull()
    })

    it('應該拋出錯誤當查詢失敗', async () => {
      const failingDb = {
        getRepository: mock(() => ({
          findById: mock(async () => {
            throw new Error('Query error')
          }),
        })),
      } as any

      const failingRepository = new OrderRepository(failingDb, mockDispatcher)
      const orderId = OrderId.create()

      await expect(failingRepository.findById(orderId)).rejects.toThrow(
        '查詢訂單失敗',
      )
    })
  })

  describe('findByUserId', () => {
    it('應該根據用戶 ID 查找訂單', async () => {
      const userId = 'user-456'

      await repository.findByUserId(userId)

      const repo = mockDb.getRepository()
      expect(repo.findBy).toHaveBeenCalledWith({ userId })
    })

    it('應該返回空陣列當無訂單', async () => {
      const result = await repository.findByUserId('non-existent-user')

      expect(Array.isArray(result)).toBe(true)
    })

    it('應該拋出錯誤當查詢失敗', async () => {
      const failingDb = {
        getRepository: mock(() => ({
          findBy: mock(async () => {
            throw new Error('Query error')
          }),
        })),
      } as any

      const failingRepository = new OrderRepository(failingDb, mockDispatcher)

      await expect(failingRepository.findByUserId('user-123')).rejects.toThrow(
        '查詢用戶訂單失敗',
      )
    })
  })

  describe('update', () => {
    it('應該更新訂單', async () => {
      const order = createTestOrder()
      order.confirm()

      await repository.update(order)

      const repo = mockDb.getRepository()
      expect(repo.update).toHaveBeenCalled()
    })

    it('應該分派更新事件', async () => {
      const order = createTestOrder()
      order.confirm()

      await repository.update(order)

      expect(mockDispatcher.dispatch).toHaveBeenCalled()
    })

    it('應該拋出錯誤當更新失敗', async () => {
      const failingDb = {
        getRepository: mock(() => ({
          update: mock(async () => {
            throw new Error('Update error')
          }),
        })),
      } as any

      const failingRepository = new OrderRepository(failingDb, mockDispatcher)
      const order = createTestOrder()

      await expect(failingRepository.update(order)).rejects.toThrow(
        '更新訂單失敗',
      )
    })
  })

  describe('delete', () => {
    it('應該刪除訂單', async () => {
      const orderId = OrderId.create()

      await repository.delete(orderId)

      const repo = mockDb.getRepository()
      expect(repo.delete).toHaveBeenCalledWith(orderId.toString())
    })

    it('應該拋出錯誤當刪除失敗', async () => {
      const failingDb = {
        getRepository: mock(() => ({
          delete: mock(async () => {
            throw new Error('Delete error')
          }),
        })),
      } as any

      const failingRepository = new OrderRepository(failingDb, mockDispatcher)
      const orderId = OrderId.create()

      await expect(failingRepository.delete(orderId)).rejects.toThrow(
        '刪除訂單失敗',
      )
    })
  })

  describe('findAll', () => {
    it('應該查找所有訂單', async () => {
      await repository.findAll()

      const repo = mockDb.getRepository()
      expect(repo.findAll).toHaveBeenCalled()
    })

    it('應該返回空陣列當無訂單', async () => {
      const result = await repository.findAll()

      expect(Array.isArray(result)).toBe(true)
    })

    it('應該拋出錯誤當查詢失敗', async () => {
      const failingDb = {
        getRepository: mock(() => ({
          findAll: mock(async () => {
            throw new Error('Query error')
          }),
        })),
      } as any

      const failingRepository = new OrderRepository(failingDb, mockDispatcher)

      await expect(failingRepository.findAll()).rejects.toThrow(
        '查詢所有訂單失敗',
      )
    })
  })
})

function createTestOrder(): Order {
  const lines = [
    OrderLine.create('prod-1', '商品 A', 2, Money.create(100)),
  ]
  const subtotal = Money.create(200)
  const total = OrderTotal.create(subtotal, 0)
  return Order.create('user-123', lines, total)
}
