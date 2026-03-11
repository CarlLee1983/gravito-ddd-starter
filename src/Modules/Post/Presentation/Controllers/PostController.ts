/**
 * PostController
 *
 * 設計原則：
 * - 依賴通過構造函數注入
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 不訪問任何容器或框架對象
 *
 * ACL 應用範例：
 * - 依賴 IAuthorService Port（Post 定義）
 * - 不知道 User 模組的具體實現
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'
import type { IAuthorService } from '../../Application/Ports/IAuthorService'
import type { PostWithAuthorDTO } from '../../Application/DTOs/PostWithAuthorDTO'

export class PostController {
	constructor(private repository: IPostRepository, private authorService: IAuthorService) {}

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

			const post = await this.repository.findById(id)
			if (!post) {
				return ctx.json(
					{
						success: false,
						message: 'Item not found',
					},
					404,
				)
			}

			// 透過 ACL Port 查詢作者資訊（不直接依賴 User 模組）
			const author = await this.authorService.findAuthor(post.userId)

			// 組合 Post + Author 資訊並返回
			const postWithAuthor: PostWithAuthorDTO = {
				id: post.id,
				title: post.title,
				content: post.content,
				authorId: post.userId,
				createdAt: post.createdAt.toISOString(),
				author,
			}

			return ctx.json({
				success: true,
				data: postWithAuthor,
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
