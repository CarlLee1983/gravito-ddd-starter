/**
 * @file ProductMessageService.ts
 * @description 產品訊息服務實現
 */

import type { IProductMessages } from '@/Modules/Product/Presentation/Ports/IProductMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class ProductMessageService implements IProductMessages {
	constructor(private translator: ITranslator) {}

	createSuccess(): string {
		return this.translator.trans('product.create_success')
	}
}
