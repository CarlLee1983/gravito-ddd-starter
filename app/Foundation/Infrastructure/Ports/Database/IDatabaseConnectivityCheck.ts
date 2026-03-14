/**
 * 資料庫連線檢查 Port
 *
 * @module IDatabaseConnectivityCheck
 * @description
 * 僅負責「能否連上資料庫」的檢查，與具體 ORM/驅動完全解耦。
 * 用於健康檢查、診斷等場景。
 *
 * **DDD 角色**
 * - 基礎建設：Infrastructure Port (Health Check)
 * - 職責：標準化資料庫健康狀態檢查介面。
 *
 * **使用位置**
 * - Application 層：Health Check Service 使用此介面檢查狀態。
 * - Infrastructure 層：ORM Adapter 實現此介面（如 Atlas Adapter）。
 *
 * @public - ORM 無關的公開介面。
 * @see docs/ABSTRACTION_RULES.md - 依賴抽象化規則
 */
export interface IDatabaseConnectivityCheck {
	/**
	 * 執行資料庫連線檢查
	 *
	 * 實現應該執行一個極簡的資料庫查詢（如 `SELECT 1`）來驗證連接。
	 *
	 * @returns {Promise<boolean>} `true` 表示連線正常，`false` 表示連線失敗
	 * @throws 不應該拋出異常，應該直接返回 false
	 */
	ping(): Promise<boolean>
}
