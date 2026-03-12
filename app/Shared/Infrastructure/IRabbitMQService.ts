/**
 * RabbitMQ Service 介面
 * 定義與 AMQP 伺服器通信的契約
 */

export interface QueueOptions {
  durable?: boolean
  deadLetterExchange?: string
}

export interface IRabbitMQService {
  /**
   * 連線到 RabbitMQ 伺服器
   */
  connect(): Promise<void>

  /**
   * 關閉連線
   */
  close(): Promise<void>

  /**
   * 檢查連線狀態
   */
  isConnected(): boolean

  /**
   * 發佈消息到指定 exchange
   * @param exchange Exchange 名稱
   * @param routingKey 路由金鑰
   * @param message 消息對象
   */
  publish(exchange: string, routingKey: string, message: object): Promise<void>

  /**
   * 從隊列消費消息
   * @param queue 隊列名稱
   * @param handler 消息處理器 - 接收消息和 ack/nack 回調
   */
  consume(
    queue: string,
    handler: (
      message: any,
      ack: () => void,
      nack: (requeue?: boolean) => void,
    ) => Promise<void>
  ): Promise<void>

  /**
   * 宣告 Exchange
   * @param name Exchange 名稱
   * @param type Exchange 類型: topic, direct, fanout
   */
  declareExchange(name: string, type: 'topic' | 'direct' | 'fanout'): Promise<void>

  /**
   * 宣告隊列
   * @param name 隊列名稱
   * @param options 隊列選項
   */
  declareQueue(name: string, options?: QueueOptions): Promise<void>

  /**
   * 綁定隊列到 Exchange
   * @param queue 隊列名稱
   * @param exchange Exchange 名稱
   * @param routingKey 路由金鑰
   */
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>
}
