/**
 * IStorageDisk
 * 
 * 借鑑 AdonisJS Drive 的單一磁碟操作 API
 */

export interface IStorageDisk {
  /**
   * 檢查檔案是否存在
   */
  exists(location: string): Promise<boolean>;

  /**
   * 讀取檔案內容
   */
  get(location: string): Promise<Buffer>;

  /**
   * 讀取檔案內容並轉為字串
   */
  getText(location: string): Promise<string>;

  /**
   * 寫入檔案
   */
  put(location: string, contents: string | Buffer): Promise<void>;

  /**
   * 刪除檔案
   */
  delete(location: string): Promise<void>;

  /**
   * 獲取檔案的公開 URL (通常用於靜態資源)
   */
  getUrl(location: string): Promise<string>;

  /**
   * 獲取檔案的臨時簽名 URL (通常用於 S3 私有資源)
   */
  getSignedUrl(location: string, options?: { expiresIn: number }): Promise<string>;

  /**
   * 獲取檔案屬性
   */
  getMetaData(location: string): Promise<{ size: number, lastModified: Date, contentType?: string }>;
}
