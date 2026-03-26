/**
 * @file AuditLogController.ts
 * @description AuditLog 模組 HTTP 控制器
 *
 * 端點：
 * - GET /audit-logs - 查詢審計日誌（支援 entityType、entityId、severity 過濾）
 *
 * Role: Presentation Layer - Controller
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { AuditEntry } from '../../Domain/Aggregates/AuditEntry'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { IAuditLogMessages } from '../Ports/IAuditLogMessages'
import { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'

const VALID_SEVERITIES = new Set(Object.values(AuditSeverity))

export class AuditLogController {
	constructor(
		private readonly repository: IAuditEntryRepository,
		private readonly messages: IAuditLogMessages
	) {}

	/**
	 * 查詢審計日誌（路由分派）
	 *
	 * GET /audit-logs?entityType=Order&entityId=xxx&severity=ERROR&from=...&to=...
	 */
	async queryAuditLogs(ctx: IHttpContext): Promise<Response> {
		try {
			const severity = ctx.query['severity'] as string | undefined
			const entityType = ctx.query['entityType'] as string | undefined
			const entityId = ctx.query['entityId'] as string | undefined
			const from = ctx.query['from'] as string | undefined
			const to = ctx.query['to'] as string | undefined

			if (severity) {
				return this.queryBySeverity(ctx, severity, from, to)
			}

			if (entityType && entityId) {
				return this.queryByEntity(ctx, entityType, entityId)
			}

			if (from && to) {
				return this.queryByDateRange(ctx, from, to)
			}

			return ctx.json(
				{ success: false, error: this.messages.missingQueryParams() },
				400
			)
		} catch {
			return ctx.json({ success: false, error: this.messages.queryFailed() }, 500)
		}
	}

	/**
	 * 依嚴重性查詢（可選時間範圍）
	 */
	private async queryBySeverity(
		ctx: IHttpContext,
		severity: string,
		from?: string,
		to?: string
	): Promise<Response> {
		if (!VALID_SEVERITIES.has(severity as AuditSeverity)) {
			return ctx.json(
				{ success: false, error: this.messages.invalidSeverity() },
				400
			)
		}

		const fromDate = from ? new Date(from) : undefined
		const toDate = to ? new Date(to) : undefined

		if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
			return ctx.json(
				{ success: false, error: this.messages.invalidDateRange() },
				400
			)
		}

		const entries = await this.repository.findBySeverity(
			severity as AuditSeverity,
			fromDate,
			toDate
		)

		return this.successResponse(ctx, entries)
	}

	/**
	 * 依實體類型與 ID 查詢
	 */
	private async queryByEntity(
		ctx: IHttpContext,
		entityType: string,
		entityId: string
	): Promise<Response> {
		const entries = await this.repository.findByEntityId(entityType, entityId)
		return this.successResponse(ctx, entries)
	}

	/**
	 * 依時間範圍匯出
	 */
	private async queryByDateRange(
		ctx: IHttpContext,
		from: string,
		to: string
	): Promise<Response> {
		const fromDate = new Date(from)
		const toDate = new Date(to)

		if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
			return ctx.json(
				{ success: false, error: this.messages.invalidDateRange() },
				400
			)
		}

		const entries = await this.repository.exportRange(fromDate, toDate)
		return this.successResponse(ctx, entries)
	}

	private successResponse(ctx: IHttpContext, entries: AuditEntry[]): Response {
		return ctx.json({
			success: true,
			data: entries.map((e) => e.toJSON()),
			meta: { total: entries.length },
		})
	}
}
