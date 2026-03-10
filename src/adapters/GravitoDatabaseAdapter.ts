import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { DB } from '@gravito/atlas'

/**
 * 適配器：將 Gravito Atlas ORM 的 DB 適配為 IDatabaseAccess
 *
 * 集中 Atlas 與 IDatabaseAccess 的橋接，組裝層與各模組僅依賴介面。
 * 日後若更換 ORM，只需替換此工廠或新增其他實作的工廠。
 *
 * @returns IDatabaseAccess（底層為 Atlas DB.table() 鏈式 API）
 */
export function createGravitoDatabaseAccess(): IDatabaseAccess {
	return DB as unknown as IDatabaseAccess
}

/**
 * 適配器：以 Atlas 執行資料庫連線檢查（SELECT 1），實作 IDatabaseConnectivityCheck
 *
 * 供健康檢查等 Use Case 使用，Application 層不依賴 @gravito/atlas。
 */
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
	return {
		async ping(): Promise<boolean> {
			try {
				await DB.raw('SELECT 1')
				return true
			} catch {
				return false
			}
		},
	}
}
