/**
 * RabbitMQJobQueueAdapter 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RabbitMQJobQueueAdapter } from '@/Foundation/Infrastructure/Adapters/RabbitMQ/RabbitMQJobQueueAdapter'
import type { IRabbitMQService } from '@/Foundation/Infrastructure/Ports/Messaging/IRabbitMQService'

describe('RabbitMQJobQueueAdapter', () => {
  let jobQueue: RabbitMQJobQueueAdapter
  let mockRabbitMQ: any

  beforeEach(() => {
    mockRabbitMQ = {
      connect: vi.fn(),
      close: vi.fn(),
      isConnected: vi.fn(() => true),
      publish: vi.fn(),
      consume: vi.fn(),
      declareExchange: vi.fn(),
      declareQueue: vi.fn(),
      bindQueue: vi.fn(),
    }
    jobQueue = new RabbitMQJobQueueAdapter(mockRabbitMQ as IRabbitMQService)
  })

  describe('push', () => {
    it('應該將工作發佈到 gravito.system.jobs exchange', async () => {
      const jobName = 'sendEmail'
      const jobData = { to: 'test@example.com', subject: 'Test' }

      await jobQueue.push(jobName, jobData)

      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'gravito.system.jobs',
        jobName,
        expect.objectContaining({
          name: jobName,
          data: jobData,
          timestamp: expect.any(String),
        })
      )
    })

    it('若 RabbitMQ 斷線應拋出錯誤', async () => {
      mockRabbitMQ.isConnected.mockReturnValueOnce(false)

      await expect(jobQueue.push('sendEmail', {})).rejects.toThrow('RabbitMQ not connected')
    })

    it('若 publish 失敗應拋出錯誤', async () => {
      mockRabbitMQ.publish.mockRejectedValueOnce(new Error('Publish failed'))

      await expect(jobQueue.push('sendEmail', {})).rejects.toThrow('Publish failed')
    })
  })

  describe('process', () => {
    it('應該註冊工作處理器', () => {
      const handler = vi.fn()

      jobQueue.process('sendEmail', handler)

      expect(handler).not.toHaveBeenCalled()
    })

    it('應該支援多個不同工作的處理器', () => {
      const emailHandler = vi.fn()
      const smsHandler = vi.fn()

      jobQueue.process('sendEmail', emailHandler)
      jobQueue.process('sendSMS', smsHandler)

      expect(emailHandler).not.toHaveBeenCalled()
      expect(smsHandler).not.toHaveBeenCalled()
    })
  })

  describe('execute', () => {
    it('應該執行已註冊的工作處理器', async () => {
      const handler = vi.fn()
      jobQueue.process('sendEmail', handler)

      const jobData = { to: 'test@example.com' }
      await jobQueue.execute('sendEmail', jobData)

      expect(handler).toHaveBeenCalledWith(jobData)
    })
  })

  describe('startConsuming', () => {
    it('應該為每個已註冊的工作宣告隊列並綁定到 exchange', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      jobQueue.process('sendEmail', handler1)
      jobQueue.process('sendSMS', handler2)

      await jobQueue.startConsuming()

      expect(mockRabbitMQ.declareQueue).toHaveBeenCalledWith(
        'gravito.jobs.sendEmail',
        expect.objectContaining({
          durable: true,
          deadLetterExchange: 'gravito.dead.letters',
        })
      )

      expect(mockRabbitMQ.declareQueue).toHaveBeenCalledWith(
        'gravito.jobs.sendSMS',
        expect.objectContaining({
          durable: true,
          deadLetterExchange: 'gravito.dead.letters',
        })
      )

      expect(mockRabbitMQ.bindQueue).toHaveBeenCalledWith(
        'gravito.jobs.sendEmail',
        'gravito.system.jobs',
        'sendEmail'
      )

      expect(mockRabbitMQ.bindQueue).toHaveBeenCalledWith(
        'gravito.jobs.sendSMS',
        'gravito.system.jobs',
        'sendSMS'
      )
    })

    it('應該開始消費已註冊工作的消息', async () => {
      const handler = vi.fn()
      jobQueue.process('sendEmail', handler)

      await jobQueue.startConsuming()

      expect(mockRabbitMQ.consume).toHaveBeenCalledWith(
        'gravito.jobs.sendEmail',
        expect.any(Function)
      )
    })

    it('若 RabbitMQ 未連接應拋出錯誤', async () => {
      mockRabbitMQ.isConnected.mockReturnValueOnce(false)

      await expect(jobQueue.startConsuming()).rejects.toThrow('RabbitMQ not connected')
    })

    it('若未註冊任何處理器應安全退出', async () => {
      const result = await jobQueue.startConsuming()
      expect(result).toBeUndefined()
      expect(mockRabbitMQ.declareQueue).not.toHaveBeenCalled()
    })
  })
})
