import type { IStorageDisk } from './IStorageDisk'

/**
 * IStorageService
 * 
 * 負責根據磁碟名稱切換對應的 Storage 驅動實例
 */

export interface IStorageService {
  /**
   * 獲取指定的磁碟
   */
  disk(name?: string): IStorageDisk;

  /**
   * 獲取默認磁碟
   */
  use(name?: string): IStorageDisk;
}
