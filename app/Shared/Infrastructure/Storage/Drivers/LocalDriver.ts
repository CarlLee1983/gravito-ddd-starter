import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
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
    // 防止路徑遍歷攻擊
    if (location.includes('..') || location.startsWith('/')) {
      throw new Error(`Invalid location path: ${location}`)
    }

    const fullPath = join(this.root, location)
    const resolved = resolve(fullPath)
    const rootResolved = resolve(this.root)

    // 驗證解析後的路徑確實在 root 目錄內
    if (!resolved.startsWith(rootResolved)) {
      throw new Error('Path traversal detected')
    }

    return resolved
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
