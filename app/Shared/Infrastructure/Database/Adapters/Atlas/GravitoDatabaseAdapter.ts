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
		config.username = process.env.DB_USER || 'postgres'
		config.password = process.env.DB_PASSWORD || ''

		// PostgreSQL 連接池配置
		const poolConfig: Record<string, any> = {}
		if (process.env.DB_POOL_MIN) poolConfig.min = Number(process.env.DB_POOL_MIN)
		if (process.env.DB_POOL_MAX) poolConfig.max = Number(process.env.DB_POOL_MAX)
		if (process.env.DB_POOL_IDLE_TIMEOUT) poolConfig.idleTimeoutMillis = Number(process.env.DB_POOL_IDLE_TIMEOUT)
		if (process.env.DB_POOL_CONNECTION_TIMEOUT) poolConfig.connectionTimeoutMillis = Number(process.env.DB_POOL_CONNECTION_TIMEOUT)

		if (Object.keys(poolConfig).length > 0) {
			config.pool = poolConfig
		}
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
		config.username = process.env.DB_USER || 'root'
		config.password = process.env.DB_PASSWORD || ''
	}

	try {
		// 禁用 Bun.sql native driver，使用 PostgresDriver 作為替代
		// BunSQLDriver 不支持運行時動態 SQL
		config.useNativeDriver = false

		DB.addConnection('default', config)

		// 詳細的日誌輸出
		if (connection === 'postgres') {
			console.log(`✅ [Atlas] PostgreSQL 連接已配置`)
			console.log(`   Host: ${config.host}:${config.port}`)
			console.log(`   Database: ${config.database}`)
			console.log(`   User: ${config.username}`)
			if (Object.keys(config.pool || {}).length > 0) {
				console.log(`   Pool: ${JSON.stringify(config.pool)}`)
			}
		} else {
			console.log(`✅ [Atlas] Connection 'default' added (${connection}, native driver disabled)`)
		}
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
	// 先初始化連接
	initializeAtlasConnection()

	return {
		async ping(): Promise<boolean> {
			try {
				const DB = getDB()
				if (!DB) {
					logPingError('DB 實例未初始化')
					return false
				}

				const connection = process.env.DB_CONNECTION || 'sqlite'

				// 所有數據庫都支持 SELECT 1，這是最可靠的 ping 方式
				// 嘗試使用 raw 方法（如果可用）
				try {
					await DB.raw('SELECT 1')
					return true
				} catch {
					// 如果 raw 不可用，嘗試表查詢
					if (connection === 'postgres' || connection === 'mysql') {
						await DB.table('information_schema.schemata').limit(1).select()
					} else {
						await DB.table('sqlite_master').limit(1).select()
					}
					return true
				}
			} catch (error) {
				const connection = process.env.DB_CONNECTION || 'sqlite'
				if (connection === 'postgres') {
					logPostgresPingError(error)
				}
				return false
			}
		},
	}
}

/**
 * 記錄 PostgreSQL ping 失敗的詳細信息
 * @internal
 */
function logPostgresPingError(error: unknown): void {
	console.error(`\n❌ [Atlas] PostgreSQL 連接失敗`)
	console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
	console.error(`📍 連接配置：`)
	console.error(`   Host: ${process.env.DB_HOST || '127.0.0.1'}`)
	console.error(`   Port: ${process.env.DB_PORT || 5432}`)
	console.error(`   Database: ${process.env.DB_DATABASE || 'gravito_ddd'}`)
	console.error(`   User: ${process.env.DB_USER || 'postgres'}`)

	const errorMsg = error instanceof Error ? error.message : String(error)
	console.error(`\n❌ 錯誤原因：`)
	console.error(`   ${errorMsg}`)

	console.error(`\n💡 快速修復步驟：`)
	console.error(`   1. 檢查 PostgreSQL 是否運行：`)
	console.error(`      • macOS: brew services list | grep postgres`)
	console.error(`      • Linux: systemctl status postgresql`)
	console.error(`      • Docker: docker ps | grep postgres`)
	console.error(`\n   2. 檢查連接設定：`)
	console.error(`      • psql -h ${process.env.DB_HOST || '127.0.0.1'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_DATABASE || 'gravito_ddd'}`)
	console.error(`\n   3. 檢查監聽埠：`)
	console.error(`      • macOS/Linux: lsof -i :${process.env.DB_PORT || 5432}`)
	console.error(`\n   4. 使用 SQLite 進行開發（臨時方案）：`)
	console.error(`      • export DB_CONNECTION=sqlite`)
	console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

/**
 * 記錄通用 ping 失敗信息
 * @internal
 */
function logPingError(reason: string): void {
	console.warn(`⚠️ [Atlas] 連接檢查失敗: ${reason}`)
}

