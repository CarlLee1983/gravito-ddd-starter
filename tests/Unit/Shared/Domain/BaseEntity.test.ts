import { describe, it, expect, beforeEach } from 'bun:test'
import { BaseEntity } from '@/Shared/Domain/BaseEntity'

/**
 * 測試 BaseEntity 的 ID、時間戳、相等性
 * 驗證 setUpdatedAt 已被移除
 */

class TestEntity extends BaseEntity {
  constructor(id?: string) {
    super(id)
  }
}

describe('BaseEntity -- 基本功能', () => {
  let entity: TestEntity

  beforeEach(() => {
    entity = new TestEntity()
  })

  it('應自動生成 UUID ID', () => {
    expect(entity.id).toBeDefined()
    expect(entity.id.length).toBe(36) // UUID 長度
    expect(entity.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('應接受自訂 ID', () => {
    const customId = 'custom-id-123'
    const customEntity = new TestEntity(customId)
    expect(customEntity.id).toBe(customId)
  })

  it('應設定建立時間', () => {
    const beforeCreation = new Date()
    const newEntity = new TestEntity()
    const afterCreation = new Date()

    expect(newEntity.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime())
    expect(newEntity.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime())
  })

  it('應設定初始更新時間等於建立時間', () => {
    const entity = new TestEntity()
    // updatedAt 應初始化，但通常與 createdAt 相同
    expect(entity.updatedAt).toBeDefined()
    expect(entity.updatedAt instanceof Date).toBe(true)
  })

  it('應提供 getter 存取器', () => {
    expect(entity.id).toBeDefined()
    expect(entity.createdAt instanceof Date).toBe(true)
    expect(entity.updatedAt instanceof Date).toBe(true)
  })

  it('應提供方法存取器 (getId, getCreatedAt, getUpdatedAt)', () => {
    expect(entity.getId()).toBe(entity.id)
    expect(entity.getCreatedAt()).toEqual(entity.createdAt)
    expect(entity.getUpdatedAt()).toEqual(entity.updatedAt)
  })
})

describe('BaseEntity -- 相等性', () => {
  it('相同 ID 的兩個實體應相等', () => {
    const id = 'same-id'
    const entity1 = new TestEntity(id)
    const entity2 = new TestEntity(id)

    expect(entity1.equals(entity2)).toBe(true)
  })

  it('不同 ID 的實體應不相等', () => {
    const entity1 = new TestEntity('id-1')
    const entity2 = new TestEntity('id-2')

    expect(entity1.equals(entity2)).toBe(false)
  })

  it('toString() 應返回有意義的字串', () => {
    const entity = new TestEntity('test-id')
    expect(entity.toString()).toBe('TestEntity(test-id)')
  })
})

describe('BaseEntity -- setUpdatedAt 已移除', () => {
  it('應不存在 setUpdatedAt 方法', () => {
    const entity = new TestEntity()
    expect((entity as any).setUpdatedAt).toBeUndefined()
  })

  it('updatedAt 應為唯讀', () => {
    const entity = new TestEntity()
    expect(() => {
      ;(entity as any).updatedAt = new Date()
    }).toThrow()
  })
})
