/**
 * PostController
 *
 * 設計原則：
 * - 依賴通過構造函數注入
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 不訪問任何容器或框架對象
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'

export class PostController {
	constructor(private repository: IPostRepository) {}

	async index(ctx: IHttpContext): Promise<Response> {
		try {
			const items = await this.repository.findAll()
			return ctx.json({
				success: true,
				data: items,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to list items',
				},
				500,
			)
		}
	}

	async show(ctx: IHttpContext): Promise<Response> {
		try {
			const id = ctx.params.id
			if (!id) {
				return ctx.json(
					{
						success: false,
						message: 'ID is required',
					},
					400,
				)
			}

			const item = await this.repository.findById(id)
			if (!item) {
				return ctx.json(
					{
						success: false,
						message: 'Item not found',
					},
					404,
				)
			}

			return ctx.json({
				success: true,
				data: item,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to get item',
				},
				500,
			)
		}
	}

	async store(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<any>()
			// TODO: 添加數據驗證和模型創建邏輯
			return ctx.json(
				{
					success: true,
					message: 'Item created successfully',
					data: body,
				},
				201,
			)
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to create item',
				},
				400,
			)
		}
	}
}
