import type { OrbitNebulaOptions } from '@gravito/nebula'

/**
 * Storage 配置型別（與 @gravito/nebula OrbitNebulaOptions 一致）
 */
export type StorageConfig = OrbitNebulaOptions

/**
 * Nebula S3 配置擴充
 */
export interface S3StoreConfig {
  driver: 's3'
  key: string
  secret: string
  bucket: string
  region: string
  visibility: 'public' | 'private'
}

/**
 * Storage Config
 * 
 * 採用 @gravito/nebula 的 OrbitNebulaOptions 結構
 */
export const storageConfig: OrbitNebulaOptions = {
  default: process.env.DRIVE_DISK || 'local',

  disks: {
    /**
     * 本地檔案存儲
     */
    local: {
      driver: 'local',
      root: process.env.DRIVE_LOCAL_ROOT || './storage',
      baseUrl: process.env.APP_URL ? `${process.env.APP_URL}/storage` : '/storage',
    },

    /**
     * 臨時存儲
     */
    tmp: {
      driver: 'local',
      root: './storage/tmp',
    },

    /**
     * 遠端 S3 存儲
     * 注意：在 Nebula 中這將透過自定義驅動加載
     */
    s3: {
      driver: 'custom',
      // store 實例將在運行時透過工廠或 Provider 注入
    } as any,
  },
}

/**
 * S3 原始配置 (供 S3Store 實例化使用)
 */
export const s3RawConfig: Omit<S3StoreConfig, 'driver'> = {
  key: process.env.S3_KEY || '',
  secret: process.env.S3_SECRET || '',
  bucket: process.env.S3_BUCKET || '',
  region: process.env.S3_REGION || 'us-east-1',
  visibility: (process.env.S3_VISIBILITY as any) || 'private',
}

