/**
 * RabbitMQ 適配器
 * 管理 AMQP 連線和頻道
 */

import type { IRabbitMQService, QueueOptions } from '../../Ports/Messaging/IRabbitMQService'

// Simple logger implementation
const logger = {
  info: (msg: string) => console.log(`[RabbitMQAdapter] ${msg}`),
  warn: (msg: string) => console.warn(`[RabbitMQAdapter] ⚠️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`[RabbitMQAdapter] ❌ ${msg}`, err),
  debug: (msg: string) => console.debug(`[RabbitMQAdapter] ${msg}`),
}

export class RabbitMQAdapter implements IRabbitMQService {
  private connection: any = null
  private channel: any = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    try {
      const amqplib = await import('amqplib')
      this.connection = await amqplib.connect(this.url)
      this.channel = await this.connection!.createChannel()

      // 設定 prefetch 為 1，每次只消費一筆消息（自動分發）
      await this.channel!.prefetch(1)

      // 重置重連嘗試計數
      this.reconnectAttempts = 0

      // 宣告 4 個主要 Exchange
      await this.declareExchange('gravito.domain.events', 'topic')
      await this.declareExchange('gravito.system.jobs', 'direct')
      await this.declareExchange('gravito.integration.events', 'topic')
      await this.declareExchange('gravito.dead.letters', 'fanout')

      logger.info('Connected to RabbitMQ and exchanges declared')

      // 監聽連線錯誤
      this.connection!.on('error', (err: any) => {
        logger.error('Connection error:', err.message)
        this.handleConnectionError()
      })

      this.connection!.on('close', () => {
        logger.warn('Connection closed')
        this.connection = null
        this.channel = null
      })
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error)
      await this.handleReconnect()
    }
  }

  private async handleConnectionError(): Promise<void> {
    this.connection = null
    this.channel = null
    await this.handleReconnect()
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached')
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    await new Promise((resolve) => setTimeout(resolve, delay))
    await this.connect()
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close()
      this.channel = null
    }
    if (this.connection) {
      await this.connection.close()
      this.connection = null
    }
    logger.info('RabbitMQ connection closed')
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null
  }

  async publish(exchange: string, routingKey: string, message: object): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    const messageBuffer = Buffer.from(JSON.stringify(message))

    try {
      this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        contentType: 'application/json',
      })
    } catch (error) {
      logger.error(`Failed to publish message to ${exchange}:${routingKey}`, error)
      throw error
    }
  }

  async consume(
    queue: string,
    handler: (
      message: any,
      ack: () => void,
      nack: (requeue?: boolean) => void,
    ) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    try {
      await this.channel.consume(queue, async (msg: any) => {
        if (!msg) return

        const ack = () => this.channel!.ack(msg)
        const nack = (requeue = false) => this.channel!.nack(msg, false, requeue)

        try {
          const content = JSON.parse(msg.content.toString())
          await handler(content, ack, nack)
        } catch (error) {
          logger.error(`Error processing message from queue ${queue}:`, error)
          nack(true) // 重新加入隊列
        }
      })
    } catch (error) {
      logger.error(`Failed to consume from queue ${queue}:`, error)
      throw error
    }
  }

  async declareExchange(name: string, type: 'topic' | 'direct' | 'fanout'): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    try {
      await this.channel.assertExchange(name, type, { durable: true })
    } catch (error) {
      logger.error(`Failed to declare exchange ${name}:`, error)
      throw error
    }
  }

  async declareQueue(name: string, options?: QueueOptions): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    try {
      const queueOptions: any = {
        durable: options?.durable ?? true,
      }

      if (options?.deadLetterExchange) {
        queueOptions['x-dead-letter-exchange'] = options.deadLetterExchange
      }

      await this.channel.assertQueue(name, queueOptions)
    } catch (error) {
      logger.error(`Failed to declare queue ${name}:`, error)
      throw error
    }
  }

  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    try {
      await this.channel.bindQueue(queue, exchange, routingKey)
    } catch (error) {
      logger.error(`Failed to bind queue ${queue} to exchange ${exchange}:`, error)
      throw error
    }
  }
}
