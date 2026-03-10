/**
 * 資料庫連線檢查 Port
 *
 * 僅負責「能否連上資料庫」的檢查，與具體 ORM/驅動解耦。
 * Application 層透過此介面取得結果，由 Infrastructure/Adapter 注入實作。
 */

export interface IDatabaseConnectivityCheck {
	/**
	 * 執行連線檢查（例如 SELECT 1），回傳是否成功
	 */
	ping(): Promise<boolean>
}
