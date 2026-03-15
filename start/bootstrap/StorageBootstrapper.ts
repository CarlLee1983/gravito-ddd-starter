/**
 * @file StorageBootstrapper.ts
 * @description 儲存系統初始化 - 提取 Storage 配置邏輯，保持 bootstrap 簡潔
 */

import type { PlanetCore } from '@gravito/core'
import { OrbitNebula } from '@gravito/nebula'
import type { StorageConfig } from '@config/app/storage'
import { S3Store } from '@/Foundation/Infrastructure/Storage/Drivers/S3Store'
import type { S3StoreConfig } from '@config/app/storage'

/**
 * 儲存系統啟動器
 *
 * 職責：管理儲存系統的初始化，包括 S3 自定義驅動的實例化
 */
export class StorageBootstrapper {
	/**
	 * 配置並初始化儲存系統
	 *
	 * @param core - PlanetCore 實例
	 * @param storageConfig - 儲存配置
	 * @param s3RawConfig - S3 原始配置（供 S3Store 使用）
	 */
	static async configure(
		core: PlanetCore,
		storageConfig: StorageConfig,
		s3RawConfig: Omit<S3StoreConfig, 'driver'>
	): Promise<void> {
		const finalConfig = this.buildStorageConfig(storageConfig, s3RawConfig)
		await core.orbit(new OrbitNebula(finalConfig))
	}

	/**
	 * 構建最終的儲存配置，應用必要的運行時注入
	 *
	 * 當 S3 驅動配置為 'custom' 時，注入 S3Store 實例
	 * 其他驅動配置原封不動
	 *
	 * @param storageConfig - 基礎儲存配置
	 * @param s3RawConfig - S3 原始配置
	 * @returns 最終的儲存配置
	 */
	private static buildStorageConfig(
		storageConfig: StorageConfig,
		s3RawConfig: Omit<S3StoreConfig, 'driver'>
	): StorageConfig {
		// 只有當 S3 驅動配置為 'custom' 時才需要注入 S3Store
		if (storageConfig.disks?.s3?.driver === 'custom') {
			return {
				...storageConfig,
				disks: {
					...storageConfig.disks,
					s3: {
						...storageConfig.disks.s3,
						store: new S3Store(s3RawConfig),
					},
				},
			}
		}

		// 其他情況直接返回原始配置
		return storageConfig
	}
}
