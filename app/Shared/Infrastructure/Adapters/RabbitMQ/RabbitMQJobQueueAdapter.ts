/**
 * RabbitMQ 工作隊列適配器
 * 基於 AMQP direct exchange 的背景工作系統
 */

import type { IJobQueue, JobHandler } from '../../Ports/Messaging/IJobQueue'
import type { IRabbitMQService } from '../../Ports/Messaging/IRabbitMQService'

// Simple logger implementation
const logger = {
  info: (msg: string) => console.log(`[RabbitMQJobQueueAdapter] ${msg}`),
  warn: (msg: string) => console.warn(`[RabbitMQJobQueueAdapter] ⚠️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`[RabbitMQJobQueueAdapter] ❌ ${msg}`, err),
  debug: (msg: string) => console.debug(`[RabbitMQJobQueueAdapter] ${msg}`),
}

export class RabbitMQJobQueueAdapter implements IJobQueue {
  private handlers: Map<string, JobHandler> = new Map()
  private isConsuming = false

  constructor(private readonly rabbitmq: IRabbitMQService) {}

  /**
   * 推送工作到 gravito.system.jobs exchange
   */
  async push<T>(name: string, data: T): Promise<void> {
    if (!this.rabbitmq.isConnected()) {
      throw new Error('RabbitMQ not connected')
    }

    try {
      const payload = {
        name,
        data,
        timestamp: new Date().toISOString(),
      }

      await this.rabbitmq.publish('gravito.system.jobs', name, payload)
      logger.debug(`Job pushed to queue: ${name}`)
    } catch (error) {
      logger.error(`Failed to push job ${name}:`, error)
      throw error
    }
  }

  /**
   * 註冊工作處理程序
   */
  process(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler)
    logger.debug(`Job handler registered: ${name}`)
  }

  /**
   * 執行工作處理程序
   */
  async execute(name: string, data: any): Promise<void> {
    const handler = this.handlers.get(name)
    if (handler) {
      await handler(data)
    } else {
      logger.warn(`No handler found for job: ${name}`)
    }
  }

  /**
   * 啟動 AMQP Consumer
   * 為每個已註冊的工作宣告隊列、綁定到 exchange，並開始消費
   */
  async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      logger.warn('Consumer already started')
      return
    }

    if (!this.rabbitmq.isConnected()) {
      throw new Error('RabbitMQ not connected')
    }

    try {
      for (const [jobName] of this.handlers) {
        const queueName = `gravito.jobs.${jobName}`

        // 1. 宣告隊列（帶 DLX）
        await this.rabbitmq.declareQueue(queueName, {
          durable: true,
          deadLetterExchange: 'gravito.dead.letters',
        })

        // 2. 綁定隊列到 exchange（direct 模式，routing key = jobName）
        await this.rabbitmq.bindQueue(queueName, 'gravito.system.jobs', jobName)

        // 3. 開始消費
        await this.rabbitmq.consume(queueName, async (message, ack, nack) => {
          try {
            const jobData = message.data || message
            await this.execute(jobName, jobData)
            ack()
          } catch (error) {
            logger.error(`Error processing job ${jobName}:`, error)
            nack(true) // 重新加入隊列
          }
        })

        logger.info(`Consumer started for job: ${jobName} (queue: ${queueName})`)
      }

      this.isConsuming = true
      logger.info('RabbitMQ job consumers started')
    } catch (error) {
      logger.error('Failed to start consuming:', error)
      throw error
    }
  }
}
