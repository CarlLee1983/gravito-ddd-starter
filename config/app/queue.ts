/**
 * Queue configuration for @gravito/ddd
 *
 * Unified queue driver configuration supporting:
 * - 'memory': In-process event queue (development only)
 * - 'redis': Redis-based queue with persistence
 * - 'rabbitmq': RabbitMQ AMQP with advanced routing
 *
 * Environment Variables:
 * - EVENT_DRIVER: Queue driver selection
 * - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD: Redis connection
 * - RABBITMQ_URL: RabbitMQ connection URL
 */

export default {
	/**
	 * Default queue driver
	 * Values: 'memory', 'redis', 'rabbitmq'
	 */
	default: process.env.EVENT_DRIVER ?? 'memory',

	/**
	 * Queue driver configurations
	 */
	drivers: {
		/**
		 * Memory driver - In-process event queue
		 * 用於開發和測試環境
		 * ✅ 無需外部依賴
		 * ❌ 進程重啟會丟失事件
		 * ❌ 無法跨進程通訊
		 */
		memory: {
			driver: 'memory',
		},

		/**
		 * Redis driver - Redis-based queue
		 * 生產環境推薦，支援持久化和分散式系統
		 * ✅ 支援持久化（AOF）
		 * ✅ 支援多進程消費
		 * ✅ 自動重試機制
		 */
		redis: {
			driver: 'redis',
			connection: process.env.REDIS_QUEUE_CONNECTION ?? 'default',
			// Queue keys in Redis
			queues: {
				events: process.env.REDIS_EVENTS_QUEUE ?? 'domain_events_queue',
				jobs: process.env.REDIS_JOBS_QUEUE ?? 'system_jobs_queue',
			},
			// Worker polling configuration
			polling: {
				interval: Number.parseInt(process.env.QUEUE_POLLING_INTERVAL ?? '1000', 10), // milliseconds
				timeout: Number.parseInt(process.env.QUEUE_POLLING_TIMEOUT ?? '30000', 10), // milliseconds
			},
		},

		/**
		 * RabbitMQ driver - AMQP-based distributed queue
		 * 高級功能，適合複雜的事件路由和大規模系統
		 * ✅ 強持久化保證
		 * ✅ 複雜路由支援 (topic, direct, fanout)
		 * ✅ 死信隊列 (DLX)
		 * ✅ 多進程並行消費
		 * ⚠️ 配置複雜度高
		 */
		rabbitmq: {
			driver: 'rabbitmq',
			// Connection URL format: amqp://username:password@host:port/vhost
			url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/',

			// Connection options
			connection: {
				host: process.env.RABBITMQ_HOST ?? 'localhost',
				port: Number.parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
				username: process.env.RABBITMQ_USER ?? 'guest',
				password: process.env.RABBITMQ_PASS ?? 'guest',
				vhost: process.env.RABBITMQ_VHOST ?? '/',
			},

			// RabbitMQ 自動建立的 Exchanges
			exchanges: {
				domainEvents: {
					name: 'gravito.domain.events',
					type: 'topic' as const,
					durable: true,
				},
				systemJobs: {
					name: 'gravito.system.jobs',
					type: 'direct' as const,
					durable: true,
				},
				integrationEvents: {
					name: 'gravito.integration.events',
					type: 'topic' as const,
					durable: true,
				},
				deadLetters: {
					name: 'gravito.dead.letters',
					type: 'fanout' as const,
					durable: true,
				},
			},

			// RabbitMQ 重連策略
			reconnect: {
				maxAttempts: Number.parseInt(process.env.RABBITMQ_RECONNECT_ATTEMPTS ?? '10', 10),
				initialDelay: Number.parseInt(process.env.RABBITMQ_RECONNECT_DELAY ?? '1000', 10), // milliseconds
				maxDelay: Number.parseInt(process.env.RABBITMQ_RECONNECT_MAX_DELAY ?? '30000', 10),
			},

			// 消費者配置
			consumer: {
				prefetch: Number.parseInt(process.env.RABBITMQ_PREFETCH ?? '1', 10), // 每次消費消息數
				timeout: Number.parseInt(process.env.RABBITMQ_CONSUMER_TIMEOUT ?? '30000', 10),
			},
		},
	},

	/**
	 * Job 配置
	 */
	job: {
		// 預設重試次數
		retries: Number.parseInt(process.env.JOB_RETRIES ?? '3', 10),
		// 預設重試延遲（秒）
		backoff: Number.parseInt(process.env.JOB_BACKOFF ?? '60', 10),
		// 預設延遲執行時間（秒）
		delay: Number.parseInt(process.env.JOB_DELAY ?? '0', 10),
	},

	/**
	 * Event 配置
	 */
	event: {
		// 事件序列化格式
		serialization: process.env.EVENT_SERIALIZATION ?? 'json' as const,
		// 是否記錄事件日誌
		logging: process.env.EVENT_LOGGING === 'true',
	},
} as const

export type QueueConfig = typeof import('./queue').default
