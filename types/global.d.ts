/**
 * @file types/global.d.ts
 * @description 全局環境變數和全局類型定義
 *
 * 包含：
 * - Node.js 環境變數型別
 * - 瀏覽器全局物件擴展
 */

// ============================================================================
// Node.js Process Environment
// ============================================================================

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // 應用配置
      NODE_ENV: 'development' | 'production' | 'test'
      PORT?: string
      APP_NAME: string
      APP_URL: string

      // 資料庫
      DATABASE_URL?: string
      DATABASE_HOST?: string
      DATABASE_PORT?: string
      DATABASE_NAME?: string
      DATABASE_USER?: string
      DATABASE_PASSWORD?: string

      // Redis
      REDIS_HOST?: string
      REDIS_PORT?: string
      REDIS_PASSWORD?: string
      REDIS_DB?: string

      // JWT
      JWT_SECRET?: string
      JWT_EXPIRES_IN?: string

      // i18n
      DEFAULT_LOCALE?: string

      // 事件驅動
      EVENT_DRIVER?: 'memory' | 'redis' | 'rabbitmq'

      // RabbitMQ
      RABBITMQ_URL?: string

      // S3/Storage
      S3_KEY?: string
      S3_SECRET?: string
      S3_REGION?: string
      S3_BUCKET?: string

      // Email
      MAIL_DRIVER?: 'smtp' | 'log'
      MAIL_FROM?: string
      MAIL_HOST?: string
      MAIL_PORT?: string
      MAIL_USERNAME?: string
      MAIL_PASSWORD?: string
    }
  }
}

// ============================================================================
// Browser Global Objects
// ============================================================================

interface AppConfig {
  name: string
  version: string
  environment: string
  apiBaseUrl: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig
    __APP_VERSION__?: string
  }
}

// ============================================================================
// Re-export Common Types
// ============================================================================

export {}
