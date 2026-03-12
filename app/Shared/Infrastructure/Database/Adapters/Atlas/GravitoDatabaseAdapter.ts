/**
 * @file GravitoDatabaseAdapter.ts
 * @description Atlas 資料庫適配器實作
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：提供 IDatabaseAccess 與 IDatabaseConnectivityCheck 的具體技術實作。
 * - 職責：作為領域層與 Gravito Atlas ORM 之間的橋樑，處理資料庫連線檢查與查詢建構器的建立。
 */

import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { AtlasQueryBuilder } from './AtlasQueryBuilder'
import * as Atlas from '@gravito/atlas'

/**
 * 懶加載 Atlas DB 實例
 * @internal
 * @returns 原始 Atlas DB 物件
 */
function getDB(): any {
	return (Atlas as any).DB
}

/**
 * Atlas DatabaseAccess 實作類別
 *
 * 實作 IDatabaseAccess 介面，將 Gravito Atlas ORM 適配為公開介面，
 * 隱藏所有 Atlas 特定的 API 細節。
 *
 * @internal 此實現是基礎設施層細節
 */
class AtlasDatabaseAccess implements IDatabaseAccess {
	/**
	 * 取得指定資料表的查詢建構器
	 *
	 * @param name - 資料表名稱
	 * @returns 回傳一個封裝好的 QueryBuilder 實例
	 *
	 * @example
	 * const users = await db.table('users').select()
	 */
	table(name: string): IQueryBuilder {
		return new AtlasQueryBuilder(name)
	}
}

/**
 * 初始化 Atlas 資料庫連接配置
 *
 * 讀取環境變數並配置 Atlas DB 連接
 * @internal
 */
function initializeAtlasConnection(): void {
	const DB = getDB()

	// 檢查是否已配置
	if (!DB) {
		return
	}

	// 檢查是否已有 default 連接
	try {
		if (DB.dialect && DB.dialect('default')) {
			return
		}
	} catch {
		// 連接不存在，繼續初始化
	}

	const enableDB = process.env.ENABLE_DB === 'true'
	if (!enableDB) {
		console.log('⚠️ [Atlas] Database disabled (ENABLE_DB=false)')
		return
	}

	const connection = process.env.DB_CONNECTION || 'sqlite'
	const config: Record<string, any> = {
		driver: connection,
	}

	// PostgreSQL 配置
	if (connection === 'postgres') {
		config.host = process.env.DB_HOST || '127.0.0.1'
		config.port = Number(process.env.DB_PORT) || 5432
		config.database = process.env.DB_DATABASE || 'gravito_ddd'
		config.user = process.env.DB_USER || 'postgres'
		config.password = process.env.DB_PASSWORD || ''
	}
	// SQLite 配置
	else if (connection === 'sqlite') {
		config.database = process.env.DB_DATABASE || './database.sqlite'
	}
	// MySQL 配置
	else if (connection === 'mysql') {
		config.host = process.env.DB_HOST || '127.0.0.1'
		config.port = Number(process.env.DB_PORT) || 3306
		config.database = process.env.DB_DATABASE || 'gravito_ddd'
		config.user = process.env.DB_USER || 'root'
		config.password = process.env.DB_PASSWORD || ''
	}

	try {
		DB.addConnection('default', config)
		console.log(`✅ [Atlas] Connection 'default' added (${connection})`)
	} catch (error) {
		console.error(`❌ [Atlas] Failed to add connection:`, error)
		throw error
	}
}

/**
 * 建立 Atlas DatabaseAccess 實例的工廠函數
 *
 * 這是接線層建立 Atlas 適配器的標準入口，用於依賴注入。
 *
 * @returns 實作 IDatabaseAccess 介面的實例
 *
 * @example
 * const db = createAtlasDatabaseAccess()
 */
export function createAtlasDatabaseAccess(): IDatabaseAccess {
	// 確保 Atlas 連接已初始化
	initializeAtlasConnection()
	return new AtlasDatabaseAccess()
}

/**
 * 建立 Atlas 資料庫連線檢查適配器
 *
 * 實作 IDatabaseConnectivityCheck 介面，透過 Atlas 執行底層 ping (SELECT 1)。
 *
 * @returns 實作連線檢查介面的物件
 */
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
	return {
		async ping(): Promise<boolean> {
			try {
				await getDB().raw('SELECT 1')
				return true
			} catch {
				return false
			}
		},
	}
}

