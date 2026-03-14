/**
 * @file PostMessageService.ts
 * @description 文章訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的文章訊息方法。
 */

import type { IPostMessages } from '@/Foundation/Infrastructure/Ports/Messages/IPostMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class PostMessageService implements IPostMessages {
	constructor(private translator: ITranslator) {}

	validationMissingFields(): string {
		return this.translator.trans('post.validation.missing_fields')
	}

	validationIdRequired(): string {
		return this.translator.trans('post.validation.id_required')
	}

	postNotFound(): string {
		return this.translator.trans('post.post.not_found')
	}

	postCreatedSuccessfully(): string {
		return this.translator.trans('post.post.created_successfully')
	}
}
