import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { IStorageDisk } from '../../Ports/Storage/IStorageDisk'

/**
 * LocalDriver
 * 
 * 實作本地檔案系統存儲
 */
export class LocalDriver implements IStorageDisk {
  private root: string;

  constructor(options: { root: string }) {
    this.root = options.root;
    if (!existsSync(this.root)) {
      mkdirSync(this.root, { recursive: true });
    }
  }

  private getFullPath(location: string): string {
    return join(this.root, location);
  }

  async exists(location: string): Promise<boolean> {
    return existsSync(this.getFullPath(location));
  }

  async get(location: string): Promise<Buffer> {
    const path = this.getFullPath(location);
    return readFileSync(path);
  }

  async getText(location: string): Promise<string> {
    const path = this.getFullPath(location);
    return readFileSync(path, 'utf8');
  }

  async put(location: string, contents: string | Buffer): Promise<void> {
    const path = this.getFullPath(location);
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, contents);
  }

  async delete(location: string): Promise<void> {
    const path = this.getFullPath(location);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }

  async getUrl(location: string): Promise<string> {
    // 這裡通常返回應用的公共 URL 前綴，例如 /storage/filename
    return `/storage/${location}`;
  }

  async getSignedUrl(location: string): Promise<string> {
    // 本地存儲通常不支援簽名 URL，直接返回 getUrl
    return this.getUrl(location);
  }

  async getMetaData(location: string): Promise<{ size: number; lastModified: Date; contentType?: string }> {
    const stats = statSync(this.getFullPath(location));
    return {
      size: stats.size,
      lastModified: stats.mtime,
    };
  }
}
