import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { StorageManager } from '@/Shared/Infrastructure/Storage/StorageManager'
import { storageConfig } from '@/../config/app/storage'

describe('StorageManager (AdonisJS Drive Style)', () => {
  const testRoot = './storage/test-disk';
  const manager = new StorageManager({
    default: 'local',
    disks: {
      local: { driver: 'local', root: testRoot, visibility: 'public' },
      other: { driver: 'local', root: './storage/other-disk', visibility: 'private' }
    }
  });

  beforeEach(() => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('應該能獲取默認磁碟並寫入檔案', async () => {
    const disk = manager.disk();
    const filePath = 'hello.txt';
    const content = 'Hello Gravito Storage!';

    await disk.put(filePath, content);
    
    expect(await disk.exists(filePath)).toBe(true);
    expect(await disk.getText(filePath)).toBe(content);
  });

  it('應該能切換不同磁碟', async () => {
    const localDisk = manager.disk('local');
    const otherDisk = manager.disk('other');

    expect(localDisk).not.toBe(otherDisk);
    
    await localDisk.put('local.txt', 'local');
    await otherDisk.put('other.txt', 'other');

    expect(await localDisk.exists('local.txt')).toBe(true);
    expect(await otherDisk.exists('other.txt')).toBe(true);
    expect(await localDisk.exists('other.txt')).toBe(false);

    // 清理 otherDisk
    rmSync('./storage/other-disk', { recursive: true, force: true });
  });

  it('應該能正確處理子目錄', async () => {
    const disk = manager.disk();
    const path = 'images/avatars/user-1.png';
    const content = 'fake-image-binary';

    await disk.put(path, content);
    
    expect(await disk.exists(path)).toBe(true);
    expect(await disk.getText(path)).toBe(content);
  });
});
