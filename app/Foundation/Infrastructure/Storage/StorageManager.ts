import type { IStorageService } from '../Ports/Storage/IStorageService'
import type { IStorageDisk } from '../Ports/Storage/IStorageDisk'
import type { StorageConfig } from '@config/app/storage'
import { LocalDriver } from './Drivers/LocalDriver'

/**
 * StorageManager
 * 
 * 管理所有磁碟實例，實作 IStorageService 介面
 */
export class StorageManager implements IStorageService {
  private disks: Map<string, IStorageDisk> = new Map();

  constructor(private config: StorageConfig) {}

  /**
   * 獲取指定的磁碟
   */
  disk(name?: string): IStorageDisk {
    const diskName = name ?? this.config.default ?? 'local';

    if (this.disks.has(diskName)) {
      return this.disks.get(diskName)!;
    }

    const diskConfig = this.config.disks?.[diskName];
    if (!diskConfig) {
      throw new Error(`Storage disk [${diskName}] is not defined.`);
    }

    let disk: IStorageDisk;
    const driver = (diskConfig as { driver: string; root?: string }).driver;

    switch (driver) {
      case 'local':
        disk = new LocalDriver({ root: (diskConfig as { root?: string }).root ?? './storage' });
        break;
      case 's3':
      case 'custom':
        // 未來可以在這裡擴充 S3Driver（config 中 s3 使用 driver: 'custom'）
        throw new Error(`Storage driver [${driver}] is not implemented yet.`);
      default:
        throw new Error(`Storage driver [${driver}] is not supported.`);
    }

    this.disks.set(diskName, disk);
    return disk;
  }

  /**
   * 借鑑 AdonisJS 的 alias
   */
  use(name?: string): IStorageDisk {
    return this.disk(name);
  }
}
