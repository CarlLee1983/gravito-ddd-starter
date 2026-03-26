/**
 * @file AuditLogMessageService.ts
 * @description AuditLog 訊息服務實現
 *
 * Role: Infrastructure Layer - Service implementation
 */

import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { IAuditLogMessages } from '../../Presentation/Ports/IAuditLogMessages'

export class AuditLogMessageService implements IAuditLogMessages {
	constructor(private readonly translator: ITranslator) {}

	querySuccess(): string {
		return this.translator.trans('auditlog.query_success')
	}

	exportSuccess(): string {
		return this.translator.trans('auditlog.export_success')
	}

	missingQueryParams(): string {
		return this.translator.trans('auditlog.missing_query_params')
	}

	invalidDateRange(): string {
		return this.translator.trans('auditlog.invalid_date_range')
	}

	invalidSeverity(): string {
		return this.translator.trans('auditlog.invalid_severity')
	}

	queryFailed(): string {
		return this.translator.trans('auditlog.query_failed')
	}
}
