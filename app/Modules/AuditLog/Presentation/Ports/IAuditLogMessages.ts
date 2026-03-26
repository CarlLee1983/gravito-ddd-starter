/**
 * @file IAuditLogMessages.ts
 * @description AuditLog 模組訊息 Port (C4 層)
 *
 * 定義 AuditLog 模組所有 Controller 回應訊息的契約。
 *
 * Role: Presentation Layer - Port interface
 */

export interface IAuditLogMessages {
	/** 查詢成功訊息 */
	querySuccess(): string

	/** 匯出成功訊息 */
	exportSuccess(): string

	/** 缺少必要查詢參數 */
	missingQueryParams(): string

	/** 無效的日期範圍 */
	invalidDateRange(): string

	/** 無效的嚴重性 */
	invalidSeverity(): string

	/** 查詢失敗訊息 */
	queryFailed(): string
}
