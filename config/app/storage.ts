/**
 * Storage Config
 * 
 * 借鑑 AdonisJS Drive 配置結構，支援多磁碟架構
 */

export interface StorageConfig {
  default: string;
  disks: Record<string, DiskConfig>;
}

export type DiskConfig = 
  | { driver: 'local'; root: string; visibility: 'public' | 'private' }
  | { driver: 's3'; key: string; secret: string; bucket: string; region: string; visibility: 'public' | 'private' }
  | { driver: 'memory' }; // 用於單元測試

export const storageConfig: StorageConfig = {
  default: process.env.DRIVE_DISK || 'local',

  disks: {
    /**
     * 本地檔案存儲
     */
    local: {
      driver: 'local',
      root: process.env.DRIVE_LOCAL_ROOT || './storage',
      visibility: 'public',
    },

    /**
     * 臨時存儲 (僅內存)
     */
    tmp: {
      driver: 'local',
      root: './storage/tmp',
      visibility: 'private',
    },

    /**
     * 遠端 S3 存儲 (範例配置)
     */
    s3: {
      driver: 's3',
      key: process.env.S3_KEY || '',
      secret: process.env.S3_SECRET || '',
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      visibility: 'private',
    },
  },
};
